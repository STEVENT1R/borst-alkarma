const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// Supervisor sets salary for a worker
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { worker_id, base_salary, deduction, bonus } = req.body;
    const result = await db.query(
      'INSERT INTO salaries (worker_id, base_salary, deduction, bonus) VALUES ($1, $2, $3, $4) RETURNING *',
      [worker_id, base_salary, deduction, bonus]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/salaries/pay - إيداع المرتب
router.post('/pay', auth, role('supervisor'), async (req, res) => {
  try {
    const { worker_id, amount, deduction_amount, deduction_reason, bonus_amount, bonus_reason } = req.body;

    // إضافة الأعمدة الجديدة لو مش موجودة (تحديث آمن)
    await db.query(`ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS deduction_amount DECIMAL(10,2) DEFAULT 0`).catch(() => {});
    await db.query(`ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS deduction_reason TEXT`).catch(() => {});
    await db.query(`ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0`).catch(() => {});
    await db.query(`ALTER TABLE salary_payments ADD COLUMN IF NOT EXISTS bonus_reason TEXT`).catch(() => {});

    const result = await db.query(
      `INSERT INTO salary_payments (worker_id, amount, deduction_amount, deduction_reason, bonus_amount, bonus_reason) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [worker_id, amount, parseFloat(deduction_amount || 0) || 0, deduction_reason || null, parseFloat(bonus_amount || 0) || 0, bonus_reason || null]
    );

    // تسجيل في سجل الربح كمصروف
    await db.query(
      `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
       VALUES ('salary_payment', $1, $2, 'salary_payment', $3)`,
      [amount, `مرتب مدفوع`, result.rows[0].id]
    );

    // إشعار للعامل
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [worker_id, `تم إيداع مرتبك بمبلغ ${amount} ج.م`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/salaries/worker - مرتب العامل الحالي
router.get('/worker', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM salaries WHERE worker_id = $1 ORDER BY date DESC LIMIT 1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ base_salary: 0, deduction: 0, bonus: 0, net_salary: 0 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/salaries/payments - سجل إيداعات المرتبات
router.get('/payments', auth, async (req, res) => {
  try {
    let query;
    let params;
    if (req.user.role === 'supervisor') {
      query = `
        SELECT sp.*, u.username as worker_name
        FROM salary_payments sp
        LEFT JOIN users u ON sp.worker_id = u.id
        ORDER BY sp.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT sp.*, u.username as worker_name
        FROM salary_payments sp
        LEFT JOIN users u ON sp.worker_id = u.id
        WHERE sp.worker_id = $1
        ORDER BY sp.created_at DESC
      `;
      params = [req.user.id];
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/salaries/summary – أحدث مرتب لكل عامل
router.get('/summary', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id as worker_id, u.username, 
             s.base_salary, s.deduction, s.bonus, s.net_salary, s.date,
             (SELECT COALESCE(SUM(amount), 0) FROM salary_payments WHERE worker_id = u.id) as total_paid
      FROM users u
      LEFT JOIN LATERAL (
        SELECT * FROM salaries 
        WHERE worker_id = u.id 
        ORDER BY date DESC LIMIT 1
      ) s ON true
      WHERE u.role = 'worker'
      ORDER BY u.username
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/salaries/:id - مرتب عامل معين
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'supervisor' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const result = await db.query(
      'SELECT * FROM salaries WHERE worker_id = $1 ORDER BY date DESC LIMIT 1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No salary found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
