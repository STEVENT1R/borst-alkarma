import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Briefcase, DollarSign, Package, Landmark } from 'lucide-react';

const WorkerDashboard = () => {
  const [tasksCount, setTasksCount] = useState(0);
  const [cashBalance, setCashBalance] = useState(0);
  const [goodsValue, setGoodsValue] = useState(0);
  const [lastPayment, setLastPayment] = useState(null);

  useEffect(() => {
    // المهام النشطة
    api.get('/tasks')
      .then(res => {
        const active = res.data.filter(t => !['completed', 'cancelled'].includes(t.status));
        setTasksCount(active.length);
      })
      .catch(console.error);

    // العهدة (نقدي + بضاعة)
    api.get('/auth/me')
      .then(userRes => {
        const id = userRes.data.id;
        return api.get(`/workers-load/${id}`);
      })
      .then(loadRes => {
        setCashBalance(loadRes.data.cash_balance || 0);
        setGoodsValue(loadRes.data.total_goods_value || 0);
      })
      .catch(console.error);

    // آخر إيداع مرتب
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
        {/* المهام النشطة */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Briefcase size={20} className="text-green-600" />
            <span className="text-sm">المهام النشطة</span>
          </div>
          <div className="text-4xl font-extrabold text-green-700">{tasksCount}</div>
        </div>

        {/* العهدة النقدية */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <DollarSign size={20} className="text-blue-600" />
            <span className="text-sm">العهدة النقدية</span>
          </div>
          <div className="text-2xl font-extrabold text-blue-700">{cashBalance.toFixed(1)} ج.م</div>
        </div>

        {/* قيمة البضاعة في العهدة */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-5 rounded-2xl shadow-sm border border-amber-200">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Package size={20} className="text-amber-600" />
            <span className="text-sm">قيمة البضاعة</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{goodsValue.toFixed(1)} ج.م</div>
        </div>

        {/* آخر إيداع مرتب */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl shadow-sm border border-purple-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Landmark size={20} className="text-purple-600" />
            <span className="text-sm">آخر إيداع مرتب</span>
          </div>
          {lastPayment ? (
            <div className="flex items-center justify-between">
              <div className="text-2xl font-extrabold text-purple-700">{parseFloat(lastPayment.amount).toFixed(1)} ج.م</div>
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
