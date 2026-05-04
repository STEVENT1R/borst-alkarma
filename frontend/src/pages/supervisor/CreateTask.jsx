import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Send, User, Package, DollarSign, Clock, Users, TrendingUp } from 'lucide-react';

const CreateTask = () => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [receivers, setReceivers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    worker_id: '',
    title: '',
    receiver_name: '',
    product_name: '',
    quantity: '',
    unit_type: 'unit',
    unit_selling_price: '', // سعر بيع الوحدة (يدوي)
    reminder_time: '',
    notes: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  // إحضار سعر الشراء للمنتج المختار
  const selectedProduct = products.find(p => p.product_name === form.product_name) || null;
  const purchasePrice = selectedProduct ? parseFloat(selectedProduct.purchase_price || 0) : 0;
  const quantity = parseFloat(form.quantity) || 0;
  const unitSellingPrice = parseFloat(form.unit_selling_price) || 0;

  // حساب الإجمالي والربح
  const totalSelling = quantity * unitSellingPrice;
  const totalCost = quantity * purchasePrice;
  const profit = totalSelling - totalCost;

  // دالة لعرض الأرقام: للعدد → صحيح، للوزن → رقم عشري واحد
  const fmt = (num) => form.unit_type === 'weight' ? num.toFixed(1) : Math.floor(num) === num ? num.toString() : num.toFixed(1);

  useEffect(() => {
    api.get('/users/workers').then(res => setWorkers(res.data)).catch(() => {});
    api.get('/inventory').then(res => setProducts(res.data)).catch(() => {});
    api.get('/receivers').then(res => setReceivers(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.worker_id || !form.title) {
      return setMessage({ type: 'error', text: 'يرجى اختيار العامل وإدخال عنوان المهمة' });
    }
    setLoading(true);
    try {
      await api.post('/tasks', {
        worker_id: parseInt(form.worker_id),
        title: form.title,
        receiver_name: form.receiver_name || null,
        product_name: form.product_name || null,
        quantity: form.quantity ? parseFloat(form.quantity) : 0,
        unit_type: form.unit_type,
        price: totalSelling, // السعر الإجمالي اللي هيتحط في المهمة
        reminder_time: form.reminder_time || null,
        notes: form.notes || null,
      });
      setMessage({ type: 'success', text: 'تم إنشاء المهمة بنجاح' });
      setForm({
        worker_id: '', title: '', receiver_name: '', product_name: '',
        quantity: '', unit_type: 'unit', unit_selling_price: '',
        reminder_time: '', notes: ''
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">إنشاء مهمة جديدة</h3>
      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
        {/* صاحب المهمة */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><User size={16} /> صاحب المهمة</label>
          <select value={form.worker_id} onChange={e => setForm({...form, worker_id: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" required>
            <option value="">اختر...</option>
            <option value={user.id}>شخصي (أنا)</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.username}</option>)}
          </select>
        </div>

        {/* عنوان المهمة */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Send size={16} /> عنوان المهمة</label>
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="مثال: توصيل طلبية" required />
        </div>

        {/* المستلم */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Users size={16} /> المستلم (اختياري)</label>
          <div className="flex gap-2">
            <input value={form.receiver_name} onChange={e => setForm({...form, receiver_name: e.target.value})} className="flex-1 p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="اسم المستلم" list="receivers-list" />
            <datalist id="receivers-list">
              {receivers.map(r => <option key={r.id} value={r.name} />)}
            </datalist>
          </div>
        </div>

        {/* المنتج - اختيار من المخزون أو كتابة يدوية */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Package size={16} /> المنتج (اختياري)</label>
          <div className="relative">
            <input
              value={form.product_name}
              onChange={e => setForm({...form, product_name: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 pr-10"
              placeholder="اكتب اسم المنتج..."
              list="products-list"
            />
            <datalist id="products-list">
              {products.map(p => (
                <option key={p.id} value={p.product_name}>
                  {p.product_name} {p.unit_type === 'weight' ? '(وزن)' : `(${p.quantity} ${p.unit_type === 'weight' ? 'كجم' : 'قطعة'})`}
                </option>
              ))}
            </datalist>
            {products.length > 0 && (
              <div className="mt-2">
                <details className="text-sm">
                  <summary className="text-blue-600 cursor-pointer font-medium">اختيار من المخزون ({products.length})</summary>
                  <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
                    {products.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            product_name: p.product_name,
                            unit_type: p.unit_type || 'unit',
                          });
                        }}
                        className={`text-right p-2 rounded-lg border text-xs transition-all ${
                          form.product_name === p.product_name
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
                        }`}
                      >
                        <div className="font-bold">{p.product_name}</div>
                        <div className="text-gray-500">
                          {p.quantity} {p.unit_type === 'weight' ? 'كجم' : 'قطعة'}
                          <div className="text-yellow-800">شراء: {p.purchase_price || 0} ج للوحدة</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* الكمية والنوع وسعر البيع */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">النوع</label>
            <select value={form.unit_type} onChange={e => setForm({...form, unit_type: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50">
              <option value="unit">عدد</option>
              <option value="weight">وزن (كجم)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{form.unit_type === 'weight' ? 'الوزن (كجم)' : 'الكمية'}</label>
            <input type="number" step={form.unit_type === 'weight' ? '0.001' : '1'} value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
          </div>
        </div>

        {/* سعر بيع الوحدة */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1"><DollarSign size={14} /> سعر بيع الوحدة</label>
          <input type="number" step="0.01" value={form.unit_selling_price} onChange={e => setForm({...form, unit_selling_price: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="مثال: 105" />
        </div>

        {/* أزرار سريعة للوزن (تظهر فقط عند اختيار وزن) */}
        {form.unit_type === 'weight' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">أوزان سريعة</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'تمن', value: 0.125 },
                { label: 'ربع', value: 0.25 },
                { label: 'نص', value: 0.5 },
                { label: 'ثلاثة أرباع', value: 0.75 },
                { label: '1 كجم', value: 1 },
                { label: '1.5 كجم', value: 1.5 },
                { label: '2 كجم', value: 2 },
                { label: '2.5 كجم', value: 2.5 },
                { label: '3 كجم', value: 3 },
                { label: '5 كجم', value: 5 },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({...form, quantity: opt.value})}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                    parseFloat(form.quantity) === opt.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ملخص الحساب - يظهر لما يكون فيه منتج وكمية وسعر */}
        {selectedProduct && quantity > 0 && unitSellingPrice > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-800 mb-2">
              <TrendingUp size={18} /> ملخص المهمة
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">سعر شراء الوحدة:</span>
              <span className="font-bold text-gray-800">{fmt(purchasePrice)} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">سعر بيع الوحدة:</span>
              <span className="font-bold text-green-700">{fmt(unitSellingPrice)} ج.م</span>
            </div>
            <div className="border-t border-blue-200 my-1" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">استهلاك المخزن:</span>
              <span className="font-bold text-orange-500">{fmt(totalCost)} ج.م</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="font-bold text-gray-700">الربح المتوقع:</span>
              <span className={`font-extrabold text-lg ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(profit)} ج.م
              </span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-gray-600 font-bold">الإجمالي المباع:</span>
              <span className="font-extrabold text-lg text-gray-800">{fmt(totalSelling)} ج.م</span>
            </div>
          </div>
        )}

        {/* تذكير */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Clock size={16} /> تذكير (اختياري)</label>
          <input type="datetime-local" value={form.reminder_time} onChange={e => setForm({...form, reminder_time: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
        </div>

        {/* ملاحظات */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Send size={16} /> ملاحظات (اختياري)</label>
          <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" placeholder="أي ملاحظات إضافية..." rows="3" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Send size={18} /> {loading ? 'جاري...' : 'إنشاء المهمة'}
        </button>
      </form>
    </div>
  );
};

export default CreateTask;
