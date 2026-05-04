import { useState, useEffect } from 'react';
import api from '../../services/api';
import { ArrowDownCircle, ChevronDown, ChevronLeft, Calendar } from 'lucide-react';

const InventoryLog = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    api.get('/inventory/transactions').then(res => setTransactions(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Group by day
  const grouped = {};
  transactions.forEach(t => {
    const dateKey = new Date(t.created_at).toLocaleDateString('ar-EG');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(t);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/');
    const [dayB, monthB, yearB] = b.split('/');
    return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
  });

  if (loading) return <div className="text-center py-12 text-gray-400">تحميل...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <ArrowDownCircle className="text-green-600" size={24} /> سجل المخزن
      </h3>

      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <ArrowDownCircle size={48} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-400">لا توجد حركات في المخزن</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map(day => {
            const dayTx = grouped[day];
            const isExpanded = expandedDay === day;
            const additions = dayTx.filter(t => t.transaction_type === 'addition').reduce((sum, t) => sum + Math.abs(parseFloat(t.quantity_change)), 0);
            const deductions = dayTx.filter(t => t.transaction_type !== 'addition').reduce((sum, t) => sum + Math.abs(parseFloat(t.quantity_change)), 0);

            return (
              <div key={day} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                      <Calendar size={18} className="text-blue-600" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{day}</div>
                      <div className="text-xs text-gray-400">{dayTx.length} حركة</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      {additions > 0 && <div className="text-xs text-green-600 font-bold">+{additions.toFixed(1)}</div>}
                      {deductions > 0 && <div className="text-xs text-red-600 font-bold">-{deductions.toFixed(1)}</div>}
                    </div>
                    <ChevronLeft
                      size={18}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {dayTx.map(t => {
                      const isAddition = t.transaction_type === 'addition';
                      const isSpoilage = t.transaction_type === 'spoilage';
                      const qty = Math.abs(parseFloat(t.quantity_change));
                      const unitLabel = t.unit_type === 'weight' ? 'كجم' : 'قطعة';
                      const actionText = isAddition ? 'تم إضافة' : isSpoilage ? 'هالك' : 'تم صرف';
                      const bgColor = isAddition ? 'bg-green-50 border-green-500' : isSpoilage ? 'bg-orange-50 border-orange-500' : 'bg-red-50 border-red-500';
                      const iconColor = isAddition ? 'text-green-500' : isSpoilage ? 'text-orange-500' : 'text-red-500';
                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border-r-4 flex items-start gap-3 ${bgColor}`}
                        >
                          <ArrowDownCircle
                            className={`mt-1 flex-shrink-0 ${iconColor}`}
                            size={18}
                          />
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{t.product_name}</div>
                            <div className="text-xs text-gray-600">
                              {actionText} {qty} {unitLabel}
                              {t.username && <span> بواسطة {t.username}</span>}
                              {isSpoilage && <span className="text-orange-600 font-bold"> (تالف)</span>}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(t.created_at).toLocaleTimeString('ar-EG')}
                            </div>
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

export default InventoryLog;
