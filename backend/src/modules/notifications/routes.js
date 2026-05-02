const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const db = require('../../config/db');

// GET /api/notifications
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'تم القراءة' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*)::int FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;