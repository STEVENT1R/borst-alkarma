const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/shops - كل المحلات (للمشرف فقط)
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.*,
        u.username,
        u.account_type,
        COALESCE(
          (SELECT SUM(pl.amount) FROM profit_log pl 
           WHERE pl.shop_id = s.id AND pl.entry_type = 'sale_revenue'), 0
        ) as total_revenue,
        COALESCE(
          (SELECT SUM(pl.amount) FROM profit_log pl 
           WHERE pl.shop_id = s.id AND pl.entry_type IN ('sale_revenue','cogs','purchase'))
           , 0
        ) as net_profit,
        COALESCE(
          (SELECT COUNT(*) FROM sales sa WHERE sa.shop_id = s.id), 0
        ) as sales_count
      FROM shops s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shops/:id - تفاصيل محل واحد
router.get('/:id', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        s.*,
        u.username,
        COALESCE(
          (SELECT SUM(pl.amount) FROM profit_log pl 
           WHERE pl.shop_id = s.id AND pl.entry_type = 'sale_revenue'), 0
        ) as total_revenue,
        COALESCE(
          (SELECT SUM(pl.amount) FROM profit_log pl 
           WHERE pl.shop_id = s.id AND pl.entry_type IN ('sale_revenue','cogs','purchase'))
           , 0
        ) as net_profit,
        COALESCE(
          (SELECT COUNT(*) FROM sales sa WHERE sa.shop_id = s.id), 0
        ) as sales_count
      FROM shops s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'المحل غير موجود' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shops/:id/inventory - مخزن محل معين (للمشرف)
router.get('/:id/inventory', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM inventory WHERE shop_id = $1 ORDER BY product_name',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shops/:id/sales - مبيعات محل معين (للمشرف)
router.get('/:id/sales', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT s.*, u.username 
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.shop_id = $1
      ORDER BY s.created_at DESC
      LIMIT 200
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/shops/:id/inventory-transactions - حركات مخزن محل (للمشرف)
router.get('/:id/inventory-transactions', auth, role('supervisor'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT it.*, u.username 
      FROM inventory_transactions it
      LEFT JOIN users u ON it.user_id = u.id
      WHERE it.shop_id = $1
      ORDER BY it.created_at DESC
      LIMIT 100
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;