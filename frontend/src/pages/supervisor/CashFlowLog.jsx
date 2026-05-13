import { useState, useEffect, useCallback } from 'react';
import { useRegisterRefresh } from '../../context/RefreshContext';
import api from '../../services/api';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, ArrowLeft, RefreshCw, AlertTriangle, ChevronLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useNavigate } from 'react-router-dom';

const CashFlowLog = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(30);
  const [expandedDay, setExpandedDay] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, dailyRes, txRes] = await Promise.all([
        api.get('/cashflow/balance'),
        api.get(`/cashflow/daily-summary?days=${days}`),
        api.get('/cashflow'),
      ]);
      setSummary(balRes?.data || { total_in: 0, total_out: 0, balance: 0 });
      setDailyData(Array.isArray(dailyRes?.data) ? dailyRes.data : []);
      setTransactions(Array.isArray(txRes?.data) ? txRes.data : []);
    } catch (err) {
      console.error('CashFlowLog fetch error:', err);
      setError(err?.response?.data?.error || err?.message || 'فشل تحميل بيانات الخزنة');
      setSummary(null);
      setDailyData([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRegisterRefresh(fetchData);

  const formatCurrency = (val) => {
    const n = parseFloat(val) || 0;
    return n.toFixed(1);
  };

  // Group transactions by day
  const grouped = {};
  transactions.forEach(tx => {
    const dateKey = new Date(tx.created_at).toLocaleDateString('ar-EG');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(tx);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/');
    const [dayB, monthB, yearB] = b.split('/');
    return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
  });

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

  if (!summary) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/reports')} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Wallet className="text-teal-600" size={28} /> الخزنة
        </h3>
      </div>

      {/* الرصيد */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-6 rounded-2xl shadow-sm border border-teal-100 mb-6 text-center">
        <div className="text-sm text-gray-500 mb-1">الرصيد الحالي</div>
        <div className={`text-4xl font-extrabold ${parseFloat(summary.balance) >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
          {formatCurrency(summary.balance)} ج.م
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white/60 rounded-xl p-3">
            <div className="flex items-center gap-1 text-green-600 text-sm justify-center">
              <TrendingUp size={16} /> <span>وارد</span>
            </div>
            <div className="font-bold text-green-700 text-lg">{formatCurrency(summary.total_in)}</div>
          </div>
          <div className="bg-white/60 rounded-xl p-3">
            <div className="flex items-center gap-1 text-red-600 text-sm justify-center">
              <TrendingDown size={16} /> <span>منصرف</span>
            </div>
            <div className="font-bold text-red-700 text-lg">{formatCurrency(summary.total_out)}</div>
          </div>
        </div>
      </div>

      {/* الرسم البياني */}
      {dailyData.length > 0 && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border mb-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-700">تحليل التدفق النقدي</h4>
            <select value={days} onChange={e => setDays(e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
              <option value={7}>آخر 7 أيام</option>
              <option value={30}>آخر 30 يوم</option>
              <option value={90}>آخر 3 شهور</option>
            </select>
          </div>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5) || ''} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => `${parseFloat(value).toFixed(1)} ج.م`} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="#22c55e20" name="دخل" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef444420" name="مصروفات" />
                <Line type="monotone" dataKey="net" stroke="#0ea5e9" strokeWidth={2} name="صافي" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* آخر الحركات - مجمعة حسب اليوم */}
      <h4 className="font-bold text-gray-700 mb-3">آخر الحركات</h4>
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Wallet size={40} className="mx-auto mb-2 text-gray-300" />
          <p>لا توجد حركات بعد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map(day => {
            const dayTx = grouped[day];
            const isExpanded = expandedDay === day;
            const dayIncome = dayTx.filter(t => parseFloat(t.signed_amount) > 0).reduce((s, t) => s + parseFloat(t.signed_amount), 0);
            const dayExpense = dayTx.filter(t => parseFloat(t.signed_amount) < 0).reduce((s, t) => s + parseFloat(t.signed_amount), 0);

            return (
              <div key={day} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
                      <Calendar size={18} className="text-teal-600" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{day}</div>
                      <div className="text-xs text-gray-400">{dayTx.length} حركة</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center flex gap-2 text-xs">
                      {dayIncome > 0 && <span className="text-green-600 font-bold">+{dayIncome.toFixed(0)}</span>}
                      {dayExpense < 0 && <span className="text-red-600 font-bold">{dayExpense.toFixed(0)}</span>}
                    </div>
                    <ChevronLeft
                      size={18}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {dayTx.map((tx, i) => {
                      const isPositive = parseFloat(tx.signed_amount) > 0;
                      const labels = {
                        profit: 'ربح', revenue: 'إيراد', sale_revenue: 'إيراد بيع',
                        salary_payment: 'مرتبات', spoilage: 'هالك', expense: 'مصروفات',
                        purchase: 'مشتريات', cogs: 'تكلفة بضاعة'
                      };
                      return (
                        <div key={i} className="bg-gray-50 p-3 rounded-xl border-r-4 flex items-center gap-3"
                          style={{ borderRightColor: isPositive ? '#22c55e' : '#ef4444' }}>
                          <div className={`p-2 rounded-lg ${isPositive ? 'bg-green-50' : 'bg-red-50'}`}>
                            {isPositive ? <TrendingUp size={16} className="text-green-600" /> : <TrendingDown size={16} className="text-red-600" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-700 text-sm">{labels[tx.entry_type] || tx.entry_type}</div>
                            <div className="text-xs text-gray-500">{tx.description}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleTimeString('ar-EG')}</div>
                          </div>
                          <div className={`font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(tx.signed_amount)} ج.م
                          </div>
                        </div>
                      );
                    })}
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

export default CashFlowLog;
