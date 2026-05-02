const webpush = require('web-push');
const db = require('../config/db');

// إعداد VAPID keys
webpush.setVapidDetails(
  'mailto:admin@borstalkarma.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// إرسال إشعار push لمستخدم معين
const sendPushNotification = async (userId, title, body) => {
  try {
    // جلب كل الاشتراكات الخاصة بالمستخدم
    const subscriptions = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    for (const row of subscriptions.rows) {
      try {
        const subscription = typeof row.subscription === 'string' 
          ? JSON.parse(row.subscription) 
          : row.subscription;
        
        await webpush.sendNotification(subscription, JSON.stringify({
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        }));
      } catch (err) {
        // لو الاشتراك قديم أو ملغي، نشيله من الداتا بيز
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 AND subscription::text = $2',
            [userId, JSON.stringify(row.subscription)]
          );
        }
      }
    }
  } catch (err) {
    console.error('Error sending push notification:', err.message);
  }
};

// إرسال إشعار لجميع المشرفين
const notifyAllSupervisors = async (title, body) => {
  try {
    const supervisors = await db.query("SELECT id FROM users WHERE role = 'supervisor'");
    for (const s of supervisors.rows) {
      await sendPushNotification(s.id, title, body);
    }
  } catch (err) {
    console.error('Error notifying supervisors:', err.message);
  }
};

module.exports = { sendPushNotification, notifyAllSupervisors };
