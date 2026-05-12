import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Package, DollarSign, Clock, ArrowLeft, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const WorkerAdmin = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [workerData, setWorkerData] = useState(null);
  const [workerName, setWorkerName] = useState('');
  const [dailyLogs, setDailyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get(`/workers-load/${workerId}`);
      setWorkerData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDailyLogs = async () => {
    try {
      const res = await api.get(`/workers-load/${workerId}/daily-log`);
      setDailyLogs(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkerName = async () => {
    try {
      const res = await api.get('/users/all');
      const worker = res.data.find(u => u.id === parseInt(workerId));
      if (worker) setWorkerName(worker.username);
    } catch (err) {}
  };

  useEffect(() => {
    Promise.all([
      fetchData(),
      fetchDailyLogs(),
      fetchWorkerName(),
    ]).finally(() => setLoading(false));
  }, [workerId]);

  const toggleDay = (dayKey) => {
    setExpandedDay(expandedDay === dayKey ? null : dayKey);
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
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/worker-daily-logs')} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h3 className="text-2xl font-bold text-gray-800">سجل تحركات {workerName}</h3>
          <p className="text-sm text-gray-400">سجل التحركات القديمة للعهدة - متابعة</p>
        </div>
      </div>

      {dailyLogs.length === 0 ? (
        <div className="bg-blue-50 p-6 rounded-2xl text-blue-700 text-sm text-center">
          لا توجد تحركات سابقة لهذا العامل
        </div>
      ) : (
        <div className="space-y-2">
          {dailyLogs.map((log, index) => {
            const dayKey = `${log.log_date}`;
            const isDayExpanded = expandedDay === dayKey;
            const dateParts = log.log_date ? log.log_date.split('-') : [];
            const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : log.log_date;

            const startSnap = log.start_snapshot;
            const endSnap = log.end_snapshot;
            const startCash = parseFloat(startSnap?.cash_balance || 0);
            const endCash = parseFloat(endSnap?.cash_balance || 0);
            const totalRevenue = parseFloat(endSnap?.total_revenue || 0);
            const totalProfit = parseFloat(endSnap?.total_profit || 0);

            return (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* رأس اليوم */}
                <button
                  onClick={() => toggleDay(dayKey)}
                  className="w-full p-4 flex items-center justify-between hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Clock size={18} className="text-green-600" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{dateStr}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        log.status === 'active' ? 'bg-green-100 text-green-700' :
                        log.status === 'ended' ? 'bg-gray-100 text-gray-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {log.status === 'active' ? 'نشط' : log.status === 'ended' ? 'منتهي' : 'ملغي'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-700">{totalRevenue.toFixed(1)} ج.م</span>
                    {isDayExpanded ? <ChevronUp size={18} className="text-green-600" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </button>

                {/* تفاصيل اليوم */}
                {isDayExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    {/* إحصائيات */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-50 p-3 rounded-xl">
                        <div className="text-xs text-gray-500 mb-1">💰 الرصيد بداية اليوم</div>
                        <div className="text-lg font-bold text-gray-700">{startCash.toFixed(1)} ج.م</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-xl">
                        <div className="text-xs text-gray-500 mb-1">💰 الرصيد نهاية اليوم</div>
                        <div className="text-lg font-bold text-gray-700">{endCash.toFixed(1)} ج.م</div>
                      </div>
                      <div className="bg-green-100 p-3 rounded-xl">
                        <div className="text-xs text-gray-500 mb-1">📈 إجمالي الإيرادات</div>
                        <div className="text-lg font-bold text-green-700">{totalRevenue.toFixed(1)} ج.م</div>
                      </div>
                      <div className="bg-green-100 p-3 rounded-xl">
                        <div className="text-xs text-gray-500 mb-1">📊 صافي الربح</div>
                        <div className="text-lg font-bold text-green-700">{totalProfit.toFixed(1)} ج.م</div>
                      </div>
                    </div>

                    {/* مقارنة المنتجات */}
                    {(startSnap?.load?.length > 0 || endSnap?.load?.length > 0) && (
                      <div className="bg-white border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Package size={16} className="text-green-600" />
                          <span className="text-sm font-bold text-gray-700">المنتجات في العهدة</span>
                        </div>
                        <div className="space-y-1.5">
                          {(() => {
                            const allProducts = new Map();
                            (startSnap?.load || []).forEach(p => {
                              const qty = parseFloat(p.quantity) || 0;
                              allProducts.set(p.product_name, {
                                name: p.product_name,
                                startQty: qty,
                                endQty: 0,
                                unit: p.unit_type === 'weight' ? 'كجم' : 'قطعة',
                              });
                            });
                            (endSnap?.load || []).forEach(p => {
                              const qty = parseFloat(p.quantity) || 0;
                              if (allProducts.has(p.product_name)) {
                                allProducts.get(p.product_name).endQty = qty;
                              } else {
                                allProducts.set(p.product_name, {
                                  name: p.product_name,
                                  startQty: 0,
                                  endQty: qty,
                                  unit: p.unit_type === 'weight' ? 'كجم' : 'قطعة',
                                });
                              }
                            });

                            return Array.from(allProducts.values()).map((p, i) => {
                              const diff = p.endQty - p.startQty;
                              return (
                                <div key={i} className="flex justify-between items-center text-xs bg-green-50 p-2 rounded-lg">
                                  <span className="font-medium text-gray-700">{p.name}</span>
                                  <span className={diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-green-600' : 'text-red-600'}>
                                    {p.startQty.toFixed(1)} → {p.endQty.toFixed(1)} {p.unit}
                                    <span className="mr-1">({diff >= 0 ? '+' : ''}{diff.toFixed(1)})</span>
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {/* التوقيت */}
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>🕐 البداية: {log.started_at ? new Date(log.started_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                      <span>🕐 النهاية: {log.ended_at ? new Date(log.ended_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                    </div>

                    {/* الملخص الكامل */}
                    {log.summary && (
                      <details className="mt-1">
                        <summary className="text-xs text-green-600 cursor-pointer font-medium">📄 عرض الملخص الكامل</summary>
                        <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap bg-green-50 p-3 rounded-lg leading-relaxed max-h-60 overflow-y-auto">
                          {log.summary}
                        </pre>
                      </details>
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

export default WorkerAdmin;
