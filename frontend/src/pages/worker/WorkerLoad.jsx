import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, DollarSign, Clock, ArrowUpRight, ArrowDownRight, Play, Square, History, FileText } from 'lucide-react';

const WorkerLoad = () => {
  const [loadData, setLoadData] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [activeDay, setActiveDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [userId, setUserId] = useState(null);

  const fetchData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      const id = userRes.data.id;
      setUserId(id);

      const res = await api.get(`/workers-load/${id}`);
      setLoadData(res.data);

      // جلب سجل اليوم
      const logRes = await api.get(`/workers-load/${id}/daily-log`);
      setDailyLogs(logRes.data);

      // هل في يوم نشط؟ (مقارنة Date objects عشان تظبط مع UTC)
      const now = new Date();
      const todayLog = logRes.data.find(l => {
        if (!l.log_date) return false;
        const d = new Date(l.log_date);
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === now.getDate();
      });
      setActiveDay(todayLog?.status === 'active' ? todayLog : null);
    } catch (err) {
      console.error('خطأ في جلب بيانات العهدة:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartDay = async () => {
    if (!window.confirm('هل أنت متأكد من بدء اليوم؟ سيتم أخذ لقطة للعهدة الحالية.')) return;
    setActionLoading(true);
    try {
      const userRes = await api.get('/auth/me');
      const id = userRes.data.id;
      await api.post(`/workers-load/${id}/start-day`);
      await fetchData();
      alert('✅ تم بدء اليوم بنجاح');
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelDay = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء اليوم؟')) return;
    setActionLoading(true);
    try {
      const userRes = await api.get('/auth/me');
      const id = userRes.data.id;
      await api.post(`/workers-load/${id}/cancel-day`);
      await fetchData();
      alert('✅ تم إلغاء اليوم');
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndDay = async () => {
    if (!window.confirm('هل أنت متأكد من إنهاء اليوم؟ سيتم إنشاء ملخص اليوم.')) return;
    setActionLoading(true);
    try {
      const userRes = await api.get('/auth/me');
      const id = userRes.data.id;
      const res = await api.post(`/workers-load/${id}/end-day`);
      setSummary(res.data.summary);
      setShowSummaryModal(true);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800">العهدة والحمولة</h3>

      {/* أزرار بدء/إنهاء/إلغاء اليوم */}
      <div className="flex gap-2 mb-4">
        {!activeDay ? (
          <button
            onClick={handleStartDay}
            disabled={actionLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50"
          >
            <Play size={18} />
            {actionLoading ? 'جاري...' : 'بدء اليوم'}
          </button>
        ) : (
          <>
            <button
              onClick={handleEndDay}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
            >
              <Square size={18} />
              {actionLoading ? 'جاري...' : 'إنهاء اليوم'}
            </button>
            <button
              onClick={handleCancelDay}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-red-700 py-3 px-4 rounded-xl font-bold hover:bg-gray-300 transition disabled:opacity-50"
            >
              إلغاء
            </button>
          </>
        )}
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-bold hover:bg-gray-200 transition"
        >
          <History size={18} />
          السجل
        </button>
      </div>

      {/* حالة اليوم */}
      {activeDay && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-xl mb-4 text-sm text-green-700 flex items-center gap-2">
          <Clock size={16} />
          اليوم نشط - بدأ في {new Date(activeDay.started_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* بطاقة الرصيد المالي */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100 mb-4">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <DollarSign size={20} className="text-green-600" />
          <span className="text-sm font-medium">الرصيد المالي (الكاش اللي معاك)</span>
        </div>
        <div className="text-4xl font-extrabold text-green-700">
          {loadData?.cash_balance?.toFixed(1) || '0'} ج.م
        </div>
      </div>

      {/* قائمة المنتجات (الحمولة) */}
      <div className="mb-4">
        <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Package size={20} className="text-amber-600" />
          المنتجات في العهدة
        </h4>
        
        {(!loadData?.load || loadData.load.length === 0) ? (
          <div className="bg-amber-50 p-4 rounded-xl text-amber-700 text-sm">
            لا توجد منتجات في عهدتك حالياً
          </div>
        ) : (
          <div className="space-y-2">
            {loadData.load.map((item, index) => (
              <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-800">{item.product_name}</div>
                  <div className="text-xs text-gray-400">وحدة: {item.unit_type === 'weight' ? 'كجم' : 'قطعة'}</div>
                </div>
                <div className="text-lg font-bold text-amber-700">
                  {parseFloat(item.quantity).toFixed(1)}
                  <span className="text-xs mr-1 text-gray-400">{item.unit_type === 'weight' ? 'كجم' : 'قطعة'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* سجل حركة العهدة المالية */}
      <div className="mb-4">
        <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Clock size={20} className="text-blue-600" />
          سجل حركة العهدة المالية
        </h4>

        {(!loadData?.custody_log || loadData.custody_log.length === 0) ? (
          <div className="bg-blue-50 p-4 rounded-xl text-blue-700 text-sm">
            لا توجد حركات عهدة مالية حتى الآن
          </div>
        ) : (
          <div className="space-y-2">
            {loadData.custody_log.map((log, index) => {
              const isDeposit = log.type === 'collected_from_tasks' || log.type === 'received_from_supervisor';
              return (
                <div key={index} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      {isDeposit ? (
                        <ArrowUpRight size={16} className="text-green-500 mt-1 shrink-0" />
                      ) : (
                        <ArrowDownRight size={16} className="text-red-500 mt-1 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm text-gray-700">{log.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-base font-bold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                      {isDeposit ? '+' : '-'}{parseFloat(log.amount).toFixed(1)} ج.م
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* سجل تحركات العهد اليومية (قابل للطي) */}
      {showLogs && (
        <div className="mb-4">
          <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <FileText size={20} className="text-purple-600" />
            سجل تحركات العهد اليومية
          </h4>

          {dailyLogs.length === 0 ? (
            <div className="bg-purple-50 p-4 rounded-xl text-purple-700 text-sm">
              لا توجد أيام مسجلة
            </div>
          ) : (
            <div className="space-y-2">
              {dailyLogs.map((log, index) => {
                const dateParts = log.log_date ? log.log_date.split('-') : [];
                const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : log.log_date;
                return (
                  <div key={index} className={`p-3 rounded-xl shadow-sm border ${log.status === 'active' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-gray-800">{dateStr}</div>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
                        {log.status === 'active' ? 'نشط' : 'منتهي'}
                      </div>
                    </div>
                    {log.summary && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer">عرض الملخص</summary>
                        <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap bg-gray-50 p-2 rounded-lg">
                          {log.summary}
                        </pre>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* مودال عرض ملخص إنهاء اليوم */}
      {showSummaryModal && summary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSummaryModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">📊 ملخص اليوم</h3>
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {summary}
            </pre>
            <button
              onClick={() => setShowSummaryModal(false)}
              className="w-full mt-4 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 transition"
            >
              تم ✅
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerLoad;
