const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');
const db = require('../../config/db');

router.get('/workers', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query("SELECT id, username FROM users WHERE role = 'worker'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/all - جلب كل المستخدمين (للمشرف)
router.get('/all', auth, role('supervisor'), async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, role FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
