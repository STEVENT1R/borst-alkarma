const db = require('../config/db');
const { sendPushNotification } = require('./pushNotification');

/**
 * إنشاء إشعار في الداتا بيز + إرسال Push Notification
 * @param {number} userId - آيدي المستخدم
 * @param {string} message - نص الإشعار
 */
const createNotification = async (userId, message) => {
  try {
    // حفظ في الداتا بيز
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [userId, message]
    );

    // إرسال Push Notification (على mobile)
    await sendPushNotification(userId, 'بورصة الكرمه', message);
  } catch (err) {
    console.error('Error creating notification:', err.message);
  }
};

module.exports = createNotification;
