import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Users, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import api from '../../services/api';
import PushNotification from '../../components/PushNotification';

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleClearAllData = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    
    if (!window.confirm('⚠️ تأكيد نهائي: هل أنت متأكد تماماً من حذف كل البيانات؟ هذه العملية لا يمكن التراجع عنها!\n\nسيتم الاحتفاظ بجميع الحسابات المسجلة فقط.')) return;
    
    setDeleting(true);
    setDeleteResult(null);
    try {
      const res = await api.post('/settings/clear-all-data', { confirm: 'YES' });
      setDeleteResult({ type: 'success', text: res.data.message, deleted: res.data.deleted });
      setDeleteConfirm(false);
    } catch (err) {
      setDeleteResult({ type: 'error', text: err.response?.data?.error || 'فشلت عملية الحذف' });
    } finally {
      setDeleting(false);
    }
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
      </div>

      {/* حذف كل البيانات يدوي */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100 mt-6 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-red-600" />
          <h4 className="font-bold text-gray-800">حذف البيانات</h4>
        </div>
        <p className="text-xs text-gray-500">
          مسح كل البيانات (المهام، الأرباح، المخزون، المشتريات، المستلمين، الرواتب...) مع الاحتفاظ بجميع الحسابات المسجلة.
        </p>

        {deleteResult && (
          <div className={`p-3 rounded-xl text-sm ${deleteResult.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
            <p className="font-bold mb-1">{deleteResult.text}</p>
            {deleteResult.deleted && (
              <div className="grid grid-cols-2 gap-1 text-xs mt-2">
                {Object.entries(deleteResult.deleted).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key}</span>
                    <span className="font-bold">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleClearAllData}
          disabled={deleting}
          className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-red-700 hover:to-red-600 transition-colors disabled:opacity-50"
        >
          <Trash2 size={18} />
          {deleting ? 'جاري الحذف...' : deleteConfirm ? 'اضغط مرة أخرى للتأكيد' : 'حذف جميع البيانات'}
        </button>
      </div>

      <button
        onClick={handleLogout}
        className="w-full mt-4 bg-gradient-to-r from-red-500 to-red-400 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
      >
        <LogOut size={18} /> تسجيل الخروج
      </button>
    </div>
  );
};

export default Settings;
