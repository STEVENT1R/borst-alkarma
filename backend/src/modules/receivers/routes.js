const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/receivers - كل المستلمين مع أرصدة المهام النشطة فقط
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT r.*,
        COALESCE((
          SELECT SUM(rt.amount) 
          FROM receiver_transactions rt
          WHERE rt.receiver_id = r.id
        ), 0) as balance
      FROM receivers r
      ORDER BY r.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/receivers - إضافة مستلم يدوي
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { name, phone, address, notes } = req.body;
    const exist = await db.query('SELECT id FROM receivers WHERE name = $1', [name]);
    if (exist.rows.length > 0) {
      return res.status(400).json({ error: 'المستلم موجود بالفعل' });
    }
    const result = await db.query(
      'INSERT INTO receivers (name, phone, address, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, phone || null, address || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/receivers/:id - تعديل بيانات مستلم
router.put('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, notes } = req.body;

    // لو الاسم اتغير، نتأكد انه مش مكرر
    if (name) {
      const exist = await db.query('SELECT id FROM receivers WHERE name = $1 AND id != $2', [name, id]);
      if (exist.rows.length > 0) {
        return res.status(400).json({ error: 'يوجد مستلم آخر بنفس الاسم' });
      }
    }

    const result = await db.query(
      `UPDATE receivers 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name || null, phone || null, address || null, notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'المستلم غير موجود' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/receivers/:id/transactions - سجل تعاملات مستلم معين
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT rt.*, t.title as task_title
      FROM receiver_transactions rt
      LEFT JOIN tasks t ON t.id = rt.task_id
      WHERE rt.receiver_id = $1
      ORDER BY rt.created_at DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/receivers/:id/transactions - إضافة معاملة يدوية (مديونية/استلام)
router.post('/:id/transactions', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { transaction_type, amount, description } = req.body;
    
    if (!['debt_added', 'money_collected', 'manual_addition', 'manual_deduction'].includes(transaction_type)) {
      return res.status(400).json({ error: 'نوع المعاملة غير صحيح' });
    }

    // تحويل المبلغ للإشارة الصحيحة حسب نوع المعاملة
    let signedAmount = Math.abs(parseFloat(amount));
    if (transaction_type === 'debt_added' || transaction_type === 'manual_addition') {
      // لينا فلوس (موجب)
      signedAmount = signedAmount;
    } else if (transaction_type === 'money_collected' || transaction_type === 'manual_deduction') {
      // علينا فلوس (سالب)
      signedAmount = -signedAmount;
    }

    const result = await db.query(
      `INSERT INTO receiver_transactions (receiver_id, transaction_type, amount, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, transaction_type, signedAmount, description || null]
    );

    // تسجيل في سجل الربح إذا كانت معاملة مالية
    if (transaction_type === 'money_collected') {
      await db.query(
        `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
         VALUES ('revenue', $1, $2, 'receiver', $3)`,
        [Math.abs(signedAmount), `تحصيل من مستلم: ${description || ''}`, id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/receivers/summary - ملخص المديونيات (من المهام النشطة فقط)
router.get('/summary', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN sub.net_balance > 0 THEN sub.net_balance ELSE 0 END), 0) as total_we_are_owed,
        COALESCE(SUM(CASE WHEN sub.net_balance < 0 THEN sub.net_balance ELSE 0 END), 0) as total_we_owe
      FROM (
        SELECT receiver_id, SUM(amount) as net_balance
        FROM receiver_transactions
        GROUP BY receiver_id
      ) sub
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// POST /api/receivers/:id/pay - استلام فلوس من مستلم (للعامل والمشرف)
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'المبلغ مطلوب' });
    }

    // استلام فلوس من المستلم - يخصم من مديونيته (سالب)
    const result = await db.query(
      `INSERT INTO receiver_transactions (receiver_id, transaction_type, amount, description)
       VALUES ($1, 'money_collected', $2, $3) RETURNING *`,
      [id, -Math.abs(parseFloat(amount)), description || `استلام فلوس من مستلم`]
    );

    // تسجيل في سجل الربح
    await db.query(
      `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
       VALUES ('revenue', $1, $2, 'receiver', $3)`,
      [Math.abs(parseFloat(amount)), `تحصيل من مستلم: ${description || ''}`, id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/receivers/:id/debt - إضافة مديونية لمستلم (للعامل والمشرف)
router.post('/:id/debt', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'المبلغ مطلوب' });
    }

    // إضافة مديونية - المستلم مديون لينا (موجب)
    const result = await db.query(
      `INSERT INTO receiver_transactions (receiver_id, transaction_type, amount, description)
       VALUES ($1, 'debt_added', $2, $3) RETURNING *`,
      [id, Math.abs(parseFloat(amount)), description || `إضافة مديونية لمستلم`]
    );

    // إشعار المشرفين
    const supers = await db.query("SELECT id FROM users WHERE role = 'supervisor'");
    for (const s of supers.rows) {
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
        [s.id, `تم إضافة ${amount} ج.م مديونية لمستلم`]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
