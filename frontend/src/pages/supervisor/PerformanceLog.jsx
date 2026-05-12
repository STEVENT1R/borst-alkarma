import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ClipboardList, Users, Package, AlertTriangle, Wallet,
  Target, Trash2, Calculator, Plus, Edit3,
  Zap, CheckCircle, XCircle, RotateCw,
  CalendarDays, CalendarRange, ChevronDown, ChevronUp,
  Scale, Printer
} from 'lucide-react';

const PRESETS = [
  { label: 'اليوم', days: 0 },
  { label: 'آخر 7 أيام', days: 7 },
  { label: 'آخر 30 يوم', days: 30 },
  { label: 'آخر 90 يوم', days: 90 },
  { label: 'هذا الشهر', days: 'month' },
  { label: 'الشهر الماضي', days: 'last_month' },
  { label: 'مخصص', days: 'custom' },
];

const PerformanceLog = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // فترة التقرير
  const [selectedPreset, setSelectedPreset] = useState('اليوم');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCustom, setShowCustom] = useState(false);

  // بيانات التقرير
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // حالة سجل الأداء
  const [calculating, setCalculating] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showManual, setShowManual] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [manualForm, setManualForm] = useState({
    record_date: new Date().toISOString().split('T')[0],
    total_income: 0, total_expenses: 0, net_profit: 0,
    total_tasks: 0, completed_tasks: 0, cancelled_tasks: 0, tasks_completion_rate: 0, tasks_value: 0,
    active_workers: 0, avg_tasks_per_worker: 0,
    inventory_value: 0, low_stock_count: 0,
    spoilage_cost: 0, total_debts: 0, collected_amount: 0, current_liquidity: 0,
    efficiency_score: 0, notes: ''
  });

  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/performance/log');
      setRecords(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error('PerformanceLog fetch error:', err);
      setError(err?.response?.data?.error || err?.message || 'فشل تحميل سجل الأداء');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  // تعيين الفترة حسب الاختيار
  const applyPreset = (preset) => {
    setSelectedPreset(preset.label);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset.days === 0) {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setShowCustom(false);
    } else if (preset.days === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setShowCustom(false);
    } else if (preset.days === 'last_month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(first.toISOString().split('T')[0]);
      setEndDate(last.toISOString().split('T')[0]);
      setShowCustom(false);
    } else if (preset.days === 'custom') {
      setShowCustom(true);
    } else if (typeof preset.days === 'number') {
      const past = new Date(today);
      past.setDate(past.getDate() - preset.days);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setShowCustom(false);
    }
  };

  useEffect(() => {
    // أول تحميل - اختيار اليوم تلقائياً
    applyPreset({ label: 'اليوم', days: 0 });
  }, []);

  // جلب التقرير
  const fetchReport = async () => {
    if (!startDate || !endDate) {
      setError('اختر تاريخ البداية والنهاية');
      return;
    }
    if (startDate > endDate) {
      setError('تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية');
      return;
    }
    setReportLoading(true);
    setError('');
    try {
      const res = await api.get('/performance/period', {
        params: { start_date: startDate, end_date: endDate }
      });
      setReportData(res?.data || null);
      setSuccess(`تم جلب تقرير الفترة من ${startDate} إلى ${endDate}`);
    } catch (err) {
      console.error('Period report error:', err);
      setError(err?.response?.data?.error || err?.message || 'فشل جلب تقرير الفترة');
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate && !showCustom) {
      fetchReport();
    }
  }, [startDate, endDate, showCustom]);

  // حساب سجل يومي
  const handleCalculate = async () => {
    if (!selectedDate) return setError('اختر تاريخ أولاً');
    setCalculating(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/performance/log/calculate', { record_date: selectedDate });
      setSuccess(`تم حساب وحفظ أداء يوم ${selectedDate}`);
      fetchRecords();
    } catch (err) {
      setError('فشل حساب الأداء');
    } finally {
      setCalculating(false);
    }
  };

  const handleManualSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/performance/log/manual', manualForm);
      setSuccess(`تم حفظ سجل يوم ${manualForm.record_date}`);
      setShowManual(false);
      fetchRecords();
    } catch (err) {
      setError('فشل الحفظ');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await api.delete(`/performance/log/${id}`);
      setSuccess('تم الحذف');
      fetchRecords();
    } catch (err) {
      setError('فشل الحذف');
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreBarColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const avgScore = records.length > 0
    ? Math.round(records.reduce((s, r) => s + parseFloat(r.efficiency_score), 0) / records.length)
    : 0;

  // صيغة الأرقام - أرقام إنجليزية صحيحة بدون كسور
  const fmtNum = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '0';
    return Math.round(n).toLocaleString('en-US');
  };


  if (loading) return <div className="text-center py-8 text-gray-400">جاري تحميل سجل الأداء...</div>;

  if (error && records.length === 0 && !reportData) {
    return (
      <div className="text-center py-12">
        <BarChart3 size={48} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchRecords} className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 mx-auto">
          <RotateCw size={16} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* استايلات الطباعة */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #performance-report, #performance-report * { visibility: visible !important; }
          #performance-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
          }
          #performance-report button { display: none !important; }
          #performance-report .bg-gradient-to-br { break-inside: avoid !important; }
        }
      `}</style>
      <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <Scale className="text-purple-600" size={28} /> الجرد والتقارير
      </h3>

      {/* ====== اختيار الفترة ====== */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border mb-6">
        <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-1">
          <CalendarRange size={18} className="text-purple-600" /> اختر الفترة
        </h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                selectedPreset === p.label
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <button onClick={fetchReport} disabled={reportLoading}
              className="bg-purple-600 text-white px-5 py-2 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1">
              <Calculator size={16} /> {reportLoading ? 'جاري...' : 'عرض التقرير'}
            </button>
          </div>
        )}
      </div>

      {/* ====== تقرير الفترة ====== */}
      {reportLoading && (
        <div className="text-center py-8 text-gray-400">جاري حساب تقرير الفترة...</div>
      )}

      {reportData && !reportLoading && (
        <div className="space-y-4 mb-6" id="performance-report">
          {/* عنوان الفترة + زرار الطباعة */}
          <div className="flex items-center justify-between bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-2xl shadow-sm border border-purple-100">
            <div>
              <div className="flex items-center gap-2 text-purple-700 mb-1">
                <CalendarDays size={18} />
                <span className="font-bold">تقرير الفترة</span>
              </div>
              <div className="text-sm text-purple-600">
                من {reportData.period?.start_date} إلى {reportData.period?.end_date}
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-1"
              title="طباعة التقرير"
            >
              <Printer size={20} />
            </button>
          </div>

          {/* النقدية - التغير */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={20} className="text-blue-600" />
              <span className="font-bold text-gray-700">النقدية في الخزنة</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-gray-500 mb-1">بداية الفترة</div>
                <div className="text-lg font-extrabold text-gray-700">{fmtNum(reportData.liquidity?.before)} ج.م</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">نهاية الفترة</div>
                <div className="text-lg font-extrabold text-gray-700">{fmtNum(reportData.liquidity?.after)} ج.م</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">التغير</div>
                <div className={`text-lg font-extrabold flex items-center justify-center gap-1 ${
                  parseFloat(reportData.liquidity?.change) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(reportData.liquidity?.change) >= 0
                    ? <TrendingUp size={18} />
                    : <TrendingDown size={18} />
                  }
                  {fmtNum(Math.abs(parseFloat(reportData.liquidity?.change)))} ج.م
                </div>
              </div>
            </div>
          </div>

          {/* تكلفة البضاعة وصافي الإيراد وصافي الربح */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 p-4 rounded-2xl shadow-sm border border-cyan-200">
              <div className="flex items-center gap-1 text-cyan-700 mb-2">
                <Package size={18} />
                <span className="font-bold text-sm">تكلفة البضاعة</span>
              </div>
              <div className="text-xl font-extrabold text-cyan-700">{fmtNum(reportData.financial?.cogs)} ج.م</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-200">
              <div className="flex items-center gap-1 text-green-700 mb-2">
                <TrendingUp size={18} />
                <span className="font-bold text-sm">صافي الإيراد</span>
              </div>
              <div className="text-xl font-extrabold text-green-700">{fmtNum(reportData.financial?.net_revenue)} ج.م</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-2xl shadow-sm border border-yellow-200">
              <div className="flex items-center gap-1 text-amber-700 mb-2">
                <DollarSign size={18} />
                <span className="font-bold text-sm">صافي الربح</span>
              </div>
              <div className={`text-xl font-extrabold ${
                parseFloat(reportData.financial?.net_profit) >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {fmtNum(reportData.financial?.net_profit)} ج.م
              </div>
            </div>
          </div>


          {/* إجمالي الخسائر */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-2xl shadow-sm border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={18} className="text-red-600" />
              <span className="font-bold text-gray-700">إجمالي الخسائر</span>
            </div>
            <div className="text-xl font-extrabold text-red-700 mb-2">{fmtNum(reportData.financial?.total_losses)} ج.م</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-red-50 p-2 rounded-xl">
                <div className="text-xs text-gray-500">مصروفات</div>
                <div className="font-bold text-red-700">{fmtNum(reportData.financial?.expenses)} ج.م</div>
              </div>
              <div className="bg-amber-50 p-2 rounded-xl">
                <div className="text-xs text-gray-500">مرتبات</div>
                <div className="font-bold text-amber-700">{fmtNum(reportData.financial?.salaries)} ج.م</div>
              </div>
              <div className="bg-orange-50 p-2 rounded-xl">
                <div className="text-xs text-gray-500">هالك</div>
                <div className="font-bold text-orange-700">{fmtNum(reportData.financial?.spoilage)} ج.م</div>
              </div>
              <div className="bg-purple-50 p-2 rounded-xl">
                <div className="text-xs text-gray-500">مشتريات</div>
                <div className="font-bold text-purple-700">{fmtNum(reportData.financial?.purchase_cost)} ج.م</div>
              </div>
            </div>
          </div>

          {/* المخزون - قبل وبعد الفترة */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border-2 border-blue-300">
            <div className="flex items-center gap-2 mb-3">
              <Package size={18} className="text-blue-600" />
              <span className="font-bold text-gray-700">المخزون</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* أول الفترة */}
              <div className="p-3 rounded-xl border border-blue-200">
                <div className="text-xs text-blue-600 mb-1 font-bold">🔹 أول الفترة</div>
                <div className="font-extrabold text-blue-700 text-lg">{fmtNum(reportData.inventory?.before?.value)} ج.م</div>
                <div className="text-xs text-gray-500">عدد المنتجات: <span className="font-bold text-gray-700">{reportData.inventory?.before?.total_products}</span></div>
              </div>
              {/* آخر الفترة */}
              <div className="p-3 rounded-xl border border-blue-300">
                <div className="text-xs text-blue-600 mb-1 font-bold">🔸 آخر الفترة</div>
                <div className="font-extrabold text-blue-700 text-lg">{fmtNum(reportData.inventory?.after?.value)} ج.م</div>
                <div className="text-xs text-gray-500">عدد المنتجات: <span className="font-bold text-gray-700">{reportData.inventory?.after?.total_products}</span></div>
              </div>
            </div>
            <div className="mt-2 text-center text-xs">
              {(reportData.inventory?.low_stock_count || 0) > 0 ? (
                <span className="text-red-600 font-bold">منتجات منخفضة: {reportData.inventory?.low_stock_count}</span>
              ) : (
                <span className="text-green-600">لا توجد منتجات منخفضة</span>
              )}
            </div>
          </div>

          {/* الديون - لينا عند الناس وعلينا للموردين */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-teal-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={18} className="text-teal-600" />
                <span className="font-bold text-gray-700">لينا عند الناس</span>
              </div>
              <div className="text-xl font-extrabold text-teal-700 mb-2">{fmtNum(reportData.debts?.net_receivable)} ج.م</div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-teal-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">إجمالي المديونيات</div>
                  <div className="font-bold text-teal-700">{fmtNum(reportData.debts?.owed_to_us)} ج.م</div>
                </div>
                <div className="bg-emerald-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">تم تحصيله</div>
                  <div className="font-bold text-emerald-700">{fmtNum(reportData.debts?.collected)} ج.م</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-red-50 p-4 rounded-2xl shadow-sm border border-rose-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={18} className="text-rose-600" />
                <span className="font-bold text-gray-700">علينا للموردين</span>
              </div>
              <div className="text-xl font-extrabold text-rose-700 mb-2">{fmtNum(reportData.debts?.purchase_debt)} ج.م</div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-rose-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">فواتير غير مسددة</div>
                  <div className="font-bold text-rose-700">{reportData.debts?.unpaid_invoices || 0}</div>
                </div>
                <div className="bg-red-50 p-2 rounded-xl">
                  <div className="text-xs text-gray-500">المتبقي</div>
                  <div className="font-bold text-red-700">{fmtNum(reportData.debts?.purchase_debt)} ج.م</div>
                </div>
              </div>
            </div>
          </div>

          {/* المهام */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl shadow-sm border border-orange-200">

            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={18} className="text-orange-600" />
              <span className="font-bold text-gray-700">المهام</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xs text-gray-500">إجمالي المهام</div>
                <div className="text-lg font-extrabold text-gray-700">{reportData.tasks?.total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">مكتملة</div>
                <div className="text-lg font-extrabold text-green-700">{reportData.tasks?.completed}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ملغية</div>
                <div className="text-lg font-extrabold text-red-600">{reportData.tasks?.cancelled}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">نسبة الإنجاز</div>
                <div className="text-lg font-extrabold text-blue-700">{reportData.tasks?.completion_rate}%</div>
              </div>
            </div>
            <div className="mt-2 bg-white rounded-xl p-2 text-center">
              <span className="text-xs text-gray-500">قيمة المهام المنجزة: </span>
              <span className="font-bold text-gray-800">{fmtNum(reportData.tasks?.value)} ج.م</span>
            </div>
          </div>

          {/* العمال النشطاء */}
          <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-teal-200">
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="text-teal-600" />
              <span className="font-bold text-gray-700">العمال النشطاء</span>
            </div>
            <div className="text-2xl font-extrabold text-teal-700">{reportData.active_workers || 0}</div>
          </div>
        </div>
      )}

      {/* الأخطاء والنجاحات */}
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm">{success}</div>}

      {/* ====== قسم الجرد ====== */}
      <div className="border-t pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-bold text-gray-800 flex items-center gap-1">
            <BarChart3 size={20} className="text-blue-600" /> الجرد
          </h4>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">حساب جرد يوم محدد</label>

            <input type="date" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm" />
          </div>
          <button onClick={handleCalculate} disabled={calculating}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors self-end disabled:opacity-50">
            <Calculator size={18} /> {calculating ? 'جاري الحساب...' : 'احسب أداء اليوم'}
          </button>
          <button onClick={() => setShowManual(!showManual)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors self-end">
            <Plus size={18} /> إضافة يدوي
          </button>
        </div>

        {showManual && (
          <form onSubmit={handleManualSave}
            className="bg-white p-4 rounded-2xl shadow-sm border mb-6 space-y-3">
            <h4 className="font-bold text-gray-700 flex items-center gap-1"><Edit3 size={16} /> إدخال يدوي</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">التاريخ</label>
                <input type="date" value={manualForm.record_date}
                  onChange={e => setManualForm({ ...manualForm, record_date: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="text-xs text-gray-500">صافي الربح</label>
                <input type="number" step="0.01" value={manualForm.net_profit}
                  onChange={e => setManualForm({ ...manualForm, net_profit: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">إجمالي الدخل</label>
                <input type="number" step="0.01" value={manualForm.total_income}
                  onChange={e => setManualForm({ ...manualForm, total_income: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">إجمالي المصروفات</label>
                <input type="number" step="0.01" value={manualForm.total_expenses}
                  onChange={e => setManualForm({ ...manualForm, total_expenses: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">مهام مكتملة</label>
                <input type="number" value={manualForm.completed_tasks}
                  onChange={e => setManualForm({ ...manualForm, completed_tasks: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">قيمة المهام</label>
                <input type="number" step="0.01" value={manualForm.tasks_value}
                  onChange={e => setManualForm({ ...manualForm, tasks_value: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">نسبة الإنجاز %</label>
                <input type="number" value={manualForm.tasks_completion_rate}
                  onChange={e => setManualForm({ ...manualForm, tasks_completion_rate: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">درجة الكفاءة</label>
                <input type="number" value={manualForm.efficiency_score}
                  onChange={e => setManualForm({ ...manualForm, efficiency_score: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">السيولة الحالية</label>
                <input type="number" step="0.01" value={manualForm.current_liquidity}
                  onChange={e => setManualForm({ ...manualForm, current_liquidity: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">قيمة المخزون</label>
                <input type="number" step="0.01" value={manualForm.inventory_value}
                  onChange={e => setManualForm({ ...manualForm, inventory_value: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">الديون</label>
                <input type="number" step="0.01" value={manualForm.total_debts}
                  onChange={e => setManualForm({ ...manualForm, total_debts: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">تم تحصيله</label>
                <input type="number" step="0.01" value={manualForm.collected_amount}
                  onChange={e => setManualForm({ ...manualForm, collected_amount: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500">ملاحظات</label>
                <textarea value={manualForm.notes}
                  onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2 text-sm" rows="2" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition-colors">حفظ</button>
              <button type="button" onClick={() => setShowManual(false)}
                className="px-4 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition-colors">إلغاء</button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-500">متوسط الأداء:</span>
          <span className={`font-bold ${avgScore >= 50 ? 'text-green-600' : 'text-red-600'}`}>{avgScore}%</span>
          <span className="text-xs text-gray-400 mr-2">({records.length} يوم)</span>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
            <p>لا توجد سجلات أداء بعد</p>
            <p className="text-sm">استخدم زر "احسب أداء اليوم" لبدء التسجيل</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record, idx) => {
              const prevRecord = idx < records.length - 1 ? records[idx + 1] : null;
              const isExpanded = expandedId === record.id;
              const score = parseFloat(record.efficiency_score) || 0;
              const netProfit = parseFloat(record.net_profit) || 0;

              return (
                <div key={record.id}
                  className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="p-4 cursor-pointer flex justify-between items-center"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg border-2 ${getScoreColor(score)}`}>
                        {score}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{record.record_date}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>ربح: {fmtNum(netProfit)} ج.م</span>

                          <span>•</span>
                          <span>مهام: {record.completed_tasks}/{record.total_tasks}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                      {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t pt-3 space-y-3">
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>درجة الأداء</span>
                          <span className="font-bold">{score}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${getScoreBarColor(score)} transition-all`}
                            style={{ width: `${score}%` }} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          { icon: <DollarSign size={16} className="text-green-600" />, bg: 'bg-green-50', label: 'الدخل', val: fmtNum(record.total_income) },
                          { icon: <TrendingDown size={16} className="text-red-600" />, bg: 'bg-red-50', label: 'المصروفات', val: fmtNum(record.total_expenses) },
                          { icon: <Wallet size={16} className="text-blue-600" />, bg: 'bg-blue-50', label: 'السيولة', val: fmtNum(record.current_liquidity) },
                          { icon: <ClipboardList size={16} className="text-purple-600" />, bg: 'bg-purple-50', label: 'قيمة المهام', val: fmtNum(record.tasks_value) },
                          { icon: <Users size={16} className="text-orange-600" />, bg: 'bg-orange-50', label: 'عمال نشطاء', val: record.active_workers },
                          { icon: <Target size={16} className="text-teal-600" />, bg: 'bg-teal-50', label: 'مهام/عامل', val: Math.round(parseFloat(record.avg_tasks_per_worker)) },
                          { icon: <Package size={16} className="text-indigo-600" />, bg: 'bg-indigo-50', label: 'قيمة المخزون', val: fmtNum(record.inventory_value) },
                          { icon: <AlertTriangle size={16} className="text-amber-600" />, bg: 'bg-amber-50', label: 'منتجات منخفضة', val: record.low_stock_count },
                          { icon: <XCircle size={16} className="text-rose-600" />, bg: 'bg-rose-50', label: 'هالك', val: fmtNum(record.spoilage_cost) },
                          { icon: <DollarSign size={16} className="text-cyan-600" />, bg: 'bg-cyan-50', label: 'الديون', val: fmtNum(record.total_debts) },

                        ].map((item, i) => (
                          <div key={i} className={`${item.bg} p-2 rounded-xl flex items-center gap-2`}>
                            {item.icon}
                            <div>
                              <div className="text-xs text-gray-500">{item.label}</div>
                              <div className="font-bold text-gray-700">{item.val}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {record.notes && (
                        <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600">
                          <span className="font-bold text-gray-700">ملاحظات: </span>{record.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceLog;
