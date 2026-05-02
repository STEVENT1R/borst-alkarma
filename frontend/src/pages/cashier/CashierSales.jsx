import { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShoppingCart, Search, CheckCircle, AlertCircle, Package, X, Plus, Trash2, ChevronLeft } from 'lucide-react';

const CashierSales = () => {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [showProductList, setShowProductList] = useState(true);

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

  const filteredProducts = inventory.filter(p =>
    p.product_name.toLowerCase().includes(search.toLowerCase()) && parseFloat(p.quantity) > 0
  );

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setQuantity('1');
    setSalePrice(product.retail_price ? product.retail_price.toString() : (parseFloat(product.purchase_price) * 1.2).toFixed(2));
    setMessage({ type: '', text: '' });
    setShowProductList(false);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || !salePrice) {
      return setMessage({ type: 'error', text: 'يرجى تحديد الكمية والسعر' });
    }

    const qty = parseFloat(quantity);
    const price = parseFloat(salePrice);

    if (qty <= 0 || price <= 0) {
      return setMessage({ type: 'error', text: 'الكمية والسعر يجب أن يكونا أكبر من صفر' });
    }

    // Check if product already in cart
    const existing = cart.find(item => item.product_name === selectedProduct.product_name);
    const totalQtyInCart = cart
      .filter(item => item.product_name === selectedProduct.product_name)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQtyInCart + qty > parseFloat(selectedProduct.quantity)) {
      return setMessage({ type: 'error', text: `المخزون غير كافٍ. المتوفر: ${parseFloat(selectedProduct.quantity).toFixed(2)} ${selectedProduct.unit_type === 'weight' ? 'كجم' : 'قطعة'}` });
    }

    setCart(prev => [...prev, {
      id: Date.now(),
      product_name: selectedProduct.product_name,
      quantity: qty,
      sale_price: price,
      unit_type: selectedProduct.unit_type,
      total: qty * price,
    }]);

    setMessage({ type: 'success', text: `تم إضافة ${qty} ${selectedProduct.unit_type === 'weight' ? 'كجم' : 'قطعة'} من ${selectedProduct.product_name} إلى الفاتورة` });
    
    // Reset selection but stay on the product form
    setQuantity('1');
    setSalePrice(selectedProduct.retail_price ? selectedProduct.retail_price.toString() : (parseFloat(selectedProduct.purchase_price) * 1.2).toFixed(2));
  };

  const handleRemoveFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const handleConfirmSale = async () => {
    if (cart.length === 0) {
      return setMessage({ type: 'error', text: 'يرجى إضافة منتجات إلى الفاتورة' });
    }

    setLoading(true);
    try {
      const res = await api.post('/sales/bulk', {
        items: cart.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          sale_price: item.sale_price,
        }))
      });

      setMessage({
        type: 'success',
        text: `تمت عملية البيع بنجاح! إجمالي المبلغ: ${cartTotal.toFixed(2)} ج`
      });

      setCart([]);
      setSelectedProduct(null);
      setQuantity('');
      setSalePrice('');
      setShowProductList(true);
      fetchInventory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل في عملية البيع' });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setQuantity('');
    setSalePrice('');
    setShowProductList(true);
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        <ShoppingCart size={24} className="text-green-600" />
        قسم البيع
      </h3>

      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* شريط تقدم الفاتورة */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl mb-4 border border-green-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-green-600" />
            <span className="font-bold text-green-700">الفاتورة الحالية</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{cart.length} منتج</span>
            <span className="text-lg font-bold text-green-700">{cartTotal.toFixed(2)} ج</span>
          </div>
        </div>
      </div>

      {/* المنتج المختار - إضافة للفاتورة */}
      {selectedProduct && !showProductList && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button onClick={handleBackToProducts} className="text-gray-400 hover:text-gray-600 ml-2">
                <ChevronLeft size={20} />
              </button>
              <Package size={20} className="text-green-600" />
              <span className="font-bold text-lg">{selectedProduct.product_name}</span>
            </div>
            <button
              onClick={handleBackToProducts}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={20} />
            </button>
          </div>
          <div className="text-sm text-gray-500 mb-3">
            <span>المخزون الحالي: {parseFloat(selectedProduct.quantity).toFixed(2)} {selectedProduct.unit_type === 'weight' ? 'كجم' : 'قطعة'}</span>
          </div>

          <form onSubmit={handleAddToCart} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">الكمية</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-center text-lg font-bold"
                  placeholder="الكمية"
                  min="0.01"
                  max={parseFloat(selectedProduct.quantity)}
                  step="0.01"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">سعر البيع للوحدة</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-center text-lg font-bold"
                  placeholder="السعر"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackToProducts}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={18} /> إضافة للفاتورة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* قائمة المنتجات للاختيار */}
      {showProductList && (
        <>
          <div className="relative mb-4">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full p-3 pr-10 border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400">
                  {search ? 'لا توجد منتجات مطابقة للبحث' : 'لا توجد منتجات في المخزن'}
                </p>
                <p className="text-xs text-gray-300 mt-1">المنتجات التي نفذت كميتها لا تظهر هنا</p>
              </div>
            ) : (
              filteredProducts.map(product => {
                const inCartQty = cart
                  .filter(item => item.product_name === product.product_name)
                  .reduce((sum, item) => sum + item.quantity, 0);
                const remaining = parseFloat(product.quantity) - inCartQty;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="w-full bg-white p-3 rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-sm transition-all flex items-center justify-between text-right"
                    disabled={remaining <= 0}
                  >
                    <div>
                      <div className="font-bold text-gray-800">{product.product_name}</div>
                      <div className="text-xs text-gray-400">
                        المخزون: {remaining.toFixed(2)} {product.unit_type === 'weight' ? 'كجم' : 'قطعة'}
                        {inCartQty > 0 && <span className="mr-2 text-blue-600">({inCartQty.toFixed(2)} في الفاتورة)</span>}
                        {product.retail_price && parseFloat(product.retail_price) > 0 && (
                          <span className="mr-2">• سعر التجزئة: {parseFloat(product.retail_price).toFixed(2)} ج</span>
                        )}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                      <Plus size={16} className="text-green-600" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* سلة الفاتورة */}
      {cart.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-3 bg-gradient-to-l from-green-50 to-white border-b">
            <div className="flex items-center justify-between">
              <span className="font-bold text-green-700">محتوى الفاتورة ({cart.length})</span>
              <span className="font-bold text-green-700">{cartTotal.toFixed(2)} ج</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {cart.map(item => (
              <div key={item.id} className="p-3 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-sm">{item.product_name}</div>
                  <div className="text-xs text-gray-400">
                    {item.quantity} {item.unit_type === 'weight' ? 'كجم' : 'قطعة'} × {item.sale_price.toFixed(2)} ج
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600 text-sm">{item.total.toFixed(2)} ج</span>
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="w-7 h-7 bg-red-50 rounded-full flex items-center justify-center hover:bg-red-100"
                  >
                    <Trash2 size={12} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 bg-gradient-to-r from-green-600 to-green-500">
            <button
              onClick={handleConfirmSale}
              disabled={loading}
              className="w-full text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'جاري إتمام البيع...' : (
                <>
                  <CheckCircle size={18} /> تأكيد البيع - {cartTotal.toFixed(2)} ج
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashierSales;
