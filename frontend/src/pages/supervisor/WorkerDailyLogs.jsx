import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { FileText, Search, ChevronDown, ChevronUp, Clock, Package, ExternalLink } from 'lucide-react';

const WorkerDailyLogs = () => {
  const navigate = useNavigate();
  const [allWorkers, setAllWorkers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedWorker, setExpandedWorker] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [workersRes, logsRes] = await Promise.all([
          api.get('/users/workers'),
          api.get('/workers-load/daily-logs/all').catch(() => ({ data: [] })),
        ]);
        setAllWorkers(workersRes.data);
        setLogs(logsRes.data || []);
      } catch (err) {
        console.error('خطأ في جلب البيانات:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Group logs by worker_id
  const logsByWorker = {};
  logs.forEach(log => {
    if (!logsByWorker[log.worker_id]) {
      logsByWorker[log.worker_id] = [];
    }
    logsByWorker[log.worker_id].push(log);
  });

  // Build workers list: all workers with their logs (if any)
  const workersWithLogs = allWorkers.map(w => ({
    worker_id: w.id,
    worker_name: w.username,
    days: logsByWorker[w.id] || [],
  }));

  // Sort workers by name
  const sortedWorkers = [...workersWithLogs].sort((a, b) =>
    a.worker_name?.localeCompare(b.worker_name, 'ar')
  );

  // Filter workers by search
  const filteredWorkers = sortedWorkers.filter(w =>
    !search || w.worker_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleWorker = (workerId) => {
    setExpandedWorker(expandedWorker === workerId ? null : workerId);
    setExpandedDay(null);
  };

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
      <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <FileText size={24} className="text-green-600" />
        سجل تحركات العهد
      </h3>

      {/* بحث */}
      <div className="relative mb-4">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="ابحث باسم العامل..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-400 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        {filteredWorkers.map(worker => {
          const hasLogs = worker.days.length > 0;
          const isExpanded = expandedWorker === worker.worker_id;

          return (
            <div key={worker.worker_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* رأس العامل - اسم الحساب + زرار متابعة */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">
                      {worker.worker_name.charAt(0)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800">{worker.worker_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/supervisor/worker-admin/${worker.worker_id}`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-green-700 transition"
                  >
                    متابعة <ExternalLink size={14} />
                  </button>
                  {hasLogs && (
                    <button
                      onClick={() => toggleWorker(worker.worker_id)}
                      className="p-2 rounded-xl hover:bg-gray-100 transition"
                    >
                      {isExpanded ? <ChevronUp size={20} className="text-green-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>
                  )}
                </div>
              </div>

              {/* لو مفيش تحركات للعامل */}
              {!hasLogs && (
                <div className="px-4 pb-4">
                  <div className="bg-green-50 p-3 rounded-xl text-center text-sm text-green-700">
                    لا يوجد تحركات لهذا العامل حتى الآن
                  </div>
                </div>
              )}

              {/* قائمة الأيام للعامل - عند التوسيع */}
              {hasLogs && isExpanded && (
                <div className="border-t border-gray-100">
                  {[...worker.days]
                    .sort((a, b) => new Date(b.log_date) - new Date(a.log_date))
                    .map((log, dayIdx) => {
                      const dayKey = `${worker.worker_id}-${log.log_date}`;
                      const isDayExpanded = expandedDay === dayKey;
                      const dateStr = log.log_date
                        ? new Date(log.log_date.split('T')[0] + 'T00:00:00').toLocaleDateString('ar-EG', {
                            year: 'numeric', month: 'numeric', day: 'numeric'
                          })
                        : '';

                      const startSnap = log.start_snapshot;
                      const endSnap = log.end_snapshot;
                      const startCash = parseFloat(startSnap?.cash_balance || 0);
                      const endCash = parseFloat(endSnap?.cash_balance || 0);
                      const totalRevenue = parseFloat(endSnap?.total_revenue || 0);
                      const totalProfit = parseFloat(endSnap?.total_profit || 0);

                      return (
                        <div key={dayIdx} className="border-b border-gray-50 last:border-b-0">
                          {/* رأس اليوم */}
                          <button
                            onClick={() => toggleDay(dayKey)}
                            className="w-full p-3 flex items-center justify-between hover:bg-green-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Clock size={14} className="text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">{dateStr}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                log.status === 'active' ? 'bg-green-100 text-green-700' :
                                log.status === 'ended' ? 'bg-gray-100 text-gray-600' :
                                'bg-red-100 text-red-600'
                              }`}>
                                {log.status === 'active' ? 'نشط' : log.status === 'ended' ? 'منتهي' : 'ملغي'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-green-700">{totalRevenue.toFixed(1)} ج.م</span>
                              {isDayExpanded ? <ChevronUp size={16} className="text-green-600" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </div>
                          </button>

                          {/* تفاصيل اليوم */}
                          {isDayExpanded && (
                            <div className="px-4 pb-4 space-y-3">
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
        })}
      </div>
    </div>
  );
};

export default WorkerDailyLogs;
