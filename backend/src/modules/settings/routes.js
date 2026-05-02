const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/settings - جلب الإعدادات
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM app_settings');
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings - تحديث إعداد
router.put('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key and value are required' });
    }
    await db.query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, String(value)]
    );
    res.json({ message: 'تم حفظ الإعداد', key, value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/settings/cleanup - تشغيل التصفية يدوياً
router.post('/cleanup', auth, role('supervisor'), async (req, res) => {
  try {
    // جلب فترة التصفية من الإعدادات (افتراضي 6 شهور)
    const settingResult = await db.query("SELECT value FROM app_settings WHERE key = 'cleanup_months'");
    let months = 6; // default
    if (settingResult.rows.length > 0) {
      months = parseInt(settingResult.rows[0].value) || 6;
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const deleted = {};

    // 1. حذف المهام القديمة المكتملة/المنتهية
    const tasksResult = await db.query(
      `DELETE FROM tasks WHERE completed_at IS NOT NULL AND completed_at < $1
       AND status IN ('completed', 'cancelled', 'delivered', 'loaded', 'delivered_and_loaded', 'money_delivery')
       RETURNING id`,
      [cutoff]
    );
    deleted.tasks = tasksResult.rows.length;

    // 2. حذف سجل حركات المخزون القديمة (المرتبطة بمهام محذوفة وغير مرتبطة بمخزون حال)
    const invTransResult = await db.query(
      `DELETE FROM inventory_transactions WHERE created_at < $1 AND task_id IS NOT NULL RETURNING id`,
      [cutoff]
    );
    deleted.inventory_transactions = invTransResult.rows.length;

    // 3. حذف سجل الأرباح القديم (المرتبط بمهام محذوفة)
    const profitResult = await db.query(
      `DELETE FROM profit_log WHERE created_at < $1 AND reference_type = 'task' RETURNING id`,
      [cutoff]
    );
    deleted.profit_log = profitResult.rows.length;

    // 4. حذف معاملات المستلمين القديمة (المرتبطة بمهام محذوفة)
    const recTransResult = await db.query(
      `DELETE FROM receiver_transactions WHERE created_at < $1 AND task_id IS NOT NULL RETURNING id`,
      [cutoff]
    );
    deleted.receiver_transactions = recTransResult.rows.length;

    // 5. حذف الإشعارات القديمة
    const notifResult = await db.query(
      `DELETE FROM notifications WHERE created_at < $1 RETURNING id`,
      [cutoff]
    );
    deleted.notifications = notifResult.rows.length;

    // 6. حذف سجل الأداء القديم
    const perfResult = await db.query(
      `DELETE FROM performance_log WHERE record_date < $1 RETURNING id`,
      [cutoff]
    );
    deleted.performance_log = perfResult.rows.length;

    // ملاحظة: الحسابات (users) والمخزون الحالي والمستلمين والموردين لا يتم حذفهم

    res.json({
      message: `تم تصفية البيانات الأقدم من ${months} شهر`,
      cutoff: cutoff.toISOString(),
      months,
      deleted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
