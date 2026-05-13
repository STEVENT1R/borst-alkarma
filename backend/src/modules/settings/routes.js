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
       AND status IN ('completed', 'cancelled', 'delivered', 'loaded', 'delivered_and_loaded')
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

// POST /api/settings/clear-all-data - مسح كل البيانات مع احتفاظ الحسابات
router.post('/clear-all-data', auth, role('supervisor'), async (req, res) => {
  try {
    if (!req.body.confirm || req.body.confirm !== 'YES') {
      return res.status(400).json({ error: 'يجب تأكيد عملية الحذف' });
    }

    console.log('🗑️ جاري مسح جميع البيانات مع الاحتفاظ بالحسابات...');

    const deleted = {};

    // مسح البيانات بالترتيب الصحيح (تبعاً للـ foreign keys)
    const perf = await db.query('DELETE FROM performance_log');
    deleted.performance_log = perf.rowCount;

    const profit = await db.query('DELETE FROM profit_log');
    deleted.profit_log = profit.rowCount;

    const invTrans = await db.query('DELETE FROM inventory_transactions');
    deleted.inventory_transactions = invTrans.rowCount;

    const recTrans = await db.query('DELETE FROM receiver_transactions');
    deleted.receiver_transactions = recTrans.rowCount;

    const purchaseItems = await db.query('DELETE FROM purchase_items');
    deleted.purchase_items = purchaseItems.rowCount;

    const purchases = await db.query('DELETE FROM purchases');
    deleted.purchases = purchases.rowCount;

    const spoilage = await db.query('DELETE FROM spoilage');
    deleted.spoilage = spoilage.rowCount;

    const salaryPay = await db.query('DELETE FROM salary_payments');
    deleted.salary_payments = salaryPay.rowCount;

    const salaries = await db.query('DELETE FROM salaries');
    deleted.salaries = salaries.rowCount;

    const notifs = await db.query('DELETE FROM notifications');
    deleted.notifications = notifs.rowCount;

    const tasks = await db.query('DELETE FROM tasks');
    deleted.tasks = tasks.rowCount;

    const inv = await db.query('DELETE FROM inventory');
    deleted.inventory = inv.rowCount;

    const expenses = await db.query('DELETE FROM expenses');
    deleted.expenses = expenses.rowCount;

    const receivers = await db.query('DELETE FROM receivers');
    deleted.receivers = receivers.rowCount;

    const pushSubs = await db.query('DELETE FROM push_subscriptions');
    deleted.push_subscriptions = pushSubs.rowCount;

    const shops = await db.query('DELETE FROM shops');
    deleted.shops = shops.rowCount;

    const sales = await db.query('DELETE FROM sales');
    deleted.sales = sales.rowCount;

    // جداول العهد والحمولات
    const workerLoad = await db.query('DELETE FROM worker_load');
    deleted.worker_load = workerLoad.rowCount;
    const workerCashCustody = await db.query('DELETE FROM worker_cash_custody');
    deleted.worker_cash_custody = workerCashCustody.rowCount;
    const workerDailyLog = await db.query('DELETE FROM worker_daily_log');
    deleted.worker_daily_log = workerDailyLog.rowCount;

    // تصفير الرصيد النقدي والعهدة لجميع المستخدمين (بيانات العهدة)
    const resetBalance = await db.query('UPDATE users SET cash_balance = 0');
    deleted.users_reset_cash_balance = resetBalance.rowCount;

    // الحسابات (users) لم يتم حذفها - تم الاحتفاظ بها بالكامل

    console.log('✅ تم مسح جميع البيانات بنجاح مع الاحتفاظ بالحسابات');

    res.json({
      message: 'تم مسح جميع البيانات بنجاح مع الاحتفاظ بجميع الحسابات المسجلة',
      deleted
    });
  } catch (err) {
    console.error('❌ خطأ أثناء مسح البيانات:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء مسح البيانات' });
  }
});

module.exports = router;
