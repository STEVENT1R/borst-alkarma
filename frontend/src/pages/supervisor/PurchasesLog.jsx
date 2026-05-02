import { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShoppingCart, Plus, Trash2, ArrowLeft, Package, DollarSign, User, Calendar, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchasesLog = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/purchases');
      setPurchases(res.data);
    } catch (err) {
      setError('فشل تحميل فواتير الشراء');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { product_name: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (idx) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const newItems = [...items];
    newItems[idx][field] = value;
    setItems(newItems);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!supplierName.trim()) {
      setError('يرجى إدخال اسم المورد');
      return;
    }

    const validItems = items.filter(i => i.product_name.trim() && i.quantity > 0);
    if (validItems.length === 0) {
      setError('يرجى إضافة منتج واحد على الأقل');
      return;
    }

    try {
      await api.post('/purchases', { supplier_name: supplierName, items: validItems, notes });
      setSuccess('تم إضافة فاتورة الشراء بنجاح');
      setShowForm(false);
      setSupplierName('');
      setNotes('');
      setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحفظ');
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0), 0);

  // Group by day
  const grouped = {};
  purchases.forEach(p => {
    const dateKey = new Date(p.purchase_date || p.created_at).toLocaleDateString('ar-EG');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(p);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/');
    const [dayB, monthB, yearB] = b.split('/');
    return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
  });

  if (loading) return <div className="text-center py-12 text-gray-400">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/reports')} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="text-orange-600" size={28} /> فواتير الشراء
        </h3>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 text-green-700 p-3 rounded-xl mb-4 text-sm">{success}</div>}

      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full mb-4 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-xl font-bold"
      >
        <Plus size={18} /> {showForm ? 'إلغاء' : 'فاتورة شراء جديدة'}
      </button>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-4 rounded-2xl shadow-sm border mb-6 space-y-3">
          <h4 className="font-bold text-gray-700">فاتورة شراء جديدة</h4>
          <div>
            <label className="text-xs text-gray-500">اسم المورد</label>
            <input
              type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="اسم المورد" required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500">المنتجات</label>
            <div className="flex gap-2 items-center text-[10px] text-gray-400 px-1">
              <span className="flex-1">اسم المنتج</span>
              <span className="w-16 text-center">عدد الوحدات</span>
              <span className="w-20 text-center">سعر الوحدة</span>
              {items.length > 1 && <span className="w-8"></span>}
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text" value={item.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="اسم المنتج" required
                  list="product-suggestions"
                />
                <input
                  type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  className="w-16 border rounded-xl px-2 py-2 text-sm text-center" placeholder="عدد الوحدات" min="0" step="0.01" required
                />
                <input
                  type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                  className="w-20 border rounded-xl px-2 py-2 text-sm text-center" placeholder="سعر الوحدة (ج.م)" min="0" step="0.01" required
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">
              + إضافة منتج
            </button>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl flex justify-between font-bold">
            <span>الإجمالي</span>
            <span className="text-orange-600">{totalAmount.toFixed(2)} ج.م</span>
          </div>

          <div>
            <label className="text-xs text-gray-500">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" rows="2" />
          </div>

          <button type="submit" className="w-full bg-orange-600 text-white py-2 rounded-xl hover:bg-orange-700 transition-colors font-bold">
            حفظ الفاتورة
          </button>

          <datalist id="product-suggestions">
            {purchases.flatMap(p => p.items || []).map((item, i) => (
              <option key={i} value={item.product_name} />
            ))}
          </datalist>
        </form>
      )}

      {purchases.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ShoppingCart size={48} className="mx-auto mb-3 text-gray-300" />
          <p>لا توجد فواتير شراء</p>
          <p className="text-sm">أضف أول فاتورة شراء</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDays.map(day => {
            const dayPurchases = grouped[day];
            const isExpanded = expandedDay === day;
            const dayTotal = dayPurchases.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);

            return (
              <div key={day} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                      <Calendar size={18} className="text-orange-600" />
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">{day}</div>
                      <div className="text-xs text-gray-400">{dayPurchases.length} فاتورة شراء</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-orange-600">{dayTotal.toFixed(2)} ج.م</div>
                    <ChevronLeft
                      size={18}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {dayPurchases.map((p) => (
                      <div key={p.id} className="bg-gray-50 p-3 rounded-xl">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span className="font-bold text-gray-800 text-sm">{p.supplier_name}</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {new Date(p.purchase_date || p.created_at).toLocaleTimeString('ar-EG')}
                            </div>
                          </div>
                          <div className="text-sm font-extrabold text-orange-600">
                            {parseFloat(p.total_amount).toFixed(2)} ج.م
                          </div>
                        </div>

                        {p.items && p.items.length > 0 && (
                          <div className="bg-white rounded-xl p-2 mt-1">
                            {p.items.map((item, i) => (
                              <div key={i} className="flex justify-between text-xs py-1">
                                <span>{item.product_name} x {item.quantity}</span>
                                <span className="text-gray-600">{parseFloat(item.total).toFixed(2)} ج.م</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {p.notes && (
                          <div className="text-xs text-gray-500 mt-2">{p.notes}</div>
                        )}
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
  );
};

export default PurchasesLog;
