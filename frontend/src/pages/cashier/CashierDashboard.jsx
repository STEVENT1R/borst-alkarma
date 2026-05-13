import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRegisterRefresh } from '../../context/RefreshContext';
import api from '../../services/api';
import { ShoppingCart, Package, DollarSign, TrendingUp, ClipboardList } from 'lucide-react';

const CashierDashboard = () => {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState({ total_count: 0, total_sales: 0, total_profit: 0 });
  const [inventoryCount, setInventoryCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [todayRes, inventoryRes] = await Promise.all([
        api.get('/sales/today'),
        api.get('/sales/shop-inventory'),
      ]);
      // Defensive parse: ensure numeric fields are actual numbers (pg can return strings for numeric types)
      const stats = todayRes.data;
      setTodayStats({
        total_count: parseInt(stats.total_count) || 0,
        total_sales: parseFloat(stats.total_sales) || 0,
        total_profit: parseFloat(stats.total_profit) || 0,
      });
      setInventoryCount(inventoryRes.data.length);

    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useRegisterRefresh(fetchDashboardData);

  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800">{user?.username}</h3>
        <p className="text-gray-400 text-sm">نظام الكاشير - إدارة المبيعات والمخزن</p>
      </div>

      {/* إحصائيات اليوم */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-600 to-green-500 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={20} />
            <span className="text-sm font-bold opacity-90">مبيعات اليوم</span>
          </div>
          <div className="text-2xl font-extrabold">
            {loading ? '...' : `${todayStats.total_sales.toFixed(1)} ج`}
          </div>
          <div className="text-xs opacity-75 mt-1">
            {todayStats.total_count} عملية بيع
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} />
            <span className="text-sm font-bold opacity-90">صافي الربح</span>
          </div>
          <div className="text-2xl font-extrabold">
            {loading ? '...' : `${todayStats.total_profit.toFixed(1)} ج`}
          </div>
          <div className="text-xs opacity-75 mt-1">
            أرباح اليوم
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-600 to-amber-500 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Package size={20} />
            <span className="text-sm font-bold opacity-90">المنتجات</span>
          </div>
          <div className="text-2xl font-extrabold">
            {loading ? '...' : inventoryCount}
          </div>
          <div className="text-xs opacity-75 mt-1">
            صنف في المخزن
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-500 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={20} />
            <span className="text-sm font-bold opacity-90">متوسط البيع</span>
          </div>
          <div className="text-2xl font-extrabold">
            {loading ? '...' : todayStats.total_count > 0 
              ? `${(todayStats.total_sales / todayStats.total_count).toFixed(1)} ج`
              : '0.00 ج'}
          </div>
          <div className="text-xs opacity-75 mt-1">
            لكل عملية
          </div>
        </div>
      </div>

      {/* روابط سريعة */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <a
          href="/cashier/sales"
          className="bg-white border border-green-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <ShoppingCart size={24} className="text-green-600" />
          </div>
          <span className="font-bold text-gray-700">قسم البيع</span>
          <span className="text-xs text-gray-400 text-center">تسجيل عملية بيع جديدة</span>
        </a>

        <a
          href="/cashier/inventory"
          className="bg-white border border-blue-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Package size={24} className="text-blue-600" />
          </div>
          <span className="font-bold text-gray-700">قسم المخزن</span>
          <span className="text-xs text-gray-400 text-center">إدارة مخزن المحل</span>
        </a>
      </div>

      {/* آخر المبيعات */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={18} className="text-green-600" />
          <span className="font-bold text-gray-700">آخر المبيعات</span>
        </div>
        <RecentSales />
      </div>
    </div>
  );
};

const RecentSales = () => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    api.get('/sales').then(res => setSales(res.data.slice(0, 5))).catch(console.error);
  }, []);

  if (sales.length === 0) {
    return <p className="text-gray-400 text-center py-4 text-sm">لا توجد مبيعات مسجلة</p>;
  }

  const toNum = (val) => parseFloat(val) || 0;

  return (
    <div className="space-y-2">
      {sales.map(sale => (
        <div key={sale.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
          <div>
            <span className="font-medium">{sale.product_name}</span>
            <span className="text-gray-400 mr-2 text-xs">
              ×{sale.quantity} {sale.unit_type === 'weight' ? 'كجم' : 'قطعة'}
            </span>
          </div>
          <div className="text-right">
            <div className="font-bold text-green-600">{toNum(sale.total_amount).toFixed(1)} ج</div>
            <div className="text-xs text-gray-400">ربح: {toNum(sale.profit_amount).toFixed(1)} ج</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CashierDashboard;
