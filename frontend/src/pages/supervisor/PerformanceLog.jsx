import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign,
  ClipboardList, Users, Package, AlertTriangle, Wallet,
  Target, Trash2, Calculator, Plus, Edit3, ChevronDown, ChevronUp,
  Zap, CheckCircle, XCircle, RotateCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PerformanceLog = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setError('');
    } catch (err) {
      console.error('PerformanceLog fetch error:', err);
      setError(err?.response?.data?.error || err?.message || 'فشل تحميل سجل الأداء');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

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

  const bestRecord = records.length > 0
    ? records.reduce((best, r) => parseFloat(r.efficiency_score) > parseFloat(best.efficiency_score) ? r : best, records[0])
    : null;

  const chartData = [...records].reverse().map(r => ({
    date: r.record_date?.slice(5),
    score: parseFloat(r.efficiency_score) || 0,
    profit: parseFloat(r.net_profit) || 0,
  }));

  const DiffBadge = ({ value, prefix = '', suffix = '' }) => {
    if (value === null || value === undefined) return null;
    const isPositive = value >= 0;
    return (
      <span className={`text-xs font-bold flex items-center gap-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {prefix}{isPositive ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}{suffix}
      </span>
    );
  };

  if (loading) return <div className="text-center py-8 text-gray-400">جاري تحميل سجل الأداء...</div>;

  if (error && records.length === 0) {
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
      <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <BarChart3 className="text-blue-600" size={28} /> سجل الأداء اليومي
      </h3>

      {records.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-blue-100">
              <div className="text-xs text-gray-500 mb-1">متوسط الأداء</div>
              <div className="text-2xl font-extrabold text-blue-700">{avgScore}%</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-100">
              <div className="text-xs text-gray-500 mb-1">أفضل يوم</div>
              <div className="text-lg font-extrabold text-green-700 truncate">{bestRecord?.record_date}</div>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border mb-4">
              <h4 className="font-bold text-gray-700 mb-3 text-sm">منحنى الأداء</h4>
              <div dir="ltr">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="الكفاءة" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">اختر التاريخ</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" />
        </div>
        <button onClick={handleCalculate} disabled={calculating} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors self-end disabled:opacity-50">
          <Calculator size={18} /> {calculating ? 'جاري الحساب...' : 'احسب أداء اليوم'}
        </button>
        <button onClick={() => setShowManual(!showManual)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors self-end">
          <Plus size={18} /> إضافة يدوي
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm">{success}</div>}

      {showManual && (
        <form onSubmit={handleManualSave} className="bg-white p-4 rounded-2xl shadow-sm border mb-6 space-y-3">
          <h4 className="font-bold text-gray-700 flex items-center gap-1"><Edit3 size={16} /> إدخال يدوي</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">التاريخ</label>
              <input type="date" value={manualForm.record_date} onChange={e => setManualForm({ ...manualForm, record_date: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="text-xs text-gray-500">صافي الربح</label>
              <input type="number" step="0.01" value={manualForm.net_profit} onChange={e => setManualForm({ ...manualForm, net_profit: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">إجمالي الدخل</label>
              <input type="number" step="0.01" value={manualForm.total_income} onChange={e => setManualForm({ ...manualForm, total_income: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">إجمالي المصروفات</label>
              <input type="number" step="0.01" value={manualForm.total_expenses} onChange={e => setManualForm({ ...manualForm, total_expenses: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">مهام مكتملة</label>
              <input type="number" value={manualForm.completed_tasks} onChange={e => setManualForm({ ...manualForm, completed_tasks: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">قيمة المهام</label>
              <input type="number" step="0.01" value={manualForm.tasks_value} onChange={e => setManualForm({ ...manualForm, tasks_value: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">نسبة الإنجاز %</label>
              <input type="number" value={manualForm.tasks_completion_rate} onChange={e => setManualForm({ ...manualForm, tasks_completion_rate: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">درجة الكفاءة</label>
              <input type="number" value={manualForm.efficiency_score} onChange={e => setManualForm({ ...manualForm, efficiency_score: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">السيولة الحالية</label>
              <input type="number" step="0.01" value={manualForm.current_liquidity} onChange={e => setManualForm({ ...manualForm, current_liquidity: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">قيمة المخزون</label>
              <input type="number" step="0.01" value={manualForm.inventory_value} onChange={e => setManualForm({ ...manualForm, inventory_value: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">الديون</label>
              <input type="number" step="0.01" value={manualForm.total_debts} onChange={e => setManualForm({ ...manualForm, total_debts: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">تم تحصيله</label>
              <input type="number" step="0.01" value={manualForm.collected_amount} onChange={e => setManualForm({ ...manualForm, collected_amount: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500">ملاحظات</label>
              <textarea value={manualForm.notes} onChange={e => setManualForm({ ...manualForm, notes: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" rows="2" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-xl hover:bg-green-700 transition-colors">حفظ</button>
            <button type="button" onClick={() => setShowManual(false)} className="px-4 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300 transition-colors">إلغاء</button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
          <p>لا توجد سجلات أداء بعد</p>
          <p className="text-sm">اضغط "احسب أداء اليوم" لبدء التسجيل</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record, idx) => {
            const prevRecord = idx < records.length - 1 ? records[idx + 1] : null;
            const isExpanded = expandedId === record.id;
            const score = parseFloat(record.efficiency_score) || 0;
            const netProfit = parseFloat(record.net_profit) || 0;

            return (
              <div key={record.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="p-4 cursor-pointer flex justify-between items-center" onClick={() => setExpandedId(isExpanded ? null : record.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-lg border-2 ${getScoreColor(score)}`}>{score}</div>
                    <div>
                      <div className="font-bold text-gray-800">{record.record_date}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>ربح: {netProfit.toFixed(2)} ج.م</span>
                        <span>•</span>
                        <span>مهام: {record.completed_tasks}/{record.total_tasks}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prevRecord && <DiffBadge value={parseFloat(record.efficiency_score) - parseFloat(prevRecord.efficiency_score)} suffix="%" />}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
                        <div className={`h-2.5 rounded-full ${getScoreBarColor(score)} transition-all`} style={{ width: `${score}%` }} />
                      </div>
                    </div>

                    {prevRecord && (
                      <div className="bg-gray-50 rounded-xl p-3 text-xs">
                        <div className="font-bold text-gray-600 mb-2 flex items-center gap-1"><RotateCw size={14} /> مقارنة بـ {prevRecord.record_date}</div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'الربح', val: netProfit, prev: parseFloat(prevRecord.net_profit) || 0, fmt: ' ج.م' },
                            { label: 'المهام', val: parseInt(record.completed_tasks) || 0, prev: parseInt(prevRecord.completed_tasks) || 0, fmt: '' },
                            { label: 'الكفاءة', val: score, prev: parseFloat(prevRecord.efficiency_score) || 0, fmt: '%' },
                            { label: 'المخزون', val: parseFloat(record.inventory_value) || 0, prev: parseFloat(prevRecord.inventory_value) || 0, fmt: ' ج.م' },
                          ].map((item, i) => {
                            const diff = item.val - item.prev;
                            return (
                              <div key={i} className="text-center">
                                <div className="text-gray-500 mb-0.5">{item.label}</div>
                                <div className="font-bold text-gray-700 text-sm">{item.val.toFixed(1)}{item.fmt}</div>
                                <DiffBadge value={diff} suffix={item.fmt} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        { icon: <DollarSign size={16} className="text-green-600" />, bg: 'bg-green-50', label: 'الدخل', val: parseFloat(record.total_income).toFixed(2) },
                        { icon: <TrendingDown size={16} className="text-red-600" />, bg: 'bg-red-50', label: 'المصروفات', val: parseFloat(record.total_expenses).toFixed(2) },
                        { icon: <Wallet size={16} className="text-blue-600" />, bg: 'bg-blue-50', label: 'السيولة', val: parseFloat(record.current_liquidity).toFixed(2) },
                        { icon: <ClipboardList size={16} className="text-purple-600" />, bg: 'bg-purple-50', label: 'قيمة المهام', val: parseFloat(record.tasks_value).toFixed(2) },
                        { icon: <Users size={16} className="text-orange-600" />, bg: 'bg-orange-50', label: 'عمال نشطاء', val: record.active_workers },
                        { icon: <Target size={16} className="text-teal-600" />, bg: 'bg-teal-50', label: 'مهام/عامل', val: parseFloat(record.avg_tasks_per_worker).toFixed(1) },
                        { icon: <Package size={16} className="text-indigo-600" />, bg: 'bg-indigo-50', label: 'قيمة المخزون', val: parseFloat(record.inventory_value).toFixed(2) },
                        { icon: <AlertTriangle size={16} className="text-amber-600" />, bg: 'bg-amber-50', label: 'منتجات منخفضة', val: record.low_stock_count },
                        { icon: <XCircle size={16} className="text-rose-600" />, bg: 'bg-rose-50', label: 'هالك', val: parseFloat(record.spoilage_cost).toFixed(2) },
                        { icon: <DollarSign size={16} className="text-cyan-600" />, bg: 'bg-cyan-50', label: 'الديون', val: parseFloat(record.total_debts).toFixed(2) },
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
  );
};

export default PerformanceLog;
