import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Calendar, ChevronDown, ChevronLeft } from 'lucide-react';

const TaskLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    api.get('/tasks/logs').then(res => setLogs(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleDay = (day) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
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

  if (loading) return <div className="text-center py-12 text-gray-400">تحميل السجلات...</div>;

  // تجميع المهام باليوم
  const grouped = {};
  logs.forEach(task => {
    const dayKey = new Date(task.created_at).toLocaleDateString('ar-EG');
    if (!grouped[dayKey]) grouped[dayKey] = [];
    grouped[dayKey].push(task);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/');
    const [dayB, monthB, yearB] = b.split('/');
    return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
  });

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">سجل المهام</h3>

      {sortedDays.length === 0 ? (
        <div className="text-center py-8 text-gray-400">لا توجد مهام مسجلة</div>
      ) : (
        <div className="space-y-3">
          {sortedDays.map(day => {
            const dayTasks = grouped[day];
            const isOpen = expandedDays[day] !== false; // default open

            return (
              <div key={day} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => toggleDay(day)}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronLeft size={16} className="text-gray-400" />}
                    <Calendar size={14} className="text-gray-400" />
                    <span className="font-bold text-gray-700 text-sm">{day}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{dayTasks.length} مهام</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto px-3 pb-3">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-2 text-right">العنوان</th>
                          <th className="p-2 text-right">المشرف</th>
                          <th className="p-2 text-right">صاحب المهمة</th>
                          <th className="p-2 text-right">المنتج</th>
                          <th className="p-2 text-right">النوع</th>
                          <th className="p-2 text-right">كمية</th>
                          <th className="p-2 text-right">سعر</th>
                          <th className="p-2 text-right">ملاحظات</th>
                          <th className="p-2 text-right">الحالة</th>
                          <th className="p-2 text-right">تاريخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayTasks.map(task => (
                          <tr key={task.id} className="border-t hover:bg-gray-50">
                            <td className="p-2">{task.title}</td>
                            <td className="p-2">{task.supervisor_name}</td>
                            <td className="p-2">{task.worker_name}</td>
                            <td className="p-2">{task.product_name || '-'}</td>
                            <td className="p-2">{task.unit_type === 'weight' ? 'وزن' : 'عدد'}</td>
                            <td className="p-2">{task.quantity} {task.unit_type === 'weight' ? 'كجم' : ''}</td>
                            <td className="p-2">{task.price}</td>
                            <td className="p-2 text-gray-500 max-w-[120px] truncate" title={task.notes}>{task.notes || '-'}</td>
                            <td className="p-2">{statusLabels[task.status] || task.status}</td>
                            <td className="p-2">{new Date(task.created_at).toLocaleDateString('ar-EG')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskLogs;
