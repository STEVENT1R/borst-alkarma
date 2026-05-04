import { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShoppingCart, Plus, Trash2, ArrowLeft, Package, DollarSign, User, Calendar, ChevronLeft, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PurchasesLog = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ product_name: '', quantity: 1, unit_price: 0 }]);
  const [paidAmount, setPaidAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedDay, setExpandedDay] = useState(null);
  // Modal for payment
  const [payModal, setPayModal] = useState(null); // { id, supplier_name, remaining }

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
      await api.post('/purchases', { 
        supplier_name: supplierName, 
        items: validItems, 
        notes,
        paid_amount: paidAmount ? parseFloat(paidAmount) : 0
      });
      setSuccess('تم إضافة فاتورة الشراء بنجاح');
      setShowForm(false);
      setSupplierName('');
      setNotes('');
      setPaidAmount('');
      setItems([{ product_name: '', quantity: 1, unit_price: 0 }]);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحفظ');
    }
  };

  const handlePay = async () => {
    if (!payModal) return;
    if (!payModal.payAmount || parseFloat(payModal.payAmount) <= 0) {
      setError('يرجى إدخال مبلغ صحيح');
      return;
    }
    try {
      await api.post(`/purchases/${payModal.id}/pay`, { amount: parseFloat(payModal.payAmount) });
      setSuccess(`تم تسديد ${payModal.payAmount} ج.م من فاتورة ${payModal.supplier_name}`);
      setPayModal(null);
      fetchPurchases();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل التسديد');
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0), 0);

  // حالة الدفع بالعربي
  const getPaymentStatusBadge = (p) => {
    const remaining = parseFloat(p.total_amount) - parseFloat(p.paid_amount || 0);
    if (p.payment_status === 'paid' || remaining <= 0) {
      return <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">مكتملة</span>;
    } else if (p.payment_status === 'partial' || (parseFloat(p.paid_amount) > 0 && remaining > 0)) {
      return <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">مديون</span>;
    } else {
      return <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">غير مدفوعة</span>;
    }
  };

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
            <span>إجمالي الفاتورة</span>
            <span className="text-orange-600">{totalAmount.toFixed(1)} ج.م</span>
          </div>

          <div>
            <label className="text-xs text-gray-500">المبلغ المدفوع (اختياري - اتركه صفر لو كلها دين)</label>
            <input
              type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="كم دفعت دلوقتي؟" min="0" step="0.01"
            />
          </div>

          {paidAmount && parseFloat(paidAmount) > 0 && (
            <div className="bg-blue-50 p-2 rounded-xl text-xs text-blue-700">
              المتبقي: {(totalAmount - parseFloat(paidAmount)).toFixed(1)} ج.م
              {parseFloat(paidAmount) >= totalAmount ? ' ✅ مدفوعة بالكامل' : ' ⏳ باقي دين'}
            </div>
          )}

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
            const dayPaid = dayPurchases.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
            const dayDebt = dayTotal - dayPaid;

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
                      <div className="text-xs text-gray-400">{dayPurchases.length} فاتورة</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      {dayDebt > 0 && <div className="text-red-600 font-bold">دين {dayDebt.toFixed(1)} ج.م</div>}
                      <div className="text-orange-600 font-bold">{dayTotal.toFixed(1)} ج.م</div>
                    </div>
                    <ChevronLeft
                      size={18}
                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t pt-3">
                    {dayPurchases.map((p) => {
                      const remaining = parseFloat(p.total_amount) - parseFloat(p.paid_amount || 0);
                      return (
                        <div key={p.id} className="bg-gray-50 p-3 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-400" />
                                <span className="font-bold text-gray-800 text-sm">{p.supplier_name}</span>
                                {getPaymentStatusBadge(p)}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(p.purchase_date || p.created_at).toLocaleTimeString('ar-EG')}
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-sm font-extrabold text-orange-600">
                                {parseFloat(p.total_amount).toFixed(1)} ج.م
                              </div>
                              {remaining > 0 && (
                                <div className="text-[10px] text-red-600 font-bold">
                                  باقي {remaining.toFixed(1)} ج.م
                                </div>
                              )}
                            </div>
                          </div>

                          {/* شريط التقدم في الدفع */}
                          {parseFloat(p.paid_amount) > 0 && (
                            <div className="bg-gray-200 rounded-full h-1.5 mb-2">
                              <div 
                                className="bg-green-500 h-1.5 rounded-full" 
                                style={{ width: `${Math.min(100, (parseFloat(p.paid_amount) / parseFloat(p.total_amount)) * 100)}%` }}
                              />
                            </div>
                          )}

                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>مدفوع: {parseFloat(p.paid_amount || 0).toFixed(1)} ج.م</span>
                            {remaining > 0 && <span className="text-red-500">متبقي: {remaining.toFixed(1)} ج.م</span>}
                          </div>

                          {p.items && p.items.length > 0 && (
                            <div className="bg-white rounded-xl p-2 mt-1">
                              {p.items.map((item, i) => (
                                <div key={i} className="flex justify-between text-xs py-1">
                                  <span>{item.product_name} x {item.quantity}</span>
                                  <span className="text-gray-600">{parseFloat(item.total).toFixed(1)} ج.م</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {p.notes && (
                            <div className="text-xs text-gray-500 mt-2">{p.notes}</div>
                          )}

                          {/* زر التسديد - يظهر لو في متبقي */}
                          {remaining > 0 && (
                            <button
                              onClick={() => setPayModal({
                                id: p.id,
                                supplier_name: p.supplier_name,
                                remaining: remaining,
                                payAmount: ''
                              })}
                              className="mt-2 w-full flex items-center justify-center gap-1 bg-blue-600 text-white py-1.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
                            >
                              <CreditCard size={12} />
                              تسديد {remaining.toFixed(1)} ج.م
                            </button>
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
      )}

      {/* مودال التسديد */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-gray-800 mb-3">تسديد فاتورة</h4>
            <div className="text-sm text-gray-600 mb-3">
              <span className="font-bold">{payModal.supplier_name}</span>
              <br />
              المتبقي: <span className="text-red-600 font-bold">{payModal.remaining.toFixed(1)} ج.م</span>
            </div>

            <input
              type="number"
              value={payModal.payAmount}
              onChange={e => setPayModal({...payModal, payAmount: e.target.value})}
              className="w-full border rounded-xl px-3 py-2 text-sm mb-3"
              placeholder="المبلغ المطلوب تسديده"
              min="0.01"
              step="0.01"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-bold hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handlePay}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-bold hover:bg-blue-700"
              >
                تسديد
              </button>
            </div>

            {/* أزرار سريعة */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setPayModal({...payModal, payAmount: payModal.remaining.toFixed(1)})}
                className="flex-1 bg-green-50 text-green-700 py-1.5 rounded-xl text-[11px] font-bold hover:bg-green-100"
              >
                كامل المبلغ
              </button>
              <button
                onClick={() => setPayModal({...payModal, payAmount: (payModal.remaining / 2).toFixed(1)})}
                className="flex-1 bg-yellow-50 text-yellow-700 py-1.5 rounded-xl text-[11px] font-bold hover:bg-yellow-100"
              >
                النصف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesLog;
