import { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  Store, TrendingUp, DollarSign, ShoppingBag, Package,
  Search, Eye, ArrowLeft, ChevronDown, ChevronUp,
  Boxes, History, Receipt, X, Calendar, ChevronLeft
} from 'lucide-react';

const ShopsLog = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopInventory, setShopInventory] = useState([]);
  const [shopSales, setShopSales] = useState([]);
  const [shopTransactions, setShopTransactions] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [openSections, setOpenSections] = useState({ inventory: true, sales: true, transactions: true });
  const [expandedSalesDay, setExpandedSalesDay] = useState(null);
  const [expandedTxDay, setExpandedTxDay] = useState(null);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await api.get('/shops');
      setShops(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopDetails = async (shopId) => {
    setDetailsLoading(true);
    try {
      const [invRes, salesRes, txRes] = await Promise.all([
        api.get(`/shops/${shopId}/inventory`),
        api.get(`/shops/${shopId}/sales`),
        api.get(`/shops/${shopId}/inventory-transactions`),
      ]);
      setShopInventory(invRes.data);
      setShopSales(salesRes.data);
      setShopTransactions(txRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleSelectShop = (shop) => {
    setSelectedShop(shop);
    setShopInventory([]);
    setShopSales([]);
    setShopTransactions([]);
    setOpenSections({ inventory: true, sales: true, transactions: true });
    setExpandedSalesDay(null);
    setExpandedTxDay(null);
    fetchShopDetails(shop.id);
  };

  const handleBack = () => {
    setSelectedShop(null);
    setShopInventory([]);
    setShopSales([]);
    setShopTransactions([]);
  };

  const handleToggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const filteredShops = shops.filter(shop =>
    (shop.shop_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (shop.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val) => {
    const n = parseFloat(val || 0);
    return n.toFixed(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ar-EG');
  };

  const groupByDay = (arr, dateField = 'created_at') => {
    const grouped = {};
    arr.forEach(item => {
      const dateKey = new Date(item[dateField]).toLocaleDateString('ar-EG');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return Object.keys(grouped).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/');
      const [dayB, monthB, yearB] = b.split('/');
      return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
    }).map(day => ({ day, items: grouped[day] }));
  };

  // ====================== قائمة المحلات ======================
  if (!selectedShop) {
    return (
      <div>
        <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <Store size={24} className="text-indigo-600" />
          سجل المحلات
        </h3>

        {/* شريط البحث */}
        <div className="relative mb-4">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن محل..."
            className="w-full p-3 pr-10 border border-gray-200 rounded-xl bg-gray-50"
          />
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">جاري التحميل...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-8">
            <Store size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400">
              {search ? 'لا توجد محلات مطابقة' : 'لا توجد محلات مسجلة بعد'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredShops.map(shop => (
              <button
                key={shop.id}
                onClick={() => handleSelectShop(shop)}
                className="w-full bg-white p-4 rounded-xl border hover:border-indigo-300 hover:shadow-md transition-all text-right"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Store size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-gray-800">
                        {shop.shop_name || shop.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        👤 {shop.username} · {shop.account_type === 'shop' ? '🏪 حساب محل' : '👤 حساب شخصي'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        تم الإنشاء: {new Date(shop.created_at).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>
                  <Eye size={20} className="text-gray-300 flex-shrink-0" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-green-700 font-bold text-sm">
                      {formatCurrency(shop.total_revenue)} ج
                    </div>
                    <div className="text-green-500 text-[10px]">الإيرادات</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2 text-center">
                    <div className="text-purple-700 font-bold text-sm">
                      {formatCurrency(shop.net_profit)} ج
                    </div>
                    <div className="text-purple-500 text-[10px]">صافي الربح</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-blue-700 font-bold text-sm">
                      {shop.sales_count || 0}
                    </div>
                    <div className="text-blue-500 text-[10px]">عدد المبيعات</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ====================== تفاصيل المحل المختار ======================
  const salesByDay = groupByDay(shopSales);
  const txByDay = groupByDay(shopTransactions);

  return (
    <div>
      <button
        onClick={handleBack}
        className="mb-4 flex items-center gap-1 text-blue-600 text-sm font-bold hover:text-blue-700"
      >
        <ArrowLeft size={16} /> العودة لقائمة المحلات
      </button>

      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl text-white mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Store size={26} />
          </div>
          <div>
            <h4 className="text-xl font-bold">{selectedShop.shop_name || selectedShop.username}</h4>
            <p className="text-sm opacity-80">👤 المالك: {selectedShop.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/20 p-3 rounded-xl text-center">
            <DollarSign size={16} className="mx-auto mb-1 opacity-70" />
            <div className="text-sm opacity-80">الإيرادات</div>
            <div className="text-lg font-bold">{formatCurrency(selectedShop.total_revenue)} ج</div>
          </div>
          <div className="bg-white/20 p-3 rounded-xl text-center">
            <TrendingUp size={16} className="mx-auto mb-1 opacity-70" />
            <div className="text-sm opacity-80">صافي الربح</div>
            <div className="text-lg font-bold">{formatCurrency(selectedShop.net_profit)} ج</div>
          </div>
          <div className="bg-white/20 p-3 rounded-xl text-center">
            <ShoppingBag size={16} className="mx-auto mb-1 opacity-70" />
            <div className="text-sm opacity-80">المبيعات</div>
            <div className="text-lg font-bold">{selectedShop.sales_count || 0}</div>
          </div>
        </div>
      </div>

      {detailsLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-400">جاري تحميل التفاصيل...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* ===== قسم المخزون ===== */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <button
              onClick={() => handleToggleSection('inventory')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Boxes size={20} className="text-green-600" />
                <span className="font-bold text-gray-700">
                  مخزن المحل ({shopInventory.length} منتج)
                </span>
              </div>
              {openSections.inventory ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {openSections.inventory && (
              <div className="px-4 pb-4">
                {shopInventory.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Package size={32} className="mx-auto mb-2 text-gray-300" />
                    المخزن فارغ
                  </div>
                ) : (
                  <div className="space-y-2">
                    {shopInventory.map(product => (
                      <div key={product.id} className="bg-gray-50 p-3 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-800">{product.product_name}</span>
                          <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                            {parseFloat(product.quantity || 0).toFixed(1)} {product.unit_type === 'weight' ? 'كجم' : 'قطعة'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          <div>سعر الشراء: <span className="font-bold">{formatCurrency(product.purchase_price)} ج</span></div>
                          <div>سعر التجزئة: <span className="font-bold">{formatCurrency(product.retail_price)} ج</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== قسم المبيعات ===== */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <button
              onClick={() => handleToggleSection('sales')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt size={20} className="text-blue-600" />
                <span className="font-bold text-gray-700">
                  سجل المبيعات ({shopSales.length} عملية)
                </span>
              </div>
              {openSections.sales ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {openSections.sales && (
              <div className="px-4 pb-4">
                {shopSales.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <ShoppingBag size={32} className="mx-auto mb-2 text-gray-300" />
                    لا توجد مبيعات مسجلة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {salesByDay.map(({ day, items }) => (
                      <div key={day} className="bg-gray-50 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedSalesDay(expandedSalesDay === day ? null : day)}
                          className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-blue-500" />
                            <span className="font-bold text-gray-700 text-sm">{day}</span>
                            <span className="text-xs text-gray-400">({items.length})</span>
                          </div>
                          <div className="text-sm font-bold text-green-600">
                            {items.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0).toFixed(0)} ج
                          </div>
                        </button>
                        {expandedSalesDay === day && (
                          <div className="px-3 pb-3 space-y-1">
                            {items.map(sale => (
                              <div key={sale.id} className="bg-white p-2 rounded-lg">
                                <div className="flex items-center justify-between mb-0.5">
                                  <div>
                                    <span className="font-bold text-gray-800 text-xs">{sale.product_name}</span>
                                    <span className="text-[10px] text-gray-400 mr-1">👤 {sale.username}</span>
                                  </div>
                                  <span className="font-bold text-green-600 text-xs">
                                    {formatCurrency(sale.total_amount)} ج
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-400">
                                  <span>
                                    {sale.quantity} {sale.unit_type === 'weight' ? 'كجم' : 'قطعة'} × {formatCurrency(sale.sale_price)} ج
                                  </span>
                                  <span className="text-green-500 font-bold">
                                    ربح: {formatCurrency(sale.profit_amount)} ج
                                  </span>
                                </div>
                                <div className="text-[9px] text-gray-300 mt-0.5">{formatDate(sale.created_at)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ===== قسم حركات المخزن ===== */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <button
              onClick={() => handleToggleSection('transactions')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History size={20} className="text-purple-600" />
                <span className="font-bold text-gray-700">
                  حركات المخزن ({shopTransactions.length} حركة)
                </span>
              </div>
              {openSections.transactions ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>
            {openSections.transactions && (
              <div className="px-4 pb-4">
                {shopTransactions.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <History size={32} className="mx-auto mb-2 text-gray-300" />
                    لا توجد حركات مخزن مسجلة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {txByDay.map(({ day, items }) => (
                      <div key={day} className="bg-gray-50 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedTxDay(expandedTxDay === day ? null : day)}
                          className="w-full p-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-purple-500" />
                            <span className="font-bold text-gray-700 text-sm">{day}</span>
                            <span className="text-xs text-gray-400">({items.length})</span>
                          </div>
                        </button>
                        {expandedTxDay === day && (
                          <div className="px-3 pb-3 space-y-1">
                            {items.map(tx => (
                              <div key={tx.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                                <div>
                                  <span className="font-bold text-gray-800 text-xs">{tx.product_name}</span>
                                  <span className="text-[10px] text-gray-400 mr-1">👤 {tx.username || '-'}</span>
                                  <div className="text-[9px] text-gray-300">{formatDate(tx.created_at)}</div>
                                </div>
                                <div className="text-right">
                                  <span className={`font-bold text-xs ${parseFloat(tx.quantity_change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(tx.quantity_change) >= 0 ? '+' : ''}
                                    {parseFloat(tx.quantity_change || 0).toFixed(1)}
                                  </span>
                                  <div className="text-[9px] text-gray-400">
                                    {tx.transaction_type === 'addition' ? 'إضافة' :
                                     tx.transaction_type === 'deduction' ? 'خصم' :
                                     tx.transaction_type === 'sale' ? 'بيع' : tx.transaction_type}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopsLog;
