const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/workers-load/:workerId - عرض حمولة العامل + عهدته المالية
router.get('/:workerId', auth, async (req, res) => {
  try {
    const { workerId } = req.params;

    // الحمولة (المنتجات)
    const loadResult = await db.query(
      `SELECT wl.*, COALESCE(i.purchase_price, 0) as purchase_price
       FROM worker_load wl
       LEFT JOIN inventory i ON i.product_name = wl.product_name
       WHERE wl.worker_id = $1 ORDER BY wl.product_name`,
      [workerId]
    );

    // العهدة المالية
    const cashResult = await db.query(
      `SELECT COALESCE(cash_balance, 0) as cash_balance FROM users WHERE id = $1`,
      [workerId]
    );

    // حساب إجمالي قيمة البضاعة (الكمية × سعر الشراء)
    let totalGoodsValue = 0;
    for (const item of loadResult.rows) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.purchase_price) || 0;
      totalGoodsValue += qty * price;
    }

    // سجل حركة العهدة
    const custodyLog = await db.query(
      `SELECT * FROM worker_cash_custody WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [workerId]
    );

    res.json({
      load: loadResult.rows,
      cash_balance: parseFloat(cashResult.rows[0]?.cash_balance || 0),
      total_goods_value: totalGoodsValue,
      custody_log: custodyLog.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/give-load - المشرف يدي العامل بضاعة (تتخصم من المخزون)
router.post('/:workerId/give-load', auth, role('supervisor'), async (req, res) => {
  try {
    const { workerId } = req.params;
    const { product_name, quantity } = req.body;

    if (!product_name || !quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المنتج والكمية' });
    }

    const qty = parseFloat(quantity);

    // 1. التحقق من المخزون
    const inventoryItem = await db.query(
      'SELECT * FROM inventory WHERE product_name = $1',
      [product_name]
    );
    if (inventoryItem.rows.length === 0) {
      return res.status(400).json({ error: `المنتج "${product_name}" غير موجود في المخزون` });
    }

    const availableQty = parseFloat(inventoryItem.rows[0].quantity) || 0;
    if (qty > availableQty) {
      return res.status(400).json({ error: `الكمية المطلوبة (${qty}) أكبر من المتاح في المخزون (${availableQty})` });
    }

    const unitType = inventoryItem.rows[0].unit_type || 'unit';

    // 2. تنفيذ المعاملة
    await db.query('BEGIN');

    try {
      // خصم من المخزون
      await db.query(
        'UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE product_name = $2',
        [qty, product_name]
      );

      // إضافة للحمولة (upsert)
      const existingLoad = await db.query(
        'SELECT * FROM worker_load WHERE worker_id = $1 AND product_name = $2',
        [workerId, product_name]
      );

      if (existingLoad.rows.length > 0) {
        await db.query(
          'UPDATE worker_load SET quantity = quantity + $1, updated_at = NOW() WHERE worker_id = $2 AND product_name = $3',
          [qty, workerId, product_name]
        );
      } else {
        await db.query(
          'INSERT INTO worker_load (worker_id, product_name, quantity, unit_type) VALUES ($1, $2, $3, $4)',
          [workerId, product_name, qty, unitType]
        );
      }

      // تسجيل حركة مخزون
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type)
         VALUES ($1, $2, $3, 'deduction')`,
        [product_name, req.user.id, -qty]
      );

      // إشعار العامل
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [workerId, `تم إضافة ${qty} ${unitType === 'weight' ? 'كجم' : 'قطعة'} من "${product_name}" لعهدتك`]
      );

      await db.query('COMMIT');

      // جلب الحمولة المحدثة
      const updatedLoad = await db.query(
        'SELECT * FROM worker_load WHERE worker_id = $1 ORDER BY product_name',
        [workerId]
      );

      res.json({
        message: `تم إضافة ${qty} ${unitType === 'weight' ? 'كجم' : 'قطعة'} من "${product_name}" لعهدة العامل`,
        load: updatedLoad.rows,
      });

    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/return-load - إرجاع بضاعة من العامل للمخزون
