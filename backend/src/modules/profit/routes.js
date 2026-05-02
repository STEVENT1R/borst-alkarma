const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/profit - سجل الربح كامل
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM profit_log
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profit/summary - ملخص الربح والسيولة
router.get('/summary', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('revenue', 'sale_revenue') THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN entry_type = 'salary_payment' THEN amount ELSE 0 END), 0) as total_salaries,
        COALESCE(SUM(CASE WHEN entry_type = 'spoilage' THEN amount ELSE 0 END), 0) as total_spoilage,
        COALESCE(SUM(CASE WHEN entry_type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN entry_type = 'purchase' THEN amount ELSE 0 END), 0) as total_purchases,
        -- صافي الربح = الإيرادات - تكلفة البضاعة المباعة فقط (بدون هالك)
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('cogs') THEN -amount
            ELSE 0
          END
        ), 0) as total_profit,
        -- السيولة = كل الداخل - كل الخارج النقدي (المشتريات خروج نقدي، cogs مش خروج نقدي)
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN -amount
            ELSE 0
          END
        ), 0) as current_liquidity
      FROM profit_log
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profit - إضافة بند جديد
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { entry_type, amount, description } = req.body;
    if (!entry_type || amount === undefined) {
      return res.status(400).json({ error: 'entry_type and amount are required' });
    }
    const result = await db.query(
      `INSERT INTO profit_log (entry_type, amount, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [entry_type, parseFloat(amount), description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/profit/:id - حذف بند (للبنود اليدوية فقط)
router.delete('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;

    // جلب البند للتحقق من نوعه
    const item = await db.query('SELECT * FROM profit_log WHERE id = $1', [id]);
    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'البند غير موجود' });
    }

    const entry = item.rows[0];

    // منع حذف البنود المرتبطة بعمليات أخرى (مهام، مشتريات، مرتبات...)
    if (entry.reference_type && entry.reference_id) {
      return res.status(400).json({ 
        error: 'لا يمكن حذف هذا البند مباشرة لأنه مرتبط بعملية أخرى. يجب حذف العملية الأصلية أولاً.' 
      });
    }

    // لو البند يدوي (بدون reference)، نسمح بحذفه
    await db.query('DELETE FROM profit_log WHERE id = $1', [id]);
    res.json({ message: 'تم حذف البند بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/profit/expense - إضافة مصروف (ناقص)
router.post('/expense', auth, role('supervisor'), async (req, res) => {
  try {
    const { title, amount, description } = req.body;
    
    // تسجيل في جدول المصروفات
    const expense = await db.query(
      'INSERT INTO expenses (title, amount, description) VALUES ($1, $2, $3) RETURNING *',
      [title, amount, description || null]
    );

    // تسجيل في سجل الربح
    await db.query(
      `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
       VALUES ('expense', $1, $2, 'expense', $3)`,
      [amount, `مصروف: ${title}`, expense.rows[0].id]
    );

    res.status(201).json(expense.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/profit/expenses - كل المصروفات
router.get('/expenses', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM expenses ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;