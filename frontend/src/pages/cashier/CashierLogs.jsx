import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { FileText, History, ShoppingCart, Package, ChevronDown, ChevronUp } from 'lucide-react';

const groupByDate = (items) => {
  const groups = {};
  items.forEach(item => {
    const dateKey = new Date(item.created_at).toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });
  return Object.entries(groups).sort((a, b) => {
    // Sort by date descending (most recent first)
    const dateA = new Date(a[1][0].created_at);
    const dateB = new Date(b[1][0].created_at);
    return dateB - dateA;
  });
};

const CashierLogs = () => {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'sales'
  const [transactions, setTransactions] = useState([]);
  const [sales, setSales] = useState([]);
  const [expandedDates, setExpandedDates] = useState({});

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventoryTransactions();
    } else {
      fetchSales();
    }
  }, [activeTab]);

  const fetchInventoryTransactions = async () => {
    try {
      const res = await api.get('/sales/shop-transactions');
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSales = async () => {
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const groupedTransactions = useMemo(() => groupByDate(transactions), [transactions]);
  const groupedSales = useMemo(() => groupByDate(sales), [sales]);

  const toggleDate = (dateKey) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Auto-expand first date group on data load
  useEffect(() => {
    const items = activeTab === 'inventory' ? groupedTransactions : groupedSales;
    if (items.length > 0 && !expandedDates[items[0][0]]) {
      setExpandedDates(prev => ({ ...prev, [items[0][0]]: true }));
    }
  }, [activeTab, transactions, sales]);

  const getTransactionTypeText = (type) => {
    switch (type) {
      case 'addition': return 'إضافة';
      case 'sale': return 'بيع';
      default: return type;
    }
  };

  // Calculate totals for a group of transactions
  const calcTransactionTotals = (items) => {
    const additions = items.filter(t => parseFloat(t.quantity_change) > 0)
      .reduce((sum, t) => sum + parseFloat(t.quantity_change), 0);
    const sales = items.filter(t => parseFloat(t.quantity_change) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.quantity_change)), 0);
    return { additions, sales };
  };

  // Calculate totals for a group of sales
  const calcSalesTotals = (items) => {
    const totalAmount = items.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
    const totalProfit = items.reduce((sum, s) => sum + (parseFloat(s.profit_amount) || 0), 0);
    return { totalAmount, totalProfit, count: items.length };
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <FileText size={24} className="text-orange-600" />
        السجلات
      </h3>

      {/* تبويبات السجلات */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'inventory' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          <Package size={16} /> سجل المخزن
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 ${
            activeTab === 'sales' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          <ShoppingCart size={16} /> سجل البيع
        </button>
      </div>

      {/* سجل المخزن - حركات المخزن */}
      {activeTab === 'inventory' && (
        <div>
          {groupedTransactions.length === 0 ? (
            <div className="text-center py-8">
              <History size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400">لا توجد حركات مخزن مسجلة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedTransactions.map(([dateKey, items]) => {
                const isOpen = expandedDates[dateKey];
                const { additions, sales: salesTotal } = calcTransactionTotals(items);
                return (
                  <div key={dateKey} className="bg-white rounded-xl border overflow-hidden">
                    <button
                      onClick={() => toggleDate(dateKey)}
                      className="w-full flex items-center justify-between p-3 bg-gradient-to-l from-gray-50 to-white hover:from-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">{dateKey}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {items.length} حركة
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs flex gap-2">
                          {additions > 0 && <span className="text-green-600 font-bold">+{additions.toFixed(1)}</span>}
                          {salesTotal > 0 && <span className="text-red-600 font-bold">-{salesTotal.toFixed(1)}</span>}
                        </div>
                        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100">
                        {items.map(tx => (
                          <div key={tx.id} className="p-3 pr-8">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm">{tx.product_name}</span>
                              <span className={`font-bold text-sm ${parseFloat(tx.quantity_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {parseFloat(tx.quantity_change) >= 0 ? '+' : ''}{parseFloat(tx.quantity_change).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>
                                {getTransactionTypeText(tx.transaction_type)}
                                {tx.username ? ` - ${tx.username}` : ''}
                              </span>
                              <span>{new Date(tx.created_at).toLocaleTimeString('ar-EG')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* سجل البيع - المبيعات */}
      {activeTab === 'sales' && (
        <div>
          {groupedSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400">لا توجد مبيعات مسجلة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedSales.map(([dateKey, items]) => {
                const isOpen = expandedDates[dateKey];
                const { totalAmount, totalProfit, count } = calcSalesTotals(items);
                return (
                  <div key={dateKey} className="bg-white rounded-xl border overflow-hidden">
                    <button
                      onClick={() => toggleDate(dateKey)}
                      className="w-full flex items-center justify-between p-3 bg-gradient-to-l from-gray-50 to-white hover:from-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">{dateKey}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {count} عملية بيع
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs flex gap-2">
                          <span className="text-green-600 font-bold">{totalAmount.toFixed(1)} ج</span>
                          <span className="text-blue-600 font-bold">ربح {totalProfit.toFixed(1)} ج</span>
                        </div>
                        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100">
                        {items.map(sale => {
                          const total = parseFloat(sale.total_amount) || 0;
                          const profit = parseFloat(sale.profit_amount) || 0;
                          const price = parseFloat(sale.sale_price) || 0;
                          return (
                            <div key={sale.id} className="p-3 pr-8">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-sm">{sale.product_name}</span>
                                <span className="font-bold text-green-600">{total.toFixed(1)} ج</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>
                                  {sale.quantity} {sale.unit_type === 'weight' ? 'كجم' : 'قطعة'} × {price.toFixed(1)} ج
                                </span>
                                <div className="flex gap-2">
                                  <span className="text-blue-600">ربح {profit.toFixed(1)} ج</span>
                                  <span>{new Date(sale.created_at).toLocaleTimeString('ar-EG')}</span>
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
      )}
    </div>
  );
};

export default CashierLogs;
