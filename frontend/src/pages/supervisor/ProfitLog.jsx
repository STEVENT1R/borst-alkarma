import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, AlertTriangle, ShoppingCart, Users, ArrowLeft, RefreshCw, Calendar, ChevronDown, ChevronLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';


const ProfitLog = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ entry_type: 'expense', amount: '', description: '' });
  const [expandedDays, setExpandedDays] = useState({});

  const toggleDay = (day) => {
    setExpandedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        api.get('/profit'),
        api.get('/profit/summary'),
      ]);
      setEntries(Array.isArray(entriesRes?.data) ? entriesRes.data : []);
      setSummary(summaryRes?.data || {});
    } catch (err) {
      console.error('ProfitLog fetch error:', err);
      setError(err?.response?.data?.error || err?.message || 'فشل تحميل البيانات');
      setEntries([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/profit', form);
      setForm({ entry_type: 'expense', amount: '', description: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'فشل الحفظ');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذا البند؟')) return;
    try {
      await api.delete(`/profit/${id}`);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || 'فشل الحذف');
    }
  };

  // بيانات الرسم البياني للدائرة
  const parseNum = (val) => parseFloat(val) || 0;

  const summaryData = summary || {};
  const pieData = [
    { name: 'صافي الربح', value: Math.max(0, parseNum(summaryData.total_profit)), color: '#22c55e' },
    { name: 'مرتبات', value: parseNum(summaryData.total_salaries), color: '#ef4444' },
    { name: 'مشتريات', value: parseNum(summaryData.total_purchases), color: '#f97316' },
    { name: 'مصروفات', value: parseNum(summaryData.total_expenses), color: '#dc2626' },
    { name: 'هالك', value: parseNum(summaryData.total_spoilage), color: '#eab308' },
  ].filter(d => d.value > 0);

  const formatCurrency = (val) => {
    const n = parseFloat(val) || 0;
    return n.toFixed(1);
  };

  if (loading) return <div className="text-center py-12 text-gray-400">جاري التحميل...</div>;

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle size={48} className="mx-auto mb-3 text-red-400" />
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded-xl flex items-center gap-2 mx-auto">
          <RefreshCw size={16} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/reports')} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="text-yellow-600" size={28} /> سجل الربح والمصروفات
        </h3>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl shadow-sm border border-green-100">
          <div className="text-xs text-gray-500">صافي الربح (محاسبي)</div>
          <div className="text-lg font-extrabold text-green-700">{formatCurrency(summaryData.total_profit)} ج.م</div>
          <div className="text-[10px] text-gray-400 mt-0.5">قيمة المهمات كلها - التكلفة</div>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-teal-100">
          <div className="text-xs text-gray-500">النقدية (الخزنة)</div>
          <div className="text-lg font-extrabold text-teal-700">{formatCurrency(summaryData.current_liquidity)} ج.م</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl shadow-sm border border-blue-100">
          <div className="text-xs text-gray-500">الإيراد النقدي</div>
          <div className="font-bold text-blue-700">{formatCurrency(summaryData.total_revenue)} ج.م</div>
          <div className="text-[10px] text-gray-400 mt-0.5">الفلوس اللي دخلت فعلياً</div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-2xl shadow-sm border border-red-100">
          <div className="text-xs text-gray-500">إجمالي المصروفات</div>
          <div className="font-bold text-red-700">{formatCurrency(parseNum(summaryData.total_expenses) + parseNum(summaryData.total_salaries) + parseNum(summaryData.total_spoilage) + parseNum(summaryData.total_purchases))} ج.م</div>
        </div>

      </div>

      {/* توزيع المصروفات */}
      {pieData.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border mb-4">
          <h4 className="font-bold text-gray-700 mb-3 text-sm">توزيع الأرباح والمصروفات</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${parseFloat(value).toFixed(1)} ج.م`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-3 rounded-xl font-bold"
      >
        <Plus size={18} /> {showForm ? 'إلغاء' : 'إضافة بند جديد'}
      </button>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-sm border mb-6 space-y-3">
          <h4 className="font-bold text-gray-700">تسجيل بند جديد</h4>
          <div>
            <label className="text-xs text-gray-500">النوع</label>
            <select value={form.entry_type} onChange={e => setForm({...form, entry_type: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm">
              <option value="opening_balance">رصيد افتتاحي</option>
              <option value="revenue">إيراد (دخل)</option>
              <option value="expense">مصروف</option>
              <option value="profit">ربح صافي</option>
              <option value="spoilage">هالك</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">المبلغ</label>
            <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="text-xs text-gray-500">الوصف (اختياري)</label>
            <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="وصف البند" />
          </div>
          <button type="submit" className="w-full bg-yellow-600 text-white py-2 rounded-xl hover:bg-yellow-700 transition-colors font-bold">
            حفظ
          </button>
        </form>
      )}

      {!entries || entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <DollarSign size={48} className="mx-auto mb-3 text-gray-300" />
          <p>لا توجد بنود مسجلة</p>
        </div>
      ) : (
        (() => {
          // تجميع البنود باليوم
          const grouped = {};
          entries.forEach(entry => {
            const dayKey = new Date(entry.created_at).toLocaleDateString('ar-EG');
            if (!grouped[dayKey]) grouped[dayKey] = [];
            grouped[dayKey].push(entry);
          });

          const labels = {
            profit: 'ربح', revenue: 'إيراد', salary_payment: 'مرتبات',
            spoilage: 'هالك', expense: 'مصروفات', purchase: 'مشتريات',
            cogs: 'تكلفة بضاعة', opening_balance: 'رصيد افتتاحي'
          };
          const icons = {
            profit: <TrendingUp size={16} className="text-green-600" />,
            revenue: <TrendingUp size={16} className="text-blue-600" />,
            expense: <TrendingDown size={16} className="text-red-600" />,
            spoilage: <AlertTriangle size={16} className="text-orange-600" />,
            salary_payment: <Users size={16} className="text-purple-600" />,
            purchase: <ShoppingCart size={16} className="text-cyan-600" />,
            cogs: <TrendingDown size={16} className="text-amber-600" />,
            opening_balance: <DollarSign size={16} className="text-teal-600" />,
          };
          const isPositiveType = (type) => ['profit', 'revenue', 'sale_revenue', 'opening_balance'].includes(type);

          return Object.entries(grouped).map(([day, dayEntries]) => {
            // حساب ملخص اليوم
            const dayIncome = dayEntries.reduce((sum, e) => sum + (isPositiveType(e.entry_type) ? (parseFloat(e.amount) || 0) : 0), 0);
            const dayOutcome = dayEntries.reduce((sum, e) => sum + (!isPositiveType(e.entry_type) ? (parseFloat(e.amount) || 0) : 0), 0);
            const dayNet = dayIncome - dayOutcome;
            const isOpen = expandedDays[day] !== false; // default open

            return (
              <div key={day} className="mb-3">
                {/* عنوان اليوم - قابل للضغط */}
                <button
                  onClick={() => toggleDay(day)}
                  className="w-full flex items-center justify-between bg-white p-3 rounded-2xl shadow-sm border hover:shadow-md transition-all mb-1"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronLeft size={16} className="text-gray-400" />}
                    <Calendar size={14} className="text-gray-400" />
                    <span className="font-bold text-gray-700 text-sm">{day}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{dayEntries.length} بنود</span>
                  </div>
                  <div className="flex gap-2 text-[11px]">
                    <span className="text-green-600 font-bold">دخل {formatCurrency(dayIncome)}</span>
                    <span className="text-red-600 font-bold">مصروفات {formatCurrency(dayOutcome)}</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full ${dayNet >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      صافي {dayNet >= 0 ? '+' : ''}{formatCurrency(dayNet)}
                    </span>
                  </div>
                </button>

                {/* البنود - تظهر فقط لو اليوم مفتوح */}
                {isOpen && (
                  <div className="space-y-1.5 pr-2">
                    {dayEntries.map((entry, i) => {
                      const isPositive = isPositiveType(entry.entry_type);
                      return (
                        <div key={entry.id || i} className="bg-white p-3 rounded-2xl shadow-sm border-r-4 flex items-center gap-3"
                          style={{ borderRightColor: isPositive ? '#22c55e' : '#ef4444' }}>
                          <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                            {icons[entry.entry_type] || icons.expense}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-700 text-sm">{labels[entry.entry_type] || entry.entry_type}</span>
                              {entry.description && <span className="text-xs text-gray-500 truncate">- {entry.description}</span>}
                            </div>
                          </div>
                          <div className={`font-bold text-sm shrink-0 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : '-'}{formatCurrency(entry.amount)} ج.م
                          </div>
                          <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600 p-1 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          });
        })()
      )}
    </div>
  );
};

export default ProfitLog;
