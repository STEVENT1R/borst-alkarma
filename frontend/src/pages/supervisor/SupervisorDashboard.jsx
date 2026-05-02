import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Briefcase, Users, AlertTriangle, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const SupervisorDashboard = () => {
  const [activeTasks, setActiveTasks] = useState(0);
  const [totalCustody, setTotalCustody] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [debtSummary, setDebtSummary] = useState({ total_we_owe: 0, total_we_are_owed: 0 });
  const [liquidity, setLiquidity] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const tasksRes = await api.get('/tasks');
      const terminalStatuses = ['completed', 'cancelled', 'delivered', 'loaded', 'delivered_and_loaded', 'money_delivery'];
      const active = tasksRes.data.filter(t => !terminalStatuses.includes(t.status));
      setActiveTasks(active.length);
      const cust = active.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
      setTotalCustody(cust);

      const invRes = await api.get('/inventory');
      setLowStock(invRes.data.filter(p => p.quantity < 5).length);

      try {
        const debtRes = await api.get('/receivers/summary');
        setDebtSummary(debtRes.data);
      } catch(e) {}

      try {
        const profitRes = await api.get('/profit/summary');
        setLiquidity(profitRes.data.current_liquidity);
      } catch(e) {}
    };
    fetchData();
  }, []);

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">لوحة التحكم</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Briefcase size={20} className="text-green-600" />
            <span className="text-sm">مهام نشطة</span>
          </div>
          <div className="text-4xl font-extrabold text-green-700">{activeTasks}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Users size={20} className="text-blue-600" />
            <span className="text-sm">إجمالي العهد</span>
          </div>
          <div className="text-4xl font-extrabold text-blue-700">{totalCustody} ج.م</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-5 rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingDown size={20} className="text-red-600" />
            <span className="text-sm">مديونيات علينا</span>
          </div>
          <div className="text-3xl font-extrabold text-red-700">{debtSummary.total_we_owe} ج.م</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingUp size={20} className="text-green-600" />
            <span className="text-sm">لينا عند الناس</span>
          </div>
          <div className="text-3xl font-extrabold text-green-700">{debtSummary.total_we_are_owed} ج.م</div>
        </div>

        <div className="col-span-2 bg-gradient-to-br from-teal-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-teal-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Wallet size={20} className="text-teal-600" />
            <span className="text-sm">السيولة الحالية</span>
          </div>
          <div className="text-4xl font-extrabold text-teal-700">{liquidity} ج.م</div>
        </div>

        <div className="col-span-2 bg-gradient-to-br from-yellow-50 to-amber-50 p-5 rounded-2xl shadow-sm border border-yellow-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <AlertTriangle size={20} className="text-yellow-600" />
            <span className="text-sm">منتجات منخفضة المخزون</span>
          </div>
          <div className="text-4xl font-extrabold text-yellow-700">{lowStock}</div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
