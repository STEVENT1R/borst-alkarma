import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Play, XCircle, CheckCircle, Package, DollarSign, Users, AlertTriangle, Send, Clock, ArrowLeft, TrendingUp, Box } from 'lucide-react';

const WorkerTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(null); // task object
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  
  // Complete task modal
  const [completeModal, setCompleteModal] = useState(null); // task object
  const [completeForm, setCompleteForm] = useState({
    receiver_name: '',
    product_name: '',
    quantity: '',
    unit_type: 'unit',
    total_cost: '',
    amount_paid: '',
    notes: '',
  });
  const [oldDebts, setOldDebts] = useState(0);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [products, setProducts] = useState([]);
  const [quantityError, setQuantityError] = useState('');
  const [selectedProductStock, setSelectedProductStock] = useState(0);
  const [workers, setWorkers] = useState([]);
  const [receivers, setReceivers] = useState([]);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.filter(t => t.worker_id === user.id));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/tasks/${id}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'فشل');
    }
  };

  // إلغاء مهمة
  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelLoading(true);
    try {
      await api.patch(`/tasks/${cancelModal.id}/cancel`, { cancellation_reason: cancelReason });
      setCancelModal(null);
      setCancelReason('');
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'فشل الإلغاء');
    } finally {
      setCancelLoading(false);
    }
  };

  // فتح مودال التحميل
  const openCompleteModal = async (task) => {
    setCompleteModal(task);
    setCompleteForm({
      receiver_name: task.receiver_name || '',
      product_name: task.product_name || '',
      quantity: task.quantity || '',
      unit_type: task.unit_type || 'unit',
      total_cost: task.price || '',
      amount_paid: '',
      notes: task.notes || '',
    });
    setOldDebts(0);
    setCompleteError('');
    setQuantityError('');
    setSelectedProductStock(0);

    // جلب بيانات المخزون لعرض المنتجات المتاحة والتحقق منها
    try {
      const res = await api.get('/inventory');
      setProducts(res.data);
    } catch (err) {
      console.error('فشل جلب المخزون:', err);
    }

    // جلب بيانات المستلم لو موجود - دايماً بنضبط المديونية حتى لو 0
    if (task.receiver_name) {
      try {
        const res = await api.get(`/tasks/complete-data/${encodeURIComponent(task.receiver_name)}`);
        setOldDebts(res.data.old_debts || 0);
      } catch (err) {
        console.error('فشل جلب بيانات المستلم:', err);
      }
    }

  };

  // عند تغيير اسم المنتج، نتحقق من المخزون
  const handleProductChange = (productName) => {
    setCompleteForm({...completeForm, product_name: productName});
    const found = products.find(p => p.product_name === productName);
    if (found) {
      const stock = parseFloat(found.quantity) || 0;
      setSelectedProductStock(stock);
      // التحقق من الكمية مقابل المخزون
      const qty = parseFloat(completeForm.quantity) || 0;
      if (qty > 0 && qty > stock) {
        setQuantityError(`الكمية المطلوبة (${qty}) أكبر من المتاح في المخزون (${stock}) ${found.unit_type === 'weight' ? 'كجم' : 'قطعة'}`);
      } else {
        setQuantityError('');
      }
      // ضبط نوع الوحدة حسب المنتج
      if (found.unit_type) {
        setCompleteForm(prev => ({...prev, unit_type: found.unit_type}));
      }
    } else {
      setSelectedProductStock(0);
      setQuantityError('');
    }
  };

  // عند تغيير الكمية، نتحقق من المخزون
  const handleQuantityChange = (qty) => {
    setCompleteForm({...completeForm, quantity: qty});
    if (completeForm.product_name && selectedProductStock > 0) {
      const parsedQty = parseFloat(qty) || 0;
      if (parsedQty > selectedProductStock) {
        setQuantityError(`الكمية المطلوبة (${parsedQty}) أكبر من المتاح في المخزون (${selectedProductStock}) ${completeForm.unit_type === 'weight' ? 'كجم' : 'قطعة'}`);
      } else {
        setQuantityError('');
      }
    }
  };

  // إكمال المهمة (تحميل)
  const handleComplete = async (e) => {
    e.preventDefault();
    setCompleteError('');
    setCompleteLoading(true);
    try {
      await api.post(`/tasks/${completeModal.id}/complete`, {
        receiver_name: completeForm.receiver_name,
        product_name: completeForm.product_name,
        quantity: completeForm.quantity ? parseFloat(completeForm.quantity) : 0,
        unit_type: completeForm.unit_type,
        total_cost: completeForm.total_cost ? parseFloat(completeForm.total_cost) : 0,
        amount_paid: completeForm.amount_paid ? parseFloat(completeForm.amount_paid) : 0,
        notes: completeForm.notes,
      });
      setCompleteModal(null);
      fetchTasks();
    } catch (err) {
      setCompleteError(err.response?.data?.error || 'فشل إكمال المهمة');
    } finally {
      setCompleteLoading(false);
    }
  };

  const statusLabels = {
    'pending': 'معلق',
    'in_progress': 'قيد التنفيذ',
    'awaiting_approval': 'بانتظار الموافقة',
    'completed': 'مكتملة',
    'cancelled': 'ملغية',
    'delivered': 'تم التحميل',
    'loaded': 'تم استلام الأموال',
    'delivered_and_loaded': 'تم التحميل والاستلام',
  };

  // حساب الإجمالي
  const calcTotal = () => {
    const qty = parseFloat(completeForm.quantity) || 0;
    const unitPrice = completeModal ? parseFloat(completeModal.price) / (parseFloat(completeModal.quantity) || 1) : 0;
    return (qty * unitPrice).toFixed(1);
  };

  if (loading) return <div className="text-center py-8">تحميل...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">مهامي</h3>
      {tasks.length === 0 ? (
        <p className="text-gray-400 text-center">لا توجد مهام</p>
      ) : (
        tasks.map(task => (
          <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm mb-3 border-r-4 border-green-500">
            <div className="flex justify-between">
              <h4 className="font-bold text-gray-800">{task.title}</h4>
              <span className="text-xs bg-gray-100 px-3 py-1 rounded-full">{statusLabels[task.status] || task.status}</span>
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {task.product_name && `${task.product_name} | `}
              {task.quantity > 0 && `كمية: ${task.quantity} ${task.unit_type === 'weight' ? 'كجم' : task.unit_type === 'unit' ? 'قطعة' : ''} | `}
              سعر: {task.price}
            </div>
            {task.receiver_name && <div className="text-sm text-gray-500">المستلم: {task.receiver_name}</div>}
            {task.notes && <div className="text-sm text-gray-500 mt-1 bg-blue-50 p-2 rounded-lg">📝 {task.notes}</div>}
            {task.reminder_time && (
              <div className="text-xs text-orange-500 flex items-center gap-1 mt-1"><Clock size={12} /> {new Date(task.reminder_time).toLocaleString('ar-EG')}</div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {task.status === 'pending' && (
                <button onClick={() => updateStatus(task.id, 'in_progress')} className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg text-sm"><Play size={14} /> بدء</button>
              )}
              {task.status === 'in_progress' && (
                <>
                  <button onClick={() => openCompleteModal(task)} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"><CheckCircle size={14} /> تحميل</button>
                  <button onClick={() => { setCancelModal(task); setCancelReason(''); }} className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-lg text-sm"><XCircle size={14} /> إلغاء</button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* مودال الإلغاء */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-red-500" />
              <h4 className="font-bold text-gray-800">إلغاء المهمة</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">لماذا تريد إلغاء "{cancelModal.title}"؟</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm"
              placeholder="اكتب سبب الإلغاء..."
              rows="3"
              required
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-bold"
              >
                تراجع
              </button>
              <button
                onClick={handleCancel}
                disabled={!cancelReason.trim() || cancelLoading}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {cancelLoading ? 'جاري...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال التحميل (إكمال المهمة) */}
      {completeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 w-full max-w-lg shadow-2xl my-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-800 flex items-center gap-2">
                <Package size={20} className="text-blue-600" />
                إكمال المهمة: {completeModal.title}
              </h4>
              <button onClick={() => setCompleteModal(null)} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </button>
            </div>

            {completeError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{completeError}</div>
            )}

            <form onSubmit={handleComplete} className="space-y-3">
              {/* المستلم */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1"><Users size={12} /> المستلم</label>
                <input
                  type="text"
                  value={completeForm.receiver_name}
                  onChange={e => setCompleteForm({...completeForm, receiver_name: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  placeholder="اسم المستلم"
                />
              </div>

              {/* المنتج - مع اختيار من المخزون */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1"><Package size={12} /> المنتج</label>
                <input
                  type="text"
                  value={completeForm.product_name}
                  onChange={e => handleProductChange(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  placeholder="اسم المنتج"
                  list="complete-products-list"
                />
                <datalist id="complete-products-list">
                  {[...products].sort((a, b) => a.product_name?.localeCompare(b.product_name, 'ar')).map(p => (
                    <option key={p.id} value={p.product_name}>
                      {p.product_name} - متوفر: {p.quantity} {p.unit_type === 'weight' ? 'كجم' : 'قطعة'}
                    </option>
                  ))}
                </datalist>
                {products.length > 0 && (
                  <div className="mt-2">
                    <details className="text-sm">
                      <summary className="text-blue-600 cursor-pointer font-medium">
                        <Box size={14} className="inline ml-1" />
                        اختيار منتج من المخزون ({products.length})
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
                        {[...products].sort((a, b) => a.product_name?.localeCompare(b.product_name, 'ar')).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleProductChange(p.product_name)}
                            className={`text-right p-2 rounded-lg border text-xs transition-all ${
                              completeForm.product_name === p.product_name
                                ? 'bg-green-100 border-green-300 text-green-800'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                            }`}
                          >
                            <div className="font-bold">{p.product_name}</div>
                            <div className={`${parseFloat(p.quantity) <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                              المخزون: {p.quantity} {p.unit_type === 'weight' ? 'كجم' : 'قطعة'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
                {completeForm.product_name && selectedProductStock > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    المتاح في المخزون: <span className="font-bold">{selectedProductStock} {completeForm.unit_type === 'weight' ? 'كجم' : 'قطعة'}</span>
                  </div>
                )}
                {quantityError && (
                  <div className="bg-red-50 text-red-700 p-2 rounded-xl mt-1 text-xs border border-red-200">
                    ⚠️ {quantityError}
                  </div>
                )}
              </div>

              {/* الكمية والنوع */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">النوع</label>
                  <select
                    value={completeForm.unit_type}
                    onChange={e => setCompleteForm({...completeForm, unit_type: e.target.value})}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  >
                    <option value="unit">عدد</option>
                    <option value="weight">وزن (كجم)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">{completeForm.unit_type === 'weight' ? 'الوزن (كجم)' : 'الكمية'}</label>
                  <input
                    type="number"
                    step={completeForm.unit_type === 'weight' ? '0.001' : '1'}
                    value={completeForm.quantity}
                    onChange={e => handleQuantityChange(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  />
                </div>
              </div>

              {/* تكلفة المنتج (الإجمالي) */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1"><DollarSign size={12} /> تكلفة المنتج (إجمالي)</label>
                <input
                  type="number"
                  step="0.01"
                  value={completeForm.total_cost}
                  onChange={e => setCompleteForm({...completeForm, total_cost: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  placeholder="إجمالي التكلفة"
                />
              </div>

              {/* العميل هيدفع كام */}
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1"><DollarSign size={12} /> العميل هيدفع كام</label>
                <input
                  type="number"
                  step="0.01"
                  value={completeForm.amount_paid}
                  onChange={e => setCompleteForm({...completeForm, amount_paid: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  placeholder="المبلغ المدفوع"
                />
                {completeForm.amount_paid && parseFloat(completeForm.amount_paid) < parseFloat(completeForm.total_cost) && (
                  <div className="text-xs text-orange-600 mt-1">
                    المتبقي: {(parseFloat(completeForm.total_cost) - parseFloat(completeForm.amount_paid)).toFixed(1)} ج.م (مديونية)
                  </div>
                )}
              </div>

              {/* المديونيات القديمة - تظهر دايماً */}
              <div className={`p-3 rounded-xl border ${oldDebts > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 text-sm font-bold">
                  <AlertTriangle size={16} className={oldDebts > 0 ? 'text-red-700' : 'text-green-700'} />
                  <span className={oldDebts > 0 ? 'text-red-700' : 'text-green-700'}>
                    المديونية: {oldDebts.toFixed(1)} ج.م
                  </span>
                </div>
                {oldDebts > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    هذا المستلم عليه مديونيات سابقة. يرجى مراعاة ذلك.
                  </p>
                )}
              </div>


              {/* ملخص المهمة */}
              {completeForm.quantity && completeForm.total_cost && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-800 mb-2">
                    <TrendingUp size={14} /> ملخص المهمة
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">التكلفة الإجمالية:</span>
                    <span className="font-bold">{parseFloat(completeForm.total_cost).toFixed(1)} ج.م</span>
                  </div>
                  {completeForm.amount_paid && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-600">المدفوع:</span>
                      <span className="font-bold text-green-700">{parseFloat(completeForm.amount_paid).toFixed(1)} ج.م</span>
                    </div>
                  )}
                  {completeForm.amount_paid && parseFloat(completeForm.amount_paid) < parseFloat(completeForm.total_cost) && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-600">المتبقي:</span>
                      <span className="font-bold text-red-600">{(parseFloat(completeForm.total_cost) - parseFloat(completeForm.amount_paid)).toFixed(1)} ج.م</span>
                    </div>
                  )}
                </div>
              )}

              {/* ملاحظات */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">ملاحظات</label>
                <textarea
                  value={completeForm.notes}
                  onChange={e => setCompleteForm({...completeForm, notes: e.target.value})}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                  rows="2"
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              {/* أزرار الحفظ */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteModal(null)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={completeLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <CheckCircle size={16} />
                  {completeLoading ? 'جاري...' : 'تأكيد التحميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerTasks;
