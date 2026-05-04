import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Search, Plus, Minus, ArrowLeft, DollarSign, Package, CreditCard, HandCoins, BadgeDollarSign, Pencil, Calendar } from 'lucide-react';

const ReceiversLog = () => {
  const { user } = useAuth();
  const [receivers, setReceivers] = useState([]);
  const [selectedReceiver, setSelectedReceiver] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReceiver, setEditReceiver] = useState({ name: '', phone: '', address: '', notes: '' });
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [payReceiver, setPayReceiver] = useState(null);
  const [newReceiver, setNewReceiver] = useState({ name: '', phone: '', address: '', notes: '' });
  const [newTransaction, setNewTransaction] = useState({ type: 'debt_added', amount: '', description: '' });
  const [payAmount, setPayAmount] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchReceivers = async () => {
    try {
      const res = await api.get('/receivers');
      setReceivers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReceivers(); }, []);

  const openReceiver = async (receiver) => {
    setSelectedReceiver(receiver);
    try {
      const res = await api.get(`/receivers/${receiver.id}/transactions`);
      setTransactions(res.data);
    } catch (err) { console.error(err); }
  };

  const addReceiver = async (e) => {
    e.preventDefault();
    try {
      await api.post('/receivers', newReceiver);
      setMessage({ type: 'success', text: 'تم إضافة المستلم' });
      setNewReceiver({ name: '', phone: '', address: '', notes: '' });
      setShowAddModal(false);
      fetchReceivers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  const handlePay = async (receiver) => {
    if (!payAmount || parseFloat(payAmount) <= 0) {
      return setMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح' });
    }
    try {
      await api.post(`/receivers/${receiver.id}/pay`, {
        amount: parseFloat(payAmount),
        description: `استلام فلوس من ${receiver.name}`
      });
      setMessage({ type: 'success', text: `تم استلام ${payAmount} ج.م من ${receiver.name}` });
      setPayAmount('');
      setShowPayModal(false);
      setPayReceiver(null);
      fetchReceivers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  const handleDebt = async (receiver) => {
    if (!debtAmount || parseFloat(debtAmount) <= 0) {
      return setMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح' });
    }
    try {
      await api.post(`/receivers/${receiver.id}/debt`, {
        amount: parseFloat(debtAmount),
        description: `إضافة مديونية لـ ${receiver.name}`
      });
      setMessage({ type: 'success', text: `تم إضافة ${debtAmount} ج.م مديونية لـ ${receiver.name}` });
      setDebtAmount('');
      setShowDebtModal(false);
      setPayReceiver(null);
      fetchReceivers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  const handleEditReceiver = async (e) => {
    e.preventDefault();
    if (!selectedReceiver) return;
    try {
      const res = await api.put(`/receivers/${selectedReceiver.id}`, editReceiver);
      setMessage({ type: 'success', text: 'تم تعديل بيانات المستلم' });
      setShowEditModal(false);
      // تحديث بيانات المستلم المحدد
      setSelectedReceiver({ ...selectedReceiver, ...res.data });
      fetchReceivers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل التعديل' });
    }
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!selectedReceiver) return;
    try {
      await api.post(`/receivers/${selectedReceiver.id}/transactions`, {
        transaction_type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description
      });
      setMessage({ type: 'success', text: 'تم إضافة المعاملة' });
      setNewTransaction({ type: 'debt_added', amount: '', description: '' });
      setShowTransactionModal(false);
      // Refresh
      const res = await api.get(`/receivers/${selectedReceiver.id}/transactions`);
      setTransactions(res.data);
      fetchReceivers();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  const getTransactionLabel = (type) => {
    const labels = {
      'goods_delivered': 'تحميل بضاعة',
      'money_received': 'استلام اموال',
      'debt_added': 'إضافة مديونية',
      'money_collected': 'تحصيل مديونية',
      'manual_addition': 'إضافة يدوية (لينا)',
      'manual_deduction': 'خصم يدوي (علينا)'
    };
    return labels[type] || type;
  };

  const getTransactionColor = (amount) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionIcon = (amount) => {
    return amount >= 0 ? <Plus size={16} className="text-green-500" /> : <Minus size={16} className="text-red-500" />;
  };

  if (selectedReceiver) {
    return (
      <div>
        <button onClick={() => setSelectedReceiver(null)} className="flex items-center gap-2 text-gray-600 mb-4">
          <ArrowLeft size={20} /> رجوع
        </button>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{selectedReceiver.name}</h3>
              {selectedReceiver.phone && <p className="text-sm text-gray-500">📞 {selectedReceiver.phone}</p>}
              {selectedReceiver.address && <p className="text-sm text-gray-500 mt-1">📍 {selectedReceiver.address}</p>}
              {selectedReceiver.notes && <p className="text-sm text-gray-400 mt-1">📝 {selectedReceiver.notes}</p>}
            </div>
            <button
              onClick={() => { setEditReceiver({ name: selectedReceiver.name, phone: selectedReceiver.phone || '', address: selectedReceiver.address || '', notes: selectedReceiver.notes || '' }); setShowEditModal(true); }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Pencil size={18} className="text-gray-500" />
            </button>
          </div>
          <div className={`mt-3 text-2xl font-extrabold ${selectedReceiver.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {selectedReceiver.balance >= 0 
              ? `لينا ${selectedReceiver.balance} ج.م` 
              : `علينا ${Math.abs(selectedReceiver.balance)} ج.م`}
          </div>
        </div>

        {message.text && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <button
          onClick={() => setShowTransactionModal(true)}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold mb-4 flex items-center justify-center gap-2"
        >
          <DollarSign size={18} /> إضافة معاملة
        </button>

        <h4 className="font-bold text-gray-700 mb-3">سجل التعاملات</h4>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-center">لا توجد معاملات</p>
        ) : (
          (() => {
            // Group transactions by day
            const grouped = {};
            transactions.forEach(t => {
              const dateKey = new Date(t.created_at).toLocaleDateString('ar-EG');
              if (!grouped[dateKey]) grouped[dateKey] = [];
              grouped[dateKey].push(t);
            });
            const sortedDays = Object.keys(grouped).sort((a, b) => {
              const [dayA, monthA, yearA] = a.split('/');
              const [dayB, monthB, yearB] = b.split('/');
              return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
            });

            return sortedDays.map(day => (
              <div key={day} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-gray-500" />
                  <span className="font-bold text-gray-700 text-sm">{day}</span>
                  <span className="text-xs text-gray-400">({grouped[day].length} معاملة)</span>
                </div>
                <div className="space-y-2 mr-5">
                  {grouped[day].map(t => {
                    const amount = parseFloat(t.amount);
                    return (
                      <div key={t.id} className="bg-white p-3 rounded-2xl shadow-sm border-r-4" style={{ borderRightColor: amount < 0 ? '#ef4444' : '#22c55e' }}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(amount)}
                            <span className="font-bold text-gray-800 text-sm">{getTransactionLabel(t.transaction_type)}</span>
                          </div>
                          <span className={`font-bold text-sm ${getTransactionColor(amount)}`}>
                            {amount >= 0 ? '+' : ''}{amount} ج.م
                          </span>
                        </div>
                        {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                        {t.task_title && <p className="text-[10px] text-gray-400 mt-0.5">{t.task_title}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(t.created_at).toLocaleTimeString('ar-EG')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()
        )}

        {/* مودال تعديل بيانات المستلم */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h4 className="font-bold text-lg mb-4">تعديل بيانات {selectedReceiver.name}</h4>
              <form onSubmit={handleEditReceiver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                  <input value={editReceiver.name} onChange={e => setEditReceiver({...editReceiver, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                  <input value={editReceiver.phone} onChange={e => setEditReceiver({...editReceiver, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="أدخل رقم الهاتف" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان/الموقع</label>
                  <input value={editReceiver.address} onChange={e => setEditReceiver({...editReceiver, address: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="مثال: شارع الجمهورية - المنصورة" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                  <textarea value={editReceiver.notes} onChange={e => setEditReceiver({...editReceiver, notes: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" rows="2" placeholder="ملاحظات إضافية" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold">حفظ التعديلات</button>
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* مودال إضافة معاملة */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <h4 className="font-bold text-lg mb-4">إضافة معاملة لـ {selectedReceiver.name}</h4>
              <form onSubmit={addTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع المعاملة</label>
                  <select value={newTransaction.type} onChange={e => setNewTransaction({...newTransaction, type: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50">
                    <option value="debt_added">➕ تحميل بضاعة (المستلم مديون لنا)</option>
                    <option value="money_collected">➖ استلام اموال (خصم من مديونيته)</option>
                    <option value="manual_addition">➕ إضافة رصيد يدوي (لينا)</option>
                    <option value="manual_deduction">➖ خصم رصيد يدوي (علينا)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                  <input type="number" step="0.01" value={newTransaction.amount} onChange={e => setNewTransaction({...newTransaction, amount: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
                  <input value={newTransaction.description} onChange={e => setNewTransaction({...newTransaction, description: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold">إضافة</button>
                  <button type="button" onClick={() => setShowTransactionModal(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">سجل التعاملات</h3>
      
      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <button
        onClick={() => setShowAddModal(true)}
        className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold mb-4 flex items-center justify-center gap-2"
      >
        <UserPlus size={18} /> إضافة مستلم جديد
      </button>

      {loading ? (
        <p className="text-center text-gray-400">تحميل...</p>
      ) : receivers.length === 0 ? (
        <p className="text-center text-gray-400">لا يوجد مستلمين</p>
      ) : (
        receivers.map(r => (
          <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border mb-3">
            <div
              onClick={() => openReceiver(r)}
              className="flex justify-between items-center cursor-pointer hover:opacity-80"
            >
              <div>
                <span className="font-bold text-gray-800">{r.name}</span>
                <div className="text-sm text-gray-500 mt-0.5">
                  {r.phone && <span>📞 {r.phone}</span>}
                  {r.address && <span className="mr-2">📍 {r.address}</span>}
                </div>
              </div>
              <span className={`font-bold ${r.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {r.balance >= 0 ? `+${r.balance}` : r.balance} ج.م
              </span>
            </div>
            {/* أزرار سريعة للاستلام والمديونية */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={(e) => { e.stopPropagation(); setPayReceiver(r); setShowPayModal(true); }}
                className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
              >
                <HandCoins size={16} /> استلام فلوس
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setPayReceiver(r); setShowDebtModal(true); }}
                className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1"
              >
                <BadgeDollarSign size={16} /> إضافة مديونية
              </button>
            </div>
          </div>
        ))
      )}

      {/* مودال استلام فلوس */}
      {showPayModal && payReceiver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-4">استلام فلوس من {payReceiver.name}</h4>
            <form onSubmit={(e) => { e.preventDefault(); handlePay(payReceiver); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="أدخل المبلغ"
                  required
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">تأكيد الاستلام</button>
                <button type="button" onClick={() => { setShowPayModal(false); setPayAmount(''); setPayReceiver(null); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إضافة مديونية */}
      {showDebtModal && payReceiver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-4">إضافة مديونية لـ {payReceiver.name}</h4>
            <form onSubmit={(e) => { e.preventDefault(); handleDebt(payReceiver); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  value={debtAmount}
                  onChange={e => setDebtAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="أدخل المبلغ"
                  required
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold">تأكيد الإضافة</button>
                <button type="button" onClick={() => { setShowDebtModal(false); setDebtAmount(''); setPayReceiver(null); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إضافة مستلم */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-4">إضافة مستلم جديد</h4>
            <form onSubmit={addReceiver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input value={newReceiver.name} onChange={e => setNewReceiver({...newReceiver, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف (اختياري)</label>
                <input value={newReceiver.phone} onChange={e => setNewReceiver({...newReceiver, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان/الموقع (اختياري)</label>
                <input value={newReceiver.address} onChange={e => setNewReceiver({...newReceiver, address: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="مثال: شارع الجمهورية - المنصورة" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea value={newReceiver.notes} onChange={e => setNewReceiver({...newReceiver, notes: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" rows="2" />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold">إضافة</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiversLog;
