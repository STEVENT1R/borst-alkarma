import { useState, useEffect } from 'react';
import api from '../../services/api';
import { UserPlus, Users, DollarSign, Trash2, Shield } from 'lucide-react';

const WorkerManagement = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState('personal');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [allUsers, setAllUsers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMessage, setPayMessage] = useState({ type: '', text: '' });
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => {
    fetchAllUsers();
    fetchWorkers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/users/all');
      setAllUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/users/workers');
      setWorkers(res.data);
    } catch (err) {
      console.error('Failed to fetch workers', err);
    }
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payAmount || !selectedWorker) return;
    try {
      await api.post('/salaries/pay', {
        worker_id: selectedWorker.id,
        amount: parseFloat(payAmount),
      });
      setPayMessage({ type: 'success', text: `تم إيداع ${payAmount} جنيه لـ ${selectedWorker.username}` });
      setPayAmount('');
      setShowPayModal(false);
      setSelectedWorker(null);
    } catch (err) {
      setPayMessage({ type: 'error', text: err.response?.data?.error || 'فشل في إيداع المرتب' });
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username || !password) return setMessage({ type: 'error', text: 'يرجى ملء الحقول' });
    try {
      await api.post('/auth/create-user', {
        username,
        password,
        account_type: accountType,
      });
      setMessage({ type: 'success', text: accountType === 'shop' ? `تم إنشاء حساب المحل "${username}" بنجاح` : `تم إنشاء حساب "${username}" بنجاح` });
      setUsername('');
      setPassword('');
      setAccountType('personal');
      fetchAllUsers();
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل في الإنشاء' });
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب "${userName}"؟`)) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      setMessage({ type: 'success', text: `تم حذف حساب "${userName}" بنجاح` });
      fetchAllUsers();
      fetchWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل في الحذف' });
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">الإدارة</h3>

      {/* إنشاء حساب جديد - للمشرف فقط */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-green-600" />
          <span className="font-bold">إنشاء حساب جديد</span>
        </div>
        {message.text && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              placeholder="اسم المستخدم"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              placeholder="كلمة المرور"
              required
            />
            <p className="text-xs text-gray-400 mt-1">سيتمكن من تسجيل الدخول باستخدام هذه البيانات</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الحساب</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAccountType('personal')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-colors ${
                  accountType === 'personal'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                👤 حساب شخصي (عامل)
              </button>
              <button
                type="button"
                onClick={() => setAccountType('shop')}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-colors ${
                  accountType === 'shop'
                    ? 'bg-green-50 border-green-500 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                🏪 حساب محل (كاشير)
              </button>
            </div>
            {accountType === 'shop' && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">
                سيتم إنشاء حساب كاشير للمحل. اسم المحل = اسم المستخدم.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <UserPlus size={18} /> إنشاء الحساب
          </button>
        </form>
      </div>

      {/* قائمة المستخدمين مع إيداع المرتب */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={20} className="text-green-600" />
          <span className="font-bold">إيداع المرتب</span>
        </div>
        {payMessage.text && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${payMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {payMessage.text}
          </div>
        )}
        <div className="space-y-3">
          {workers.map(worker => (
            <div key={worker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <span className="font-medium">{worker.username}</span>
                <span className="text-xs text-gray-400 mr-2">
                  ({worker.account_type === 'shop' ? '🏪 محل' : '👤 شخصي'})
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedWorker(worker); setShowPayModal(true); }}
                  className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1"
                >
                  <DollarSign size={16} /> إيداع مرتب
                </button>
              </div>
            </div>
          ))}
          {workers.length === 0 && (
            <p className="text-gray-400 text-center py-4">لا يوجد حسابات مسجلة</p>
          )}
        </div>
      </div>

      {/* قائمة جميع المستخدمين - حذف الحسابات */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={20} className="text-red-600" />
          <span className="font-bold">إدارة الحسابات (حذف)</span>
        </div>
        <div className="space-y-3">
          {allUsers.filter(u => u.username !== 'admin').map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <span className="font-medium">{user.username}</span>
                <span className="text-xs text-gray-400 mr-2">
                  ({user.account_type === 'shop' ? '🏪 محل' : user.role === 'cashier' ? '💳 كاشير' : '👤 شخصي'})
                </span>
              </div>
              <button
                onClick={() => handleDelete(user.id, user.username)}
                className="bg-red-500 text-white px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1"
              >
                <Trash2 size={16} /> حذف
              </button>
            </div>
          ))}
          {allUsers.filter(u => u.username !== 'admin').length === 0 && (
            <p className="text-gray-400 text-center py-4">لا يوجد حسابات مسجلة</p>
          )}
        </div>
      </div>

      {/* مودال إيداع المرتب */}
      {showPayModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h4 className="font-bold text-lg mb-4">إيداع مرتب لـ {selectedWorker.username}</h4>
            <form onSubmit={handlePaySalary} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="أدخل المبلغ"
                  required
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold"
                >
                  تأكيد الإيداع
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPayModal(false); setSelectedWorker(null); setPayAmount(''); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManagement;
