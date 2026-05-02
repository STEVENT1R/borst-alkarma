import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, Play, Send, XCircle, Clock, Truck, Package, Store, ShoppingBag, DollarSign, HandCoins } from 'lucide-react';

const AllTasks = () => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [collectTask, setCollectTask] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectLoading, setCollectLoading] = useState(false);
  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setAllTasks(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'فشل');
    }
  };

  const handleCollect = async (taskId) => {
    // منع النقر المتكرر
    if (collectLoading) return;
    setCollectLoading(true);
    try {
      if (!collectAmount || parseFloat(collectAmount) <= 0) {
        setCollectLoading(false);
        return alert('يرجى إدخال مبلغ صحيح');
      }
      if (!collectTask) {
        setCollectLoading(false);
        return alert('بيانات المهمة غير مكتملة');
      }
      const amount = parseFloat(collectAmount);
      console.log(`جاري تحصيل ${amount} ج.م من ${collectTask.receiver_name} في المهمة ${taskId}`);
      const response = await api.post(`/tasks/${taskId}/collect`, {
        amount: amount,
        description: `تحصيل من ${collectTask.receiver_name}`
      });
      console.log('تم التحصيل بنجاح:', response.data);
      setCollectTask(null);
      setCollectAmount('');
      setCollectLoading(false);
      fetchTasks();
      alert(`✅ تم تحصيل ${amount} ج.م بنجاح`);
    } catch (err) {
      console.error('خطأ في التحصيل:', err);
      const errorMsg = err.response?.data?.error || err.message || 'حدث خطأ غير متوقع';
      alert('❌ ' + errorMsg);
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
    'money_delivery': 'تم الاستلاف'
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
          سعر: {task.price} | 
          <span className={`inline-flex items-center gap-0.5 ${task.sale_type === 'wholesale' ? 'text-blue-600' : 'text-green-600'}`}>
            {task.sale_type === 'wholesale' ? <Package size={12} /> : <Store size={12} />}
            {task.sale_type === 'wholesale' ? ' جملة' : ' قطاعي'}
          </span>
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
                  <button onClick={() => updateStatus(task.id, 'money_delivery')} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-lg text-sm"><DollarSign size={14} /> استلاف</button>
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
              <button onClick={() => updateStatus(task.id, 'money_delivery')} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-lg text-sm"><DollarSign size={14} /> استلاف</button>
            </>
          )}
          {/* للمهام اللي تم تحميل البضاعة فقط - يظهر زر تحصيل لاستلام الفلوس */}
          {user.role === 'supervisor' && task.status === 'delivered' && (
            <button onClick={() => { setCollectTask(task); setCollectAmount(''); }} className="flex items-center gap-1 bg-teal-600 text-white px-3 py-1 rounded-lg text-sm"><HandCoins size={14} /> تحصيل</button>
          )}
          
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-center py-8">تحميل...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800">المهام</h3>
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

      {/* مودال تحصيل */}
      {collectTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-4">تحصيل من {collectTask.receiver_name}</h4>
            <p className="text-sm text-gray-500 mb-4">المهمة: {collectTask.title} | المبلغ الأصلي: {collectTask.price} ج.م</p>
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
    </div>
  );
};

export default AllTasks;


