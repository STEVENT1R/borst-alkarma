import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, Plus, Trash2, Weight, Hash, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: '', unit_type: 'unit', wholesale: '', retail: '', purchase: '', min_stock: 5 });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [editMinStock, setEditMinStock] = useState({ id: null, value: '' });
  const [spoilageForm, setSpoilageForm] = useState({ show: false, product: null, quantity: '', description: '' });

  const fetchProducts = () => api.get('/inventory').then(res => setProducts(res.data)).catch(() => {});

  useEffect(() => { fetchProducts(); }, []);

  const handleSpoilage = async (e) => {
    e.preventDefault();
    if (!spoilageForm.quantity || parseFloat(spoilageForm.quantity) <= 0) {
      return setMessage({ type: 'error', text: 'يرجى إدخال كمية صحيحة' });
    }
    try {
      await api.post('/inventory/spoilage', {
        product_name: spoilageForm.product.product_name,
        quantity: parseFloat(spoilageForm.quantity),
        description: spoilageForm.description,
      });
      setMessage({ type: 'success', text: `تم تسجيل هالك: ${spoilageForm.product.product_name}` });
      setSpoilageForm({ show: false, product: null, quantity: '', description: '' });
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل تسجيل الهالك' });
    }
  };

  const addProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || newProduct.quantity === '') return setMessage({ type: 'error', text: 'يرجى ملء الحقول' });
    setLoading(true);
    try {
      const res = await api.post('/inventory', {
        product_name: newProduct.name,
        quantity: parseFloat(newProduct.quantity),
        unit_type: newProduct.unit_type,
        wholesale_price: newProduct.wholesale ? parseFloat(newProduct.wholesale) : 0,
        retail_price: newProduct.retail ? parseFloat(newProduct.retail) : 0,
        purchase_price: newProduct.purchase ? parseFloat(newProduct.purchase) : 0,
        min_stock_level: parseFloat(newProduct.min_stock) || 5,
      });
      setMessage({ type: 'success', text: res.data.message });
      setNewProduct({ name: '', quantity: '', unit_type: 'unit', wholesale: '', retail: '', purchase: '', min_stock: 5 });
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    } finally { setLoading(false); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('حذف هذا المنتج؟')) return;
    await api.delete(`/inventory/${id}`);
    fetchProducts();
  };

  const updateMinStock = async (id) => {
    if (editMinStock.value === '') return;
    try {
      await api.put(`/inventory/${id}`, { min_stock_level: parseFloat(editMinStock.value) });
      setEditMinStock({ id: null, value: '' });
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: 'فشل تحديث الحد الأدنى' });
    }
  };

  const lowStockCount = products.filter(p => parseFloat(p.quantity) < parseFloat(p.min_stock_level || 5)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800">المخزن</h3>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-sm font-bold">
            <AlertTriangle size={16} /> {lowStockCount} منخفض
          </div>
        )}
      </div>

      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={addProduct} className="bg-white p-6 rounded-2xl shadow-sm border mb-6 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Package size={16} /> اسم المنتج</label>
          <input placeholder="اسم المنتج" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" required />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">النوع</label>
            <select value={newProduct.unit_type} onChange={e => setNewProduct({...newProduct, unit_type: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50">
              <option value="unit">عدد</option>
              <option value="weight">وزن (كجم)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {newProduct.unit_type === 'weight' ? 'الوزن (كجم)' : 'الكمية'}
            </label>
            <input type="number" step={newProduct.unit_type === 'weight' ? '0.001' : '1'} placeholder="0" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
          </div>
        </div>

        {/* أزرار سريعة للوزن */}
        {newProduct.unit_type === 'weight' && (
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
                  onClick={() => setNewProduct({...newProduct, quantity: opt.value})}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                    parseFloat(newProduct.quantity) === opt.value
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">سعر الشراء</label>
            <input type="number" step="0.01" placeholder="0.00" value={newProduct.purchase} onChange={e => setNewProduct({...newProduct, purchase: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">جملة</label>
            <input type="number" step="0.01" placeholder="0.00" value={newProduct.wholesale} onChange={e => setNewProduct({...newProduct, wholesale: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">تجزئة</label>
            <input type="number" step="0.01" placeholder="0.00" value={newProduct.retail} onChange={e => setNewProduct({...newProduct, retail: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">الحد الأدنى للمخزون</label>
          <input type="number" step="0.001" value={newProduct.min_stock} onChange={e => setNewProduct({...newProduct, min_stock: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Plus size={18} /> {loading ? 'جاري...' : 'إضافة'}
        </button>
      </form>

      <div className="space-y-2">
        {products.map(p => {
          const qty = parseFloat(p.quantity);
          const minStock = parseFloat(p.min_stock_level || 5);
          const isLow = qty < minStock;
          const isCritical = qty === 0;

          return (
            <div key={p.id} className={`flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border-r-4 ${
              isCritical ? 'border-red-500' : isLow ? 'border-yellow-400' : 'border-transparent'
            }`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">{p.product_name}</span>
                  {(isLow || isCritical) && (
                    <AlertCircle size={16} className={isCritical ? 'text-red-500' : 'text-yellow-500'} />
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {p.unit_type === 'weight' ? <Weight size={14} className="inline" /> : <Hash size={14} className="inline" />}
                  المخزون: <span className={isLow ? 'font-bold text-red-600' : ''}>{p.quantity}</span>
                  {p.unit_type === 'weight' ? ' كجم' : ' قطعة'}
                  {isLow && <span className="mr-2 text-xs">(الأدنى: {minStock})</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>شراء: {p.purchase_price}</span>
                <span>جملة: {p.wholesale_price}</span>
                <span>تجزئة: {p.retail_price}</span>

                {/* تحرير الحد الأدنى */}
                {editMinStock.id === p.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step="0.001" className="w-16 border rounded px-1 py-0.5 text-xs"
                      value={editMinStock.value} onChange={e => setEditMinStock({ ...editMinStock, value: e.target.value })}
                      autoFocus onKeyDown={e => e.key === 'Enter' && updateMinStock(p.id)}
                    />
                    <button onClick={() => updateMinStock(p.id)} className="text-green-600 text-xs">حفظ</button>
                    <button onClick={() => setEditMinStock({ id: null, value: '' })} className="text-gray-400 text-xs">إلغاء</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditMinStock({ id: p.id, value: minStock })}
                    className="text-xs text-blue-500 hover:text-blue-700"
                    title="تعديل الحد الأدنى"
                  >
                    حد: {minStock}
                  </button>
                )}

                <button
                  onClick={() => setSpoilageForm({ show: true, product: p, quantity: '', description: '' })}
                  className="text-orange-500 hover:text-orange-700"
                  title="هالك"
                >
                  <XCircle size={18} />
                </button>
                <button onClick={() => deleteProduct(p.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
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

export default Inventory;
