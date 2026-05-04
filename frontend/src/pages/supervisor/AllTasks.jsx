import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Play, Send, XCircle, Clock, Truck, Package, DollarSign, HandCoins, TrendingUp } from 'lucide-react';

const AllTasks = () => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [collectTask, setCollectTask] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectLoading, setCollectLoading] = useState(false);
  const [debtSummary, setDebtSummary] = useState({ total_we_are_owed: 0 });
  const [showMainCollect, setShowMainCollect] = useState(false);
  const [mainCollectReceiver, setMainCollectReceiver] = useState(null);
  const [mainCollectAmount, setMainCollectAmount] = useState('');
  const [mainCollectLoading, setMainCollectLoading] = useState(false);
  const [collectableTasks, setCollectableTasks] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [collectMsg, setCollectMsg] = useState({ show: false, text: '', type: 'success' });

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setAllTasks(res.data);
      const collectable = res.data.filter(t => t.status === 'delivered' && t.receiver_name);
      setCollectableTasks(collectable);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDebtSummary = async () => {
    try {
      const res = await api.get('/receivers/summary');
      setDebtSummary(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchReceivers = async () => {
    try {
      const res = await api.get('/receivers');
      setReceivers(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchTasks();
    fetchDebtSummary();
    fetchReceivers();
  }, []);

  const handleMainCollect = async (receiverName) => {
    if (mainCollectLoading) return;
    setMainCollectLoading(true);
    try {
      if (!mainCollectAmount || parseFloat(mainCollectAmount) <= 0) {
        setMainCollectLoading(false);
        setCollectMsg({ show: true, text: 'يرجى إدخال مبلغ صحيح', type: 'error' });
        return;
      }
      const amount = parseFloat(mainCollectAmount);
      const task = collectableTasks.find(t => t.receiver_name === receiverName);
      if (!task) {
        setMainCollectLoading(false);
        setCollectMsg({ show: true, text: 'لا توجد مهام قابلة للتحصيل لهذا المستلم', type: 'error' });
        return;
      }
      const response = await api.post(`/tasks/${task.id}/collect`, {
        amount: amount,
        description: `تحصيل من ${receiverName}`
      });
      setShowMainCollect(false);
      setMainCollectReceiver(null);
      setMainCollectAmount('');
      setMainCollectLoading(false);
      fetchTasks();
      fetchDebtSummary();
      fetchReceivers();
      if (response.data.completed) {
        setCollectMsg({ show: true, text: `✅ تم تحصيل ${amount} ج.م بالكامل من ${receiverName}`, type: 'success' });
      } else {
        setCollectMsg({ show: true, text: `✅ تم تحصيل ${amount} ج.م من ${receiverName}، المتبقي ${response.data.remaining} ج.م`, type: 'success' });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'حدث خطأ غير متوقع';
      setCollectMsg({ show: true, text: '❌ ' + errorMsg, type: 'error' });
      setMainCollectLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'فشل');
    }
  };

  const handleCollect = async (taskId) => {
    if (collectLoading) return;
    setCollectLoading(true);
    try {
      if (!collectAmount || parseFloat(collectAmount) <= 0) {
        setCollectLoading(false);
        setCollectMsg({ show: true, text: 'يرجى إدخال مبلغ صحيح', type: 'error' });
        return;
      }
      if (!collectTask) {
        setCollectLoading(false);
        setCollectMsg({ show: true, text: 'بيانات المهمة غير مكتملة', type: 'error' });
        return;
      }
      const amount = parseFloat(collectAmount);
      const response = await api.post(`/tasks/${taskId}/collect`, {
        amount: amount,
        description: `تحصيل من ${collectTask.receiver_name}`
      });
      setCollectTask(null);
      setCollectAmount('');
      setCollectLoading(false);
      fetchTasks();
      fetchDebtSummary();
      fetchReceivers();
      if (response.data.completed) {
        setCollectMsg({ show: true, text: `✅ تم تحصيل ${amount} ج.م بالكامل`, type: 'success' });
      } else {
        setCollectMsg({ show: true, text: `✅ تم تحصيل ${amount} ج.م، المتبقي ${response.data.remaining} ج.م`, type: 'success' });
      }
    } catch (err) {
      console.error('خطأ في التحصيل:', err);
      const errorMsg = err.response?.data?.error || err.message || 'حدث خطأ غير متوقع';
      setCollectMsg({ show: true, text: '❌ ' + errorMsg, type: 'error' });
      setCollectLoading(false);
    }
  };

  const nonPersonal = allTasks.filter(t => t.worker_id !== t.supervisor_id);
  const myTasks = allTasks.filter(t => t.worker_id === user.id);

  const statusLabels = {
    'pending': 'معلق',
    'in_progress': 'قيد التنفيذ',
    'awaiting_approval': 'بانتظار الموافقة',
    'completed': 'مكتملة',
    'cancelled': 'ملغية',
    'delivered': 'تم التحميل',
    'loaded': 'تم استلام الأموال',
    'delivered_and_loaded': 'تم التحميل والاستلام',
  };

  const taskCard = (task) => {
    const isMyTask = task.worker_id === user.id;
    const borderColor = task.status === 'completed' ? 'border-green-300' : 
                        task.status === 'cancelled' ? 'border-red-300' :
                        task.status === 'delivered' ? 'border-blue-400' :
                        task.status === 'loaded' ? 'border-purple-400' : 'border-green-500';
    return (
      <div key={task.id} className={`bg-white p-4 rounded-2xl shadow-sm mb-3 border-r-4 ${borderColor}`}>
        <div className="flex justify-between">
          <h4 className="font-bold text-gray-800">{task.title}</h4>
          <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">{statusLabels[task.status] || task.status}</span>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {task.product_name && `${task.product_name} | `}
          {task.quantity > 0 && `كمية: ${task.quantity} ${task.unit_type === 'weight' ? 'كجم' : task.unit_type === 'unit' ? 'قطعة' : ''} | `}
          سعر: {task.price}
        </div>
        {task.receiver_name && (
          <div className="text-sm text-gray-500">المستلم: {task.receiver_name}</div>
        )}
        {task.notes && (
          <div className="text-sm text-gray-500 mt-1 bg-blue-50 p-2 rounded-lg">{task.notes}</div>
        )}
        {task.reminder_time && (
          <div className="text-xs text-orange-500 flex items-center gap-1 mt-1"><Clock size={12} /> {new Date(task.reminder_time).toLocaleString('ar-EG')}</div>
        )}

        <div className="flex gap-2 mt-3 flex-wrap">
          {isMyTask && task.status === 'pending' && (
            <button onClick={() => updateStatus(task.id, 'in_progress')} className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-sm"><Play size={14} /> بدء</button>
          )}
          {isMyTask && task.status === 'in_progress' && (
            <>
              {user.role === 'supervisor' ? (
                <>
                  <button onClick={() => updateStatus(task.id, 'delivered')} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"><Truck size={14} /> تحميل بضاعه</button>
                  <button onClick={() => updateStatus(task.id, 'loaded')} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"><DollarSign size={14} /> استلام اموال</button>
                  <button onClick={() => updateStatus(task.id, 'delivered_and_loaded')} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1 rounded-lg text-sm"><Package size={14} /> تحميل و استلام</button>
                </>
              ) : (
                <button onClick={() => updateStatus(task.id, 'awaiting_approval')} className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"><Send size={14} /> طلب موافقة</button>
              )}
              <button onClick={() => updateStatus(task.id, 'cancelled')} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg text-sm"><XCircle size={14} /> إلغاء</button>
            </>
          )}
          {!isMyTask && task.status === 'awaiting_approval' && (
            <>
              <button onClick={() => updateStatus(task.id, 'delivered')} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"><Truck size={14} /> تحميل بضاعه</button>
              <button onClick={() => updateStatus(task.id, 'loaded')} className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1 rounded-lg text-sm"><DollarSign size={14} /> استلام اموال</button>
              <button onClick={() => updateStatus(task.id, 'delivered_and_loaded')} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1 rounded-lg text-sm"><Package size={14} /> تحميل و استلام</button>
            </>
          )}
          {user.role === 'supervisor' && task.status === 'delivered' && task.receiver_name && (
            <button onClick={() => { setCollectTask(task); setCollectAmount(''); }} className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1 rounded-lg text-sm"><HandCoins size={14} /> تحصيل {(parseFloat(task.price) - parseFloat(task.collected_amount || 0)).toFixed(1)} ج.م</button>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-8">تحميل...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800">المهام</h3>

      {/* رسالة التحصيل */}
      {collectMsg.show && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${collectMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {collectMsg.text}
          <button onClick={() => setCollectMsg({ ...collectMsg, show: false })} className="mr-2 text-xs underline">إخفاء</button>
        </div>
      )}

      {/* كارت مديونيات الناس - يستخدم الرصيد الفعلي من API */}
      {(() => {
        if (!receivers || !receivers.length || !collectableTasks || !collectableTasks.length) return null;
        const withDebt = receivers.filter(r => {
          const bal = parseFloat(r.balance);
          return bal > 0 && collectableTasks.some(t => t.receiver_name === r.name);
        });
        return withDebt.length > 0 ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-200 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-green-600" />
                <span className="font-bold text-gray-700">لينا عند الناس</span>
              </div>
              <span className="text-lg font-extrabold text-green-700">{parseFloat(debtSummary.total_we_are_owed).toFixed(1)} ج.م</span>
            </div>
            <div className="mt-2 space-y-2">
              {withDebt.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-green-100">
                  <div className="flex-1">
                    <span className="font-bold text-sm text-gray-800">{r.name}</span>
                    <div className="text-xs text-gray-500">
                      المتبقي: <span className="font-bold text-green-700">{parseFloat(r.balance).toFixed(1)} ج.م</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMainCollectReceiver(r.name);
                      setMainCollectAmount('');
                      setShowMainCollect(true);
                    }}
                    className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <HandCoins size={14} /> تحصيل
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      <div className="flex mb-6 bg-white rounded-xl p-1 shadow-sm">
        <button onClick={() => setTab('all')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'all' ? 'bg-green-500 text-white' : 'text-gray-500'}`}>كل المهام</button>
        <button onClick={() => setTab('my')} className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'my' ? 'bg-green-500 text-white' : 'text-gray-500'}`}>مهامي</button>
      </div>

      {tab === 'my' ? (
        myTasks.length === 0 ? <p className="text-gray-400 text-center">لا توجد مهام شخصية</p> : myTasks.map(taskCard)
      ) : (
        nonPersonal.length === 0 ? <p className="text-gray-400 text-center">لا يوجد مسؤولين مهمات حتي الان</p> :
          nonPersonal.map(taskCard)
      )}

      {/* مودال تحصيل من كارت المهمة */}
      {collectTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-4">تحصيل من {collectTask.receiver_name}</h4>
            <p className="text-sm text-gray-500 mb-4">المهمة: {collectTask.title} | المبلغ الأصلي: {collectTask.price} ج.م | المطلوب تحصيله: <span className="font-bold text-green-700">{(parseFloat(collectTask.price) - parseFloat(collectTask.collected_amount || 0)).toFixed(1)} ج.م</span></p>
            <form onSubmit={(e) => { e.preventDefault(); handleCollect(collectTask.id); }} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المحصل</label>
                <input
                  type="number"
                  step="0.01"
                  value={collectAmount}
                  onChange={e => setCollectAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="أدخل المبلغ"
                  required
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold">تأكيد التحصيل</button>
                <button type="button" onClick={() => { setCollectTask(null); setCollectAmount(''); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تحصيل رئيسي من كارت مديونيات الناس */}
      {showMainCollect && mainCollectReceiver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-4">تحصيل من {mainCollectReceiver}</h4>
            <p className="text-sm text-gray-500 mb-4">
              إجمالي المديونية: {parseFloat(debtSummary.total_we_are_owed).toFixed(1)} ج.م
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleMainCollect(mainCollectReceiver); }} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المحصل</label>
                <input
                  type="number"
                  step="0.01"
                  value={mainCollectAmount}
                  onChange={e => setMainCollectAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="أدخل المبلغ"
                  required
                  min="1"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={mainCollectLoading} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold">
                  {mainCollectLoading ? 'جاري...' : 'تأكيد التحصيل'}
                </button>
                <button type="button" onClick={() => { setShowMainCollect(false); setMainCollectReceiver(null); setMainCollectAmount(''); }} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllTasks;
