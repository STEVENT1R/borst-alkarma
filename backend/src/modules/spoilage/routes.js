const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/spoilage - كل الهالك
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM spoilage ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/spoilage - إضافة هالك
router.post('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { product_name, quantity, unit_type, cost, description } = req.body;
    
    const result = await db.query(
      'INSERT INTO spoilage (product_name, quantity, unit_type, cost, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [product_name, quantity, unit_type || 'unit', cost, description || null]
    );

    // تقليل المخزون
    await db.query(
      'UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE product_name = $2',
      [quantity, product_name]
    );

    // تسجيل حركة مخزون
    await db.query(
      `INSERT INTO inventory_transactions (product_name, quantity_change, transaction_type)
       VALUES ($1, $2, 'deduction')`,
      [product_name, -quantity]
    );

    // تسجيل في سجل الربح كخسارة
    await db.query(
      `INSERT INTO profit_log (entry_type, amount, description, reference_type, reference_id)
       VALUES ('spoilage', $1, $2, 'spoilage', $3)`,
      [cost, `هالك: ${product_name} - ${quantity} ${unit_type === 'weight' ? 'كجم' : 'قطعة'}`, result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
