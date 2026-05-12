import { useState, useEffect } from 'react';
import api from '../../services/api';
import { TrendingUp, TrendingDown, CheckCircle, XCircle, Users, Package, DollarSign, Wallet, ClipboardList, AlertTriangle, BarChart3, RefreshCw } from 'lucide-react';

const PerformanceReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/performance');
      setData(res?.data || null);
    } catch (err) {
      console.error('PerformanceReport fetch error:', err);
      setError(err?.response?.data?.error || err?.message || 'فشل تحميل تقرير الأداء');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="text-center py-8 text-gray-400">جاري تحميل تقرير الأداء...</div>;

  if (error) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 mx-auto">
          <RefreshCw size={16} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!data) return <div className="text-center py-8 text-gray-400">لا توجد بيانات متاحة</div>;

  const { financial, tasks, workers, inventory, receivers, recent_logs } = data;

  const completionRate = tasks.total_tasks > 0 ? Math.round((tasks.completed_tasks / tasks.total_tasks) * 100) : 0;
  const cancelRate = tasks.total_tasks > 0 ? Math.round((tasks.cancelled_tasks / tasks.total_tasks) * 100) : 0;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <BarChart3 className="text-blue-600" size={28} /> تقرير الأداء
      </h3>

      {/* المؤشرات المالية */}
      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1"><DollarSign size={18} className="text-green-600" /> المؤشرات المالية</h4>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <TrendingUp size={16} className="text-green-600" />
            <span className="text-xs">إجمالي الدخل</span>
          </div>
          <div className="text-xl font-extrabold text-green-700">{parseFloat(financial.total_income).toFixed(1)} ج.م</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <TrendingDown size={16} className="text-red-600" />
            <span className="text-xs">إجمالي المصروفات</span>
          </div>
          <div className="text-xl font-extrabold text-red-700">{parseFloat(financial.total_outcome).toFixed(1)} ج.م</div>
        </div>
        <div className="col-span-2 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-1 text-gray-600 mb-1">
            <Wallet size={16} className="text-blue-600" />
            <span className="text-xs">صافي الربح</span>
          </div>
          <div className={`text-2xl font-extrabold ${parseFloat(financial.net_profit) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {parseFloat(financial.net_profit).toFixed(1)} ج.م
          </div>
        </div>
      </div>

      {/* مؤشرات المهام */}
      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1"><ClipboardList size={18} className="text-purple-600" /> مؤشرات المهام</h4>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">إجمالي المهام</div>
          <div className="text-2xl font-bold text-gray-800">{tasks.total_tasks}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">المكتملة</div>
          <div className="text-2xl font-bold text-green-700 flex items-center gap-1">{tasks.completed_tasks} <CheckCircle size={18} /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">نسبة الإنجاز</div>
          <div className="text-2xl font-bold text-blue-700">{completionRate}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div className={`h-2 rounded-full ${completionRate >= 50 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">نسبة الإلغاء</div>
          <div className="text-2xl font-bold text-red-700 flex items-center gap-1">{cancelRate}% <XCircle size={18} /></div>
        </div>
        <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">قيمة المهام المنجزة</div>
          <div className="text-2xl font-bold text-gray-800">{parseFloat(tasks.completed_value).toFixed(1)} ج.م</div>
        </div>
      </div>

      {/* أداء العمال */}
      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1"><Users size={18} className="text-orange-600" /> أداء العمال</h4>
      {workers.length === 0 ? (
        <p className="text-gray-400 text-center py-4">لا يوجد عمال</p>
      ) : (
        <div className="space-y-3 mb-6">
          {[...workers].sort((a, b) => a.username?.localeCompare(b.username, 'ar')).map(w => {
            const rate = w.total_tasks > 0 ? Math.round((w.completed_tasks / w.total_tasks) * 100) : 0;
            return (
              <div key={w.id} className="bg-white p-4 rounded-2xl shadow-sm border">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-800">{w.username}</span>
                  <span className="text-sm text-gray-500">{w.completed_tasks}/{w.total_tasks} مهمة</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>ملغية: {w.cancelled_tasks}</span>
                  <span>قيمة: {parseFloat(w.total_value).toFixed(1)} ج.م</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full ${rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* المخزون */}
      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1"><Package size={18} className="text-indigo-600" /> المخزون</h4>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">إجمالي المنتجات</div>
          <div className="text-2xl font-bold text-gray-800">{inventory.total_products}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">منتجات منخفضة</div>
          <div className="text-2xl font-bold text-red-700 flex items-center gap-1">{inventory.low_stock_count} <AlertTriangle size={18} /></div>
        </div>
        <div className="col-span-2 bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">قيمة المخزون (بسعر الشراء)</div>
          <div className="text-2xl font-bold text-gray-800">{parseFloat(inventory.inventory_value).toFixed(1)} ج.م</div>
        </div>
      </div>

      {/* التعاملات */}
      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1"><Users size={18} className="text-teal-600" /> التعاملات والديون</h4>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">ديون علينا</div>
          <div className="text-xl font-bold text-red-700">{parseFloat(receivers.total_debts_on_us).toFixed(1)} ج.م</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border">
          <div className="text-xs text-gray-500">محصل من الناس</div>
          <div className="text-xl font-bold text-green-700">{parseFloat(receivers.total_money_collected).toFixed(1)} ج.م</div>
        </div>
      </div>

      {/* آخر الأنشطة */}
      <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1"><TrendingUp size={18} className="text-amber-600" /> آخر الأرباح والخسائر</h4>
      <div className="space-y-2 mb-6">
        {recent_logs.length === 0 ? (
          <p className="text-gray-400 text-center">لا توجد سجلات</p>
        ) : (
          recent_logs.map((log, idx) => (
            <div key={idx} className="bg-white p-3 rounded-2xl shadow-sm border flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-500">{log.description}</span>
                <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString('ar-EG')}</p>
              </div>
              <span className={`font-bold ${['profit','revenue'].includes(log.entry_type) ? 'text-green-600' : 'text-red-600'}`}>
                {['profit','revenue'].includes(log.entry_type) ? '+' : '-'}{log.amount} ج.م
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PerformanceReport;
