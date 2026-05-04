import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Play, Send, XCircle, Clock } from 'lucide-react';

const WorkerTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.filter(t => t.worker_id === user.id));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'فشل');
    }
  };

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

  if (loading) return <div className="text-center py-8">تحميل...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">مهامي</h3>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-center">لا توجد مهام</p>
      ) : (
        tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm mb-3 border-r-4 border-green-500">
            <div className="flex justify-between">
              <h4 className="font-bold text-gray-800">{task.title}</h4>
              <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">{statusLabels[task.status] || task.status}</span>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {task.product_name && `${task.product_name} | `}
              {task.quantity > 0 && `كمية: ${task.quantity} ${task.unit_type === 'weight' ? 'كجم' : task.unit_type === 'unit' ? 'قطعة' : ''} | `}
              سعر: {task.price}
            </div>
            {task.receiver_name && <div className="text-sm text-gray-500">المستلم: {task.receiver_name}</div>}
            {task.notes && <div className="text-sm text-gray-500 mt-1 bg-blue-50 p-2 rounded-lg">📝 {task.notes}</div>}
            {task.reminder_time && (
              <div className="text-xs text-orange-500 flex items-center gap-1 mt-1"><Clock size={12} /> {new Date(task.reminder_time).toLocaleString('ar-EG')}</div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {task.status === 'pending' && (
                <button onClick={() => updateStatus(task.id, 'in_progress')} className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-sm"><Play size={14} /> بدء</button>
              )}
              {task.status === 'in_progress' && (
                <>
                  <button onClick={() => updateStatus(task.id, 'awaiting_approval')} className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded-lg text-sm"><Send size={14} /> طلب موافقة</button>
                  <button onClick={() => updateStatus(task.id, 'cancelled')} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg text-sm"><XCircle size={14} /> إلغاء</button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default WorkerTasks;
