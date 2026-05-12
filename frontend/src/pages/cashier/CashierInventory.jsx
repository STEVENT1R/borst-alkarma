import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, Plus, Search, PackagePlus, Edit3, XCircle } from 'lucide-react';

const CashierInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [spoilageForm, setSpoilageForm] = useState({ show: false, product: null, quantity: '', description: '' });

  const [form, setForm] = useState({
    product_name: '',
    quantity: '',
    unit_type: 'unit',
    purchase_price: '',
    retail_price: '',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/sales/shop-inventory');
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_name || !form.quantity) {
      return setMessage({ type: 'error', text: 'يرجى إدخال اسم المنتج والكمية' });
    }

    try {
      await api.post('/sales/shop-inventory', {
        product_name: form.product_name,
        quantity: parseFloat(form.quantity),
        unit_type: form.unit_type,
        purchase_price: parseFloat(form.purchase_price || 0),
        retail_price: parseFloat(form.retail_price || 0),
      });

      setMessage({ type: 'success', text: editProduct ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح' });
      setForm({ product_name: '', quantity: '', unit_type: 'unit', purchase_price: '', retail_price: '' });
      setShowForm(false);
      setEditProduct(null);
      fetchInventory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل في حفظ المنتج' });
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setForm({
      product_name: product.product_name,
      quantity: parseFloat(product.quantity).toString(),
      unit_type: product.unit_type || 'unit',
      purchase_price: parseFloat(product.purchase_price || 0).toString(),
      retail_price: parseFloat(product.retail_price || 0).toString(),
    });
    setShowForm(true);
    setMessage({ type: '', text: '' });
  };

  const handleSpoilage = async (e) => {
    e.preventDefault();
    if (!spoilageForm.quantity || parseFloat(spoilageForm.quantity) <= 0) {
      return setMessage({ type: 'error', text: 'يرجى إدخال كمية صحيحة' });
    }
    try {
      await api.post('/sales/shop-spoilage', {
        product_name: spoilageForm.product.product_name,
        quantity: parseFloat(spoilageForm.quantity),
        description: spoilageForm.description,
      });
      setMessage({ type: 'success', text: `تم تسجيل هالك: ${spoilageForm.product.product_name}` });
      setSpoilageForm({ show: false, product: null, quantity: '', description: '' });
      fetchInventory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل تسجيل الهالك' });
    }
  };

  const handleAddNew = () => {
    setEditProduct(null);
    setForm({ product_name: '', quantity: '', unit_type: 'unit', purchase_price: '', retail_price: '' });
    setShowForm(true);
    setMessage({ type: '', text: '' });
  };

  const filtered = inventory.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <Package size={24} className="text-blue-600" />
        قسم المخزن
      </h3>

      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* شريط البحث + زر إضافة */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..."
            className="w-full p-3 pr-10 border border-gray-200 rounded-xl bg-gray-50"
          />
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 rounded-xl flex items-center gap-1 font-bold text-sm"
        >
          <Plus size={18} /> إضافة
        </button>
      </div>

      {/* نموذج الإضافة/التعديل */}
      {showForm && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border mb-4">
          <div className="flex items-center gap-2 mb-3">
            {editProduct ? <Edit3 size={18} className="text-blue-600" /> : <PackagePlus size={18} className="text-blue-600" />}
            <span className="font-bold">{editProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">اسم المنتج</label>
              <input
                value={form.product_name}
                onChange={e => setForm({ ...form, product_name: e.target.value })}
                className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                placeholder="اسم المنتج"
                required
                readOnly={!!editProduct}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">الكمية</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="الكمية"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">نوع الوحدة</label>
                <select
                  value={form.unit_type}
                  onChange={e => setForm({ ...form, unit_type: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                >
                  <option value="unit">قطعة</option>
                  <option value="weight">وزن (كجم)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">سعر الشراء (للقطعة/كجم)</label>
                <input
                  type="number"
                  value={form.purchase_price}
                  onChange={e => setForm({ ...form, purchase_price: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="سعر الشراء"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">سعر التجزئة</label>
                <input
                  type="number"
                  value={form.retail_price}
                  onChange={e => setForm({ ...form, retail_price: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="سعر البيع"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditProduct(null); }}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold"
              >
                {editProduct ? 'تحديث المنتج' : 'إضافة المنتج'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة المنتجات */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <Package size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400">{search ? 'لا توجد منتجات مطابقة' : 'المخزن فارغ'}</p>
          </div>
        ) : (
          [...filtered].sort((a, b) => a.product_name?.localeCompare(b.product_name, 'ar')).map(product => (
            <div key={product.id} className="bg-white p-3 rounded-xl border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg">{product.product_name}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSpoilageForm({ show: true, product, quantity: '', description: '' })}
                    className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center hover:bg-orange-200 transition-colors"
                    title="هالك"
                  >
                    <XCircle size={14} className="text-orange-600" />
                  </button>
                  <button
                    onClick={() => handleEdit(product)}
                    className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:bg-blue-200 transition-colors"
                  >
                    <Edit3 size={14} className="text-blue-600" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                <div className="bg-green-50 p-2 rounded-lg text-center">
                  <div className="text-green-700 font-bold">{parseFloat(product.quantity).toFixed(1)}</div>
                  <div>{product.unit_type === 'weight' ? 'كجم' : 'قطعة'}</div>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg text-center">
                  <div className="text-amber-700 font-bold">{parseFloat(product.purchase_price || 0).toFixed(1)} ج</div>
                  <div>سعر الشراء</div>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg text-center">
                  <div className="text-purple-700 font-bold">{parseFloat(product.retail_price || 0).toFixed(1)} ج</div>
                  <div>سعر التجزئة</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* نافذة تسجيل هالك */}
      {spoilageForm.show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSpoilageForm({ show: false, product: null, quantity: '', description: '' })}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <XCircle size={20} className="text-orange-500" />
              <h4 className="font-bold text-lg">تسجيل هالك</h4>
            </div>
            <form onSubmit={handleSpoilage} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">المنتج</label>
                <div className="bg-gray-50 p-2.5 rounded-xl border text-gray-800 font-bold">
                  {spoilageForm.product?.product_name}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">
                  الكمية (المتوفر: {spoilageForm.product?.quantity} {spoilageForm.product?.unit_type === 'weight' ? 'كجم' : 'قطعة'})
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={spoilageForm.product?.quantity}
                  value={spoilageForm.quantity}
                  onChange={e => setSpoilageForm({ ...spoilageForm, quantity: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="الكمية التالفة"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 block mb-1">ملاحظات (اختياري)</label>
                <input
                  value={spoilageForm.description}
                  onChange={e => setSpoilageForm({ ...spoilageForm, description: e.target.value })}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="سبب الهالك..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSpoilageForm({ show: false, product: null, quantity: '', description: '' })}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-bold hover:bg-orange-600"
                >
                  تسجيل هالك
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierInventory;
