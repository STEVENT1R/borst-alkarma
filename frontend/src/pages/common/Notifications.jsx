import { useState, useEffect } from 'react';
import api from '../../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAsRead = async (id) => {
    // تحديث فوري للـ state
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    try {
      await api.patch(`/notifications/${id}/read`);
      // إرسال حدث لتحديث العداد في الـ Topbar فوراً
      window.dispatchEvent(new Event('notification-read'));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center text-gray-500 mt-8">جاري التحميل...</div>;
  if (notifications.length === 0) return <div className="text-center text-gray-500 mt-8">لا توجد إشعارات</div>;

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">الإشعارات</h3>
      <div className="space-y-3">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`p-4 rounded-xl shadow-sm border-l-4 transition-all ${
              notif.is_read
                ? 'bg-white border-gray-200'
                : 'bg-gradient-to-r from-green-50 to-green-100 border-green-500'
            }`}
          >
            <p className="text-sm">{notif.message}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">
                {new Date(notif.created_at).toLocaleString('ar-EG')}
              </span>
              {!notif.is_read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="text-xs font-semibold text-green-600 hover:text-green-800"
                >
                  تعليم كمقروء
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;