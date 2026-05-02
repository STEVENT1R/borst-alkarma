import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Users, DollarSign, FileText, TrendingUp, Trash2 } from 'lucide-react';
import PushNotification from '../../components/PushNotification';

const Settings = () => {
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

      <div className="space-y-3">
        <button onClick={() => navigate('/supervisor/manage-workers')} className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
          <div className="bg-blue-100 p-3 rounded-xl"><Users className="text-blue-600" size={22} /></div>
          <span className="font-bold text-gray-800">الإدارة</span>
        </button>
        <button onClick={() => navigate('/supervisor/manage-salaries')} className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
          <div className="bg-green-100 p-3 rounded-xl"><DollarSign className="text-green-600" size={22} /></div>
          <span className="font-bold text-gray-800">إدارة الرواتب</span>
        </button>
        <button onClick={() => navigate('/supervisor/receivers-log')} className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
          <div className="bg-blue-100 p-3 rounded-xl"><FileText className="text-blue-600" size={22} /></div>
          <span className="font-bold text-gray-800">سجل التعاملات</span>
        </button>
        <button onClick={() => navigate('/supervisor/profit-log')} className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
          <div className="bg-yellow-100 p-3 rounded-xl"><TrendingUp className="text-yellow-600" size={22} /></div>
          <span className="font-bold text-gray-800">سجل الربح</span>
        </button>
        <button onClick={() => navigate('/supervisor/auto-delete')} className="w-full flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
          <div className="bg-red-100 p-3 rounded-xl"><Trash2 className="text-red-600" size={22} /></div>
          <span className="font-bold text-gray-800">حذف تلقائي</span>
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full mt-6 bg-gradient-to-r from-red-500 to-red-400 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <LogOut size={18} /> تسجيل الخروج
      </button>
    </div>
  );
};

export default Settings;
