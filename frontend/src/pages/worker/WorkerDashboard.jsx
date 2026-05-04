import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Briefcase, DollarSign, Package } from 'lucide-react';

const WorkerDashboard = () => {
  const [tasksCount, setTasksCount] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [lastPayment, setLastPayment] = useState(null);

  useEffect(() => {
    api.get('/tasks')
      .then(res => {
        const active = res.data.filter(t => !['completed', 'cancelled'].includes(t.status));
        setTasksCount(active.length);
        const qty = active.reduce((sum, t) => sum + parseFloat(t.quantity || 0), 0);
        setTotalQuantity(qty);
      })
      .catch(console.error);

    api.get('/salaries/payments')
      .then(res => {
        if (res.data.length > 0) {
          setLastPayment(res.data[0]);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">الرئيسية</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Briefcase size={20} className="text-green-600" />
            <span className="text-sm">المهام النشطة</span>
          </div>
          <div className="text-4xl font-extrabold text-green-700">{tasksCount}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-5 rounded-2xl shadow-sm border border-amber-200">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Package size={20} className="text-amber-600" />
            <span className="text-sm">إجمالي العهدة</span>
          </div>
          <div className="text-4xl font-extrabold text-amber-700">{totalQuantity.toFixed(1)}</div>
        </div>

        <div className="col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <DollarSign size={20} className="text-blue-600" />
            <span className="text-sm">آخر إيداع مرتب</span>
          </div>
          {lastPayment ? (
            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold text-blue-700">{parseFloat(lastPayment.amount).toFixed(1)} ج.م</div>
              <div className="text-sm text-gray-400">{new Date(lastPayment.payment_date).toLocaleDateString('ar-EG')}</div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">لا يوجد إيداعات بعد</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
