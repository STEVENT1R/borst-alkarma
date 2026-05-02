const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const db = require('../../config/db');

// POST /api/push/subscribe - اشتراك في الإشعارات
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    const { auth: authKey, p256dh } = keys;

    if (!endpoint || !authKey || !p256dh) {
      return res.status(400).json({ error: 'بيانات الاشتراك غير مكتملة' });
    }

    const subscription = JSON.stringify({ endpoint, keys: { auth: authKey, p256dh } });

    // حفظ أو تحديث الاشتراك
    await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, auth, p256dh, subscription)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id, endpoint) DO UPDATE
       SET auth = $3, p256dh = $4, subscription = $5::jsonb`,
      [req.user.id, endpoint, authKey, p256dh, subscription]
    );

    res.json({ message: 'تم الاشتراك في الإشعارات' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/push/unsubscribe - إلغاء الاشتراك
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    await db.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [req.user.id, endpoint]
    );
    res.json({ message: 'تم إلغاء الاشتراك' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/push/vapid-key - جلب المفتاح العام للـ VAPID
router.get('/vapid-key', auth, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

module.exports = router;
