import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, AlertTriangle, ShoppingCart, Users, ArrowLeft, RefreshCw } from 'lucide-react';
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
    await api.delete(`/profit/${id}`);
    fetchData();
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
    return n.toFixed(2);
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
          <div className="text-xs text-gray-500">صافي الربح</div>
          <div className="text-lg font-extrabold text-green-700">{formatCurrency(summaryData.total_profit)} ج.م</div>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-2xl shadow-sm border border-teal-100">
          <div className="text-xs text-gray-500">السيولة الحالية</div>
          <div className="text-lg font-extrabold text-teal-700">{formatCurrency(summaryData.current_liquidity)} ج.م</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl shadow-sm border border-blue-100">
          <div className="text-xs text-gray-500">الإيرادات</div>
          <div className="font-bold text-blue-700">{formatCurrency(summaryData.total_revenue)} ج.م</div>
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
              <Tooltip formatter={(value) => `${parseFloat(value).toFixed(2)} ج.م`} />
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
            <label className="text-xs text-gray-500">الوصف</label>
            <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="وصف البند" required />
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
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const isPositive = ['profit', 'revenue', 'sale_revenue'].includes(entry.entry_type);
            const labels = {
              profit: 'ربح', revenue: 'إيراد', salary_payment: 'مرتبات',
              spoilage: 'هالك', expense: 'مصروفات', purchase: 'مشتريات',
              cogs: 'تكلفة بضاعة'
            };
            const icons = {
              profit: <TrendingUp size={16} className="text-green-600" />,
              revenue: <TrendingUp size={16} className="text-blue-600" />,
              expense: <TrendingDown size={16} className="text-red-600" />,
              spoilage: <AlertTriangle size={16} className="text-orange-600" />,
              salary_payment: <Users size={16} className="text-purple-600" />,
              purchase: <ShoppingCart size={16} className="text-cyan-600" />,
              cogs: <TrendingDown size={16} className="text-amber-600" />,
            };

            return (
              <div key={entry.id || i} className="bg-white p-3 rounded-2xl shadow-sm border-r-4 flex items-center gap-3"
                style={{ borderRightColor: isPositive ? '#22c55e' : '#ef4444' }}>
                <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                  {icons[entry.entry_type] || icons.expense}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-700 text-sm">{labels[entry.entry_type] || entry.entry_type}</span>
                    {entry.description && <span className="text-xs text-gray-500">- {entry.description}</span>}
                  </div>
                  <div className="text-xs text-gray-400">{new Date(entry.created_at).toLocaleDateString('ar-EG')}</div>
                </div>
                <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.signed_amount ? (parseFloat(entry.signed_amount) > 0 ? '+' : '') + formatCurrency(entry.signed_amount) : formatCurrency(entry.amount)} ج.م
                </div>
                <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfitLog;
