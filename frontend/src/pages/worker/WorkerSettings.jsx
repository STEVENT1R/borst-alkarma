import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import PushNotification from '../../components/PushNotification';

const WorkerSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">الإعدادات</h3>
      
      <div className="bg-white p-5 rounded-2xl shadow-sm border mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-full">
            <User size={28} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800">{user?.username}</p>
            <p className="text-sm text-gray-500">صاحب الحساب</p>
          </div>
        </div>
      </div>

      <PushNotification />

      <button
        onClick={handleLogout}
        className="w-full mt-6 bg-gradient-to-r from-red-500 to-red-400 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <LogOut size={18} /> تسجيل الخروج
      </button>
    </div>
  );
};

export default WorkerSettings;
