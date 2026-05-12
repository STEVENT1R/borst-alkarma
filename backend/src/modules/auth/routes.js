const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const authMiddleware = require('../../middleware/auth');
const roleMiddleware = require('../../middleware/role');

// Rate limiting على محاولات تسجيل الدخول (حد أقصى 10 محاولات كل 15 دقيقة)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'محاولات تسجيل دخول كثيرة جداً. الرجاء الانتظار 15 دقيقة' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/create-user (المشرف فقط هو اللي يقدر يعمل حسابات)

router.post('/create-user', authMiddleware, roleMiddleware('supervisor'), async (req, res) => {
  try {
    const { username, password, account_type } = req.body;
    // Check if username exists
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }

    // Determine role & shop_name based on account_type
    const type = account_type === 'shop' ? 'shop' : 'personal';
    const userRole = type === 'shop' ? 'cashier' : 'worker';
    const shop_name = type === 'shop' ? username : null;

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      'INSERT INTO users (username, password_hash, role, account_type, shop_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, account_type, shop_name',
      [username, password_hash, userRole, type, shop_name]
    );
    const user = result.rows[0];

    // If shop account, create shop record
    if (type === 'shop') {
      await db.query(
        'INSERT INTO shops (user_id, shop_name) VALUES ($1, $2)',
        [user.id, shop_name]
      );
    }

    // Create notification for the user
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [user.id, type === 'shop' ? `تم إنشاء حساب المحل "${shop_name}" بنجاح` : 'تم إنشاء الحساب بنجاح. أهلاً بك في بورصة الكرمه']
    );

    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح', user });
  } catch (err) {
    console.error(err);
        res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {

  try {
    const { username, password } = req.body;

    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/auth/me (protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT id, username, role FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ' });
  }
});

// POST /api/auth/refresh - تجديد access token باستخدام refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'مطلوب refresh token' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'توكن غير صالح' });
    }

    // Verify user still exists
    const result = await db.query('SELECT id, username, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    const user = result.rows[0];
    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ accessToken });
  } catch (err) {
    console.error('Refresh token error:', err.message);
    res.status(401).json({ error: 'انتهت الجلسة، الرجاء تسجيل الدخول مجدداً' });
  }
});

// DELETE /api/auth/users/:id - حذف مستخدم (للمشرف فقط)
router.delete('/users/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // لا يمكن حذف حساب admin
    if (parseInt(id) === 0) {
      return res.status(400).json({ error: 'لا يمكن حذف حساب admin' });
    }
    // التحقق أن المستخدم مشرف
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'تم حذف الحساب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
