import { useState, useEffect } from 'react';
import api from '../../services/api';

const TaskLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/logs').then(res => setLogs(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

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

  if (loading) return <div className="text-center py-12 text-gray-400">تحميل السجلات...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">سجل المهام</h3>
      <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-right">العنوان</th>
              <th className="p-3 text-right">المشرف</th>
              <th className="p-3 text-right">صاحب المهمة</th>
              <th className="p-3 text-right">المنتج</th>
              <th className="p-3 text-right">النوع</th>
              <th className="p-3 text-right">كمية</th>
              <th className="p-3 text-right">سعر</th>
              <th className="p-3 text-right">ملاحظات</th>
              <th className="p-3 text-right">الحالة</th>
              <th className="p-3 text-right">تاريخ</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(task => (
              <tr key={task.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{task.title}</td>
                <td className="p-3">{task.supervisor_name}</td>
                <td className="p-3">{task.worker_name}</td>
                <td className="p-3">{task.product_name || '-'}</td>
                <td className="p-3">{task.unit_type === 'weight' ? 'وزن' : 'عدد'}</td>
                <td className="p-3">{task.quantity} {task.unit_type === 'weight' ? 'كجم' : ''}</td>
                <td className="p-3">{task.price}</td>
                <td className="p-3 text-gray-500 max-w-[120px] truncate" title={task.notes}>{task.notes || '-'}</td>
                <td className="p-3">{statusLabels[task.status] || task.status}</td>
                <td className="p-3">{new Date(task.created_at).toLocaleDateString('ar-EG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskLogs;
