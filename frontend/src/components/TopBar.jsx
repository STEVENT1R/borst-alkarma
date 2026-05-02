import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const TopBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = () => {
    api.get('/notifications/unread-count')
      .then(res => setUnreadCount(res.data.count))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);

    const handleNotificationRead = () => fetchUnread();
    window.addEventListener('notification-read', handleNotificationRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notification-read', handleNotificationRead);
    };
  }, []);

  const goToNotifications = () => {
    const role = user?.role === 'cashier' ? 'cashier' : (user?.role === 'supervisor' ? 'supervisor' : 'worker');
    navigate(`/${role}/notifications`);
  };

  return (
    <header className="bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 shadow-lg flex justify-between items-center">
      <h1 className="text-lg font-bold tracking-wide">بورصة الكرمه</h1>
      <div className="flex items-center gap-4">
        {/* زر تغيير الثيم */}
        <button onClick={toggleTheme} className="focus:outline-none hover:opacity-80 transition-opacity" title={darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}>
          {darkMode ? <Sun size={22} /> : <Moon size={22} />}
        </button>
        <button onClick={goToNotifications} className="relative focus:outline-none">
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <span className="text-sm font-medium">اهلا يا {user?.username}</span>
      </div>
    </header>
  );
};

export default TopBar;