router.post('/:workerId/return-load', auth, role('supervisor'), async (req, res) => {
  try {
    const { workerId } = req.params;
    const { product_name, quantity } = req.body;

    if (!product_name || !quantity || parseFloat(quantity) <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المنتج والكمية' });
    }

    const qty = parseFloat(quantity);

    // التحقق من حمولة العامل
    const workerItem = await db.query(
      'SELECT * FROM worker_load WHERE worker_id = $1 AND product_name = $2',
      [workerId, product_name]
    );
    if (workerItem.rows.length === 0) {
      return res.status(400).json({ error: `المنتج "${product_name}" غير موجود في عهدة العامل` });
    }

    const workerQty = parseFloat(workerItem.rows[0].quantity) || 0;
    if (qty > workerQty) {
      return res.status(400).json({ error: `الكمية المطلوبة (${qty}) أكبر من الموجودة في عهدة العامل (${workerQty})` });
    }

    await db.query('BEGIN');

    try {
      // إرجاع للمخزون
      await db.query(
        'UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE product_name = $2',
        [qty, product_name]
      );

      // خصم من الحمولة
      if (qty >= workerQty) {
        // حذف السجل لو الكمية كلها رجعت
        await db.query(
          'DELETE FROM worker_load WHERE worker_id = $1 AND product_name = $2',
          [workerId, product_name]
        );
      } else {
        await db.query(
          'UPDATE worker_load SET quantity = quantity - $1, updated_at = NOW() WHERE worker_id = $2 AND product_name = $3',
          [qty, workerId, product_name]
        );
      }

      // تسجيل حركة مخزون (إضافة)
      await db.query(
        `INSERT INTO inventory_transactions (product_name, user_id, quantity_change, transaction_type)
         VALUES ($1, $2, $3, 'addition')`,
        [product_name, req.user.id, qty]
      );

      await db.query('COMMIT');

      const updatedLoad = await db.query(
        'SELECT * FROM worker_load WHERE worker_id = $1 ORDER BY product_name',
        [workerId]
      );

      res.json({
        message: `تم إرجاع ${qty} من "${product_name}" للمخزون`,
        load: updatedLoad.rows,
      });

    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/collect-cash - المشرف يستلم عهدة مالية من العامل
router.post('/:workerId/collect-cash', auth, role('supervisor'), async (req, res) => {
  try {
    const { workerId } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال المبلغ' });
    }

    const amt = parseFloat(amount);

    // التحقق من رصيد العامل
    const worker = await db.query('SELECT cash_balance FROM users WHERE id = $1', [workerId]);
    if (worker.rows.length === 0) {
      return res.status(400).json({ error: 'العامل غير موجود' });
    }

    const currentBalance = parseFloat(worker.rows[0].cash_balance) || 0;
    if (amt > currentBalance) {
      return res.status(400).json({
        error: `رصيد العامل الحالي (${currentBalance.toFixed(1)}) أقل من المبلغ المطلوب تحصيله (${amt.toFixed(1)})`
      });
    }

    await db.query('BEGIN');

    try {
      // خصم من رصيد العامل
      await db.query(
        'UPDATE users SET cash_balance = cash_balance - $1 WHERE id = $2',
        [amt, workerId]
      );

      // تسجيل حركة العهدة
      await db.query(
        `INSERT INTO worker_cash_custody (worker_id, amount, type, description)
         VALUES ($1, $2, 'sent_to_supervisor', $3)`,
        [workerId, amt, `المشرف استلم ${amt} جنيه من العهدة المالية`]
      );

      // إضافة للخزنة (إيراد من تحصيل عهدة)
      await db.query(
        `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
         VALUES ('revenue', $1, $2, 'worker_cash_custody', $3)`,
        [amt, `تحصيل عهدة مالية من العامل #${workerId}`, workerId]
      );

      // إشعار العامل
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [workerId, `تم استلام ${amt} جنيه من عهدتك المالية بواسطة المشرف`]
      );

      await db.query('COMMIT');

      res.json({
        message: `تم استلام ${amt} جنيه من العامل بنجاح`,
        new_balance: currentBalance - amt,
      });

    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/collect-tasks-cash - تحصيل فلوس المهام المكتملة للعامل
router.post('/:workerId/collect-tasks-cash', auth, role('supervisor'), async (req, res) => {
  try {
    const { workerId } = req.params;
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'يرجى إدخال المبلغ' });
    }

    const amt = parseFloat(amount);

    // التحقق من رصيد العامل
    const worker = await db.query('SELECT cash_balance FROM users WHERE id = $1', [workerId]);
    if (worker.rows.length === 0) {
      return res.status(400).json({ error: 'العامل غير موجود' });
    }

    const currentBalance = parseFloat(worker.rows[0].cash_balance) || 0;
    if (amt > currentBalance) {
      return res.status(400).json({
        error: `رصيد العامل الحالي (${currentBalance.toFixed(1)}) أقل من المبلغ (${amt.toFixed(1)})`
      });
    }

    await db.query('BEGIN');

    try {
      // خصم من العهدة
      await db.query(
        'UPDATE users SET cash_balance = cash_balance - $1 WHERE id = $2',
        [amt, workerId]
      );

      // تسجيل حركة
      await db.query(
        `INSERT INTO worker_cash_custody (worker_id, amount, type, description)
         VALUES ($1, $2, 'sent_to_supervisor', $3)`,
        [workerId, amt, `تحصيل ${amt} جنيه من فلوس المهام`]
      );

      await db.query('COMMIT');

      res.json({
        message: `تم تحصيل ${amt} جنيه من العامل`,
        new_balance: currentBalance - amt,
      });

    } catch (txErr) {
      await db.query('ROLLBACK');
      throw txErr;
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/cancel-day - إلغاء اليوم النشط
router.post('/:workerId/cancel-day', auth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const existing = await db.query(
      'SELECT * FROM worker_daily_log WHERE worker_id = $1 AND log_date = $2',
      [workerId, today]
    );
    if (existing.rows.length === 0 || existing.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'لا يوجد يوم نشط للإلغاء' });
    }

    await db.query(
      `UPDATE worker_daily_log SET status = 'cancelled', ended_at = NOW() WHERE worker_id = $1 AND log_date = $2`,
      [workerId, today]
    );

    res.json({ message: 'تم إلغاء اليوم بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/start-day - بدء يوم جديد
router.post('/:workerId/start-day', auth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // التحقق من وجود يوم نشط بالفعل
    const existing = await db.query(
      'SELECT * FROM worker_daily_log WHERE worker_id = $1 AND log_date = $2',
      [workerId, today]
    );
    if (existing.rows.length > 0 && existing.rows[0].status === 'active') {
      return res.status(400).json({ error: 'تم بدء اليوم بالفعل، قم بإنهاء اليوم الحالي أولاً' });
    }

    // أخذ لقطة للحمولة والرصيد الحالي
    const loadResult = await db.query(
      'SELECT * FROM worker_load WHERE worker_id = $1 ORDER BY product_name',
      [workerId]
    );
    const cashResult = await db.query(
      'SELECT COALESCE(cash_balance, 0) as cash_balance FROM users WHERE id = $1',
      [workerId]
    );
    const cashBalance = parseFloat(cashResult.rows[0]?.cash_balance || 0);

    const snapshot = {
      load: loadResult.rows.map(l => ({
        product_name: l.product_name,
        quantity: parseFloat(l.quantity),
        unit_type: l.unit_type
      })),
      cash_balance: cashBalance,
      taken_at: new Date().toISOString()
    };

    if (existing.rows.length > 0) {
      // تحديث السجل الموجود
      await db.query(
        'UPDATE worker_daily_log SET status = $1, started_at = NOW(), start_snapshot = $2 WHERE worker_id = $3 AND log_date = $4',
        ['active', JSON.stringify(snapshot), workerId, today]
      );
    } else {
      await db.query(
        'INSERT INTO worker_daily_log (worker_id, log_date, status, start_snapshot) VALUES ($1, $2, $3, $4)',
        [workerId, today, 'active', JSON.stringify(snapshot)]
      );
    }

    res.json({ message: 'تم بدء اليوم بنجاح', snapshot });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/workers-load/:workerId/end-day - إنهاء اليوم مع ملخص
router.post('/:workerId/end-day', auth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // التحقق من وجود يوم نشط
    const existing = await db.query(
      'SELECT * FROM worker_daily_log WHERE worker_id = $1 AND log_date = $2',
      [workerId, today]
    );
    if (existing.rows.length === 0 || existing.rows[0].status !== 'active') {
      return res.status(400).json({ error: 'لا يوجد يوم نشط لإنهائه، يرجى بدء اليوم أولاً' });
    }

    // جلب الحمولة والرصيد الحالي
    const loadResult = await db.query(
      'SELECT * FROM worker_load WHERE worker_id = $1 ORDER BY product_name',
      [workerId]
    );
    const cashResult = await db.query(
      'SELECT COALESCE(cash_balance, 0) as cash_balance FROM users WHERE id = $1',
      [workerId]
    );
    const cashBalance = parseFloat(cashResult.rows[0]?.cash_balance || 0);

    // حساب إجمالي الإيرادات من المهام المكتملة اليوم
    const revenueResult = await db.query(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total_revenue 
       FROM receiver_transactions rt
       JOIN tasks t ON t.id = rt.task_id
       WHERE t.worker_id = $1 AND rt.transaction_type = 'money_received'
       AND rt.created_at::date = $2`,
      [workerId, today]
    );
    const totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue || 0);

    // حساب أرباح اليوم
    const profitResult = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total_profit 
       FROM profit_log 
       WHERE reference_type = 'task' AND entry_type = 'profit'
       AND created_at::date = $1
       AND reference_id IN (SELECT id FROM tasks WHERE worker_id = $2)`,
      [today, workerId]
    );
    const totalProfit = parseFloat(profitResult.rows[0]?.total_profit || 0);

    // لقطة البداية
    const startSnapshot = existing.rows[0].start_snapshot;
    const startLoad = startSnapshot?.load || [];
    const startCash = parseFloat(startSnapshot?.cash_balance || 0);

    // إنشاء الملخص
    const summaryLines = [];
    summaryLines.push(`ملخص يوم ${new Date().toLocaleDateString('ar-EG')} للعامل #${workerId}`);
    summaryLines.push('');

    // مقارنة المنتجات
    summaryLines.push('--- المنتجات ---');
    for (const startItem of startLoad) {
      const endItem = loadResult.rows.find(l => l.product_name === startItem.product_name);
      const endQty = endItem ? parseFloat(endItem.quantity) : 0;
      const diff = endQty - startItem.quantity;
      const unitLabel = startItem.unit_type === 'weight' ? 'كجم' : 'قطعة';
      summaryLines.push(`  ${startItem.product_name}: بداية ${startItem.quantity} ${unitLabel} → نهاية ${endQty} ${unitLabel} (${diff >= 0 ? '+' : ''}${diff.toFixed(1)} ${unitLabel})`);
    }
    // المنتجات الجديدة اللي ظهرت في النهاية
    for (const endItem of loadResult.rows) {
      if (!startLoad.some(s => s.product_name === endItem.product_name)) {
        summaryLines.push(`  ${endItem.product_name}: جديد ${parseFloat(endItem.quantity)} ${endItem.unit_type === 'weight' ? 'كجم' : 'قطعة'}`);
      }
    }

    summaryLines.push('');
    summaryLines.push('--- المالية ---');
    summaryLines.push(`  رصيد بداية اليوم: ${startCash.toFixed(1)} ج.م`);
    summaryLines.push(`  رصيد نهاية اليوم: ${cashBalance.toFixed(1)} ج.م`);
    summaryLines.push(`  إجمالي الإيرادات المحصلة اليوم: ${totalRevenue.toFixed(1)} ج.م`);
    summaryLines.push(`  صافي الربح اليوم: ${totalProfit.toFixed(1)} ج.م`);

    const summary = summaryLines.join('\n');

    // لقطة النهاية
    const endSnapshot = {
      load: loadResult.rows.map(l => ({
        product_name: l.product_name,
        quantity: parseFloat(l.quantity),
        unit_type: l.unit_type
      })),
      cash_balance: cashBalance,
      total_revenue: totalRevenue,
      total_profit: totalProfit,
      taken_at: new Date().toISOString()
    };

    // تحديث السجل
    await db.query(
      `UPDATE worker_daily_log SET 
        status = 'ended', ended_at = NOW(), 
        end_snapshot = $1, summary = $2 
       WHERE worker_id = $3 AND log_date = $4`,
      [JSON.stringify(endSnapshot), summary, workerId, today]
    );

    res.json({

      message: 'تم إنهاء اليوم بنجاح',
      summary,
      end_snapshot: endSnapshot
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workers-load/:workerId/daily-log - عرض سجل تحركات العهد اليومية
router.get('/:workerId/daily-log', auth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const result = await db.query(
      'SELECT * FROM worker_daily_log WHERE worker_id = $1 ORDER BY log_date DESC LIMIT 30',
      [workerId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/workers-load/daily-logs/all - عرض كل سجلات تحركات العهد (للمشرف)
router.get('/daily-logs/all', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT d.*, u.username as worker_name 
       FROM worker_daily_log d
       JOIN users u ON u.id = d.worker_id
       ORDER BY d.log_date DESC, d.worker_id
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


