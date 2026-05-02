const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

// GET /api/cashflow - سجل حركة الخزنة
router.get('/', auth, role('supervisor'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT entry_type, amount, description, created_at,
        CASE 
          WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
          WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN -amount
          ELSE 0
        END as signed_amount
      FROM profit_log
    `;
    const params = [];
    
    if (start_date && end_date) {
      query += ' WHERE created_at::date >= $1 AND created_at::date <= $2';
      params.push(start_date, end_date);
    } else if (start_date) {
      query += ' WHERE created_at::date >= $1';
      params.push(start_date);
    } else if (end_date) {
      query += ' WHERE created_at::date <= $1';
      params.push(end_date);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 500';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cashflow/balance - الرصيد الحالي في الخزنة
router.get('/balance', auth, role('supervisor'), async (req, res) => {
  try {
    const { date } = req.query;
    let query = `
      SELECT
        COALESCE(SUM(CASE WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN amount ELSE 0 END), 0) as total_out,
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN -amount
            ELSE 0
          END
        ), 0) as balance
      FROM profit_log
    `;
    
    if (date) {
      query += ' WHERE created_at::date <= $1';
      const result = await db.query(query, [date]);
      res.json(result.rows[0]);
    } else {
      const result = await db.query(query);
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/cashflow/daily-summary - ملخص يومي
router.get('/daily-summary', auth, role('supervisor'), async (req, res) => {
  try {
    const { days } = req.query;
    const limit = parseInt(days) || 30;
    
    const result = await db.query(`
      SELECT
        created_at::date as date,
        COALESCE(SUM(CASE WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN amount ELSE 0 END), 0) as expenses,
        COALESCE(SUM(
          CASE 
            WHEN entry_type IN ('revenue', 'profit', 'sale_revenue') THEN amount
            WHEN entry_type IN ('salary_payment', 'spoilage', 'expense', 'purchase') THEN -amount
            ELSE 0
          END
        ), 0) as net
      FROM profit_log
      WHERE created_at >= CURRENT_DATE - $1::integer
      GROUP BY created_at::date
      ORDER BY created_at::date ASC
    `, [limit]);
    
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
