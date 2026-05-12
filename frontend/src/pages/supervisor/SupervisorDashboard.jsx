import { useState, useEffect } from 'react';
import api from '../../services/api';
import { TrendingUp, TrendingDown, Wallet, Calendar, MinusCircle, DollarSign, AlertTriangle, Briefcase, Database, Users } from 'lucide-react';

const SupervisorDashboard = () => {
  const [todayData, setTodayData] = useState({
    net_revenue_today: 0,
    net_profit_today: 0,
    gross_revenue_today: 0,
    spoilage_today: 0,
    expenses_today: 0,
    salaries_today: 0,
  });
  const [activeTasks, setActiveTasks] = useState(0);
  const [lowStock, setLowStock] = useState(0);
  const [liquidity, setLiquidity] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [totalWeOwe, setTotalWeOwe] = useState('0');
  const [totalWeAreOwed, setTotalWeAreOwed] = useState('0');

  useEffect(() => {
    const fetchData = async () => {
      // جلب بيانات اليوم (صافي الإيراد اليوم + صافي الربح اليوم)
      try {
        const todayRes = await api.get('/profit/today');
        setTodayData(todayRes.data);
      } catch(e) { console.error('Today data error:', e); }

      // المهام النشطة
      try {
        const tasksRes = await api.get('/tasks');
        const terminalStatuses = ['completed', 'cancelled', 'delivered', 'loaded', 'delivered_and_loaded'];
        const active = tasksRes.data.filter(t => !terminalStatuses.includes(t.status));
        setActiveTasks(active.length);
      } catch(e) {}

      try {
        const invRes = await api.get('/inventory');
        setLowStock(invRes.data.filter(p => p.quantity < 5).length);
      } catch(e) {}

      try {
        const debtRes = await api.get('/receivers/summary');
        setTotalWeAreOwed(parseFloat(debtRes.data.total_we_are_owed || 0).toFixed(1));
        const purchaseDebtRes = await api.get('/purchases/debt');
        setTotalWeOwe((parseFloat(debtRes.data.total_we_owe) + parseFloat(purchaseDebtRes.data.total_purchase_debt)).toFixed(1));
      } catch(e) {}

      try {
        const profitRes = await api.get('/profit/summary');
        setLiquidity(profitRes.data.current_liquidity);
        setInventoryValue(profitRes.data.inventory_value);
      } catch(e) {}
    };
    fetchData();
    
    // تحديث كل 30 ثانية
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const { net_revenue_today, net_profit_today, gross_revenue_today, spoilage_today, expenses_today, salaries_today } = todayData;

  const today = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* عنوان مع التاريخ */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">المتابعة اليومية</h3>
        <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
          <Calendar size={14} />
          <span>{today}</span>
        </div>
      </div>

      {/* ===== البطاقتين الرئيسيتين ===== */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* صافي الإيراد اليوم */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-5 rounded-2xl shadow-md border-2 border-emerald-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp size={22} className="text-emerald-600" />
            <span className="text-base font-semibold">صافي الإيراد اليوم</span>
          </div>
          <div className="text-4xl font-extrabold text-emerald-700">{parseFloat(net_revenue_today || 0).toFixed(1)} ج.م</div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>إجمالي الإيراد: {parseFloat(gross_revenue_today || 0).toFixed(1)}</span>
            {parseFloat(spoilage_today || 0) > 0 && (
              <span className="text-red-500">- هالك: {parseFloat(spoilage_today).toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* صافي الربح اليوم */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-5 rounded-2xl shadow-md border-2 border-amber-200">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Wallet size={22} className="text-amber-600" />
            <span className="text-base font-semibold">صافي الربح اليوم</span>
          </div>
          <div className={`text-4xl font-extrabold ${parseFloat(net_profit_today || 0) >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
            {parseFloat(net_profit_today || 0).toFixed(1)} ج.م
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
          </div>
        </div>

      </div>

      {/* ===== تفاصيل اليوم المصغرة ===== */}
      {(parseFloat(spoilage_today || 0) > 0 || parseFloat(expenses_today || 0) > 0) && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {parseFloat(spoilage_today || 0) > 0 && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
              <MinusCircle size={16} className="text-red-500 mx-auto mb-1" />
              <div className="text-xs text-gray-500">هالك</div>
              <div className="text-sm font-bold text-red-600">{parseFloat(spoilage_today).toFixed(1)}</div>
            </div>
          )}
          {parseFloat(expenses_today || 0) > 0 && (
            <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
              <DollarSign size={16} className="text-orange-500 mx-auto mb-1" />
              <div className="text-xs text-gray-500">مصروفات</div>
              <div className="text-sm font-bold text-orange-600">{parseFloat(expenses_today).toFixed(1)}</div>
            </div>
          )}
        </div>
      )}

      {/* ===== بطاقات ثانوية ===== */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-teal-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Wallet size={16} className="text-teal-600" />
            <span className="text-[11px]">النقدية</span>
          </div>
          <div className="text-xl font-bold text-teal-700">{parseFloat(liquidity || 0).toFixed(1)} ج.م</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-2xl shadow-sm border border-indigo-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Database size={16} className="text-indigo-600" />
            <span className="text-[11px]">قيمة المخزن</span>
          </div>
          <div className="text-xl font-bold text-indigo-700">{parseFloat(inventoryValue || 0).toFixed(1)} ج.م</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Briefcase size={16} className="text-blue-600" />
            <span className="text-[11px]">مهام نشطة</span>
          </div>
          <div className="text-xl font-bold text-blue-700">{activeTasks}</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-[11px]">لينا عند الناس</span>
          </div>
          <div className="text-lg font-bold text-green-700">{totalWeAreOwed} ج.م</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <TrendingDown size={16} className="text-red-600" />
            <span className="text-[11px]">مديونيات علينا</span>
          </div>
          <div className="text-lg font-bold text-red-700">{totalWeOwe} ج.م</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-2xl shadow-sm border border-yellow-100">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <AlertTriangle size={16} className="text-yellow-600" />
            <span className="text-[11px]">منتجات منخفضة</span>
          </div>
          <div className="text-xl font-bold text-yellow-700">{lowStock}</div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
