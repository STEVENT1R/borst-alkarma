import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Package, DollarSign, ArrowUpRight, ArrowDownRight, ArrowLeft } from 'lucide-react';

const WorkerLoadManagement = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [workerData, setWorkerData] = useState(null);
  const [workerName, setWorkerName] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // حالة الإضافة
  const [showGiveLoad, setShowGiveLoad] = useState(false);
  const [showReturnLoad, setShowReturnLoad] = useState(false);
  const [showCollectCash, setShowCollectCash] = useState(false);

  // حقول إضافة بضاعة
  const [giveProduct, setGiveProduct] = useState('');
  const [giveQty, setGiveQty] = useState('');

  // حقول استرجاع بضاعة
  const [returnProduct, setReturnProduct] = useState('');
  const [returnQty, setReturnQty] = useState('');

  // حقول استلام عهدة
  const [collectAmount, setCollectAmount] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get(`/workers-load/${workerId}`);
      setWorkerData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      setInventory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkerName = async () => {
    try {
      const res = await api.get('/users/all');
      const worker = res.data.find(u => u.id === parseInt(workerId));
      if (worker) setWorkerName(worker.username);
    } catch (err) {}
  };

  useEffect(() => {
    Promise.all([
      fetchData(),
      fetchWorkerName(),
      fetchInventory(),
    ]).finally(() => setLoading(false));
  }, [workerId]);

  // إضافة بضاعة من المخزن للعامل
  const handleGiveLoad = async (e) => {
    e.preventDefault();
    if (!giveProduct || !giveQty) return;
    try {
      const res = await api.post(`/workers-load/${workerId}/give-load`, {
        product_name: giveProduct,
        quantity: parseFloat(giveQty),
      });
      setMessage({ type: 'success', text: res.data.message });
      setGiveProduct('');
      setGiveQty('');
      setShowGiveLoad(false);
      fetchData();
      fetchInventory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  // استرجاع بضاعة من العامل للمخزن الأصلي
  const handleReturnLoad = async (e) => {
    e.preventDefault();
    if (!returnProduct || !returnQty) return;
    try {
      const res = await api.post(`/workers-load/${workerId}/return-load`, {
        product_name: returnProduct,
        quantity: parseFloat(returnQty),
      });
      setMessage({ type: 'success', text: res.data.message });
      setReturnProduct('');
      setReturnQty('');
      setShowReturnLoad(false);
      fetchData();
      fetchInventory();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  // استلام عهدة مالية (تتخصم تلقائي من العهدة)
  const handleCollectCash = async (e) => {
    e.preventDefault();
    if (!collectAmount) return;
    try {
      const res = await api.post(`/workers-load/${workerId}/collect-cash`, {
        amount: parseFloat(collectAmount),
      });
      setMessage({ type: 'success', text: res.data.message });
      setCollectAmount('');
      setShowCollectCash(false);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // المنتجات اللي مع العامل حالياً (للاسترجاع)
  const workerProducts = workerData?.load || [];
  // المنتجات المتاحة في المخزن (للإضافة)
  const availableProducts = inventory.filter(item => parseFloat(item.quantity) > 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/supervisor/manage-workers')} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h3 className="text-2xl font-bold text-gray-800">إدارة {workerName}</h3>
          <p className="text-sm text-gray-400">إضافة بضاعة - استلام عهدة - استرجاع بضاعة</p>
        </div>
      </div>

      {/* رسالة */}
      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* الرصيد المالي */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100 mb-4">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <DollarSign size={20} className="text-green-600" />
          <span className="text-sm font-medium">العهدة المالية مع العامل</span>
        </div>
        <div className="text-4xl font-extrabold text-green-700">
          {workerData?.cash_balance?.toFixed(1) || '0'} ج.م
        </div>
        <div className="text-xs text-gray-400 mt-1">
          إجمالي قيمة البضاعة: {workerData?.total_goods_value?.toFixed(1) || '0'} ج.م
        </div>
      </div>

      {/* المنتجات في العهدة */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Package size={20} className="text-amber-600" />
          <span className="font-bold text-gray-800">البضاعة في عهدة العامل</span>
        </div>
        {workerProducts.length === 0 ? (
          <div className="bg-amber-50 p-4 rounded-xl text-amber-700 text-sm">
            لا توجد بضاعة في عهدة العامل حالياً
          </div>
        ) : (
          <div className="space-y-2">
            {workerProducts.map((item, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center">
                <span className="font-medium text-gray-800">{item.product_name}</span>
                <span className="font-bold text-amber-700">
                  {parseFloat(item.quantity).toFixed(1)}
                  <span className="text-xs mr-1 text-gray-400">{item.unit_type === 'weight' ? 'كجم' : 'قطعة'}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* أزرار الإجراءات - 3 أزرار فقط */}
      <div className="space-y-3">
        {/* 1- إضافة بضاعة من المخزن */}
        <button
          onClick={() => { setShowGiveLoad(true); setShowReturnLoad(false); setShowCollectCash(false); }}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg"
        >
          <ArrowUpRight size={22} /> إضافة بضاعة
        </button>
        <p className="text-xs text-gray-400 text-center -mt-2 mb-1">إضافة بضاعة من المخزن للعامل</p>

        {/* 2- استلام عهدة */}
        <button
          onClick={() => { setShowCollectCash(true); setShowGiveLoad(false); setShowReturnLoad(false); }}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg"
        >
          <DollarSign size={22} /> استلام عهدة
        </button>
        <p className="text-xs text-gray-400 text-center -mt-2 mb-1">يتم خصم المبلغ تلقائي من العهدة المالية للعامل</p>

        {/* 3- استرجاع بضاعة للمخزن الأصلي */}
        <button
          onClick={() => { setShowReturnLoad(true); setShowGiveLoad(false); setShowCollectCash(false); }}
          className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-lg"
        >
          <ArrowDownRight size={22} /> استرجاع بضاعة
        </button>
        <p className="text-xs text-gray-400 text-center -mt-2 mb-1">استرجاع البضاعة من العامل للمخزن الأصلي</p>
      </div>

      {/* مودال إضافة بضاعة من المخزن */}
      {showGiveLoad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowGiveLoad(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-lg mb-4">📦 إضافة بضاعة للعامل {workerName}</h4>
            <form onSubmit={handleGiveLoad} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج من المخزن</label>
                <select
                  value={giveProduct}
                  onChange={e => setGiveProduct(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  required
                >
                  <option value="">-- اختر المنتج --</option>
                  {availableProducts.map((item, i) => (
                    <option key={i} value={item.product_name}>
                      {item.product_name} (متوفر: {parseFloat(item.quantity).toFixed(1)} {item.unit_type === 'weight' ? 'كجم' : 'قطعة'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
                <input
                  type="number"
                  step="0.1"
                  value={giveQty}
                  onChange={e => setGiveQty(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="الكمية"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold">
                  إضافة
                </button>
                <button type="button" onClick={() => setShowGiveLoad(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال استلام عهدة مالية */}
      {showCollectCash && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCollectCash(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-lg mb-4">💰 استلام عهدة مالية من {workerName}</h4>
            <p className="text-sm text-gray-500 mb-4">الرصيد الحالي للعهدة: <span className="font-bold text-green-700">{workerData?.cash_balance?.toFixed(1) || '0'} ج.م</span></p>
            <form onSubmit={handleCollectCash} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ المستلم</label>
                <input
                  type="number"
                  step="0.01"
                  value={collectAmount}
                  onChange={e => setCollectAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="المبلغ"
                  required
                />
                <p className="text-xs text-blue-600 mt-1">⚡ سيتم خصم المبلغ تلقائياً من العهدة</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold">
                  استلام
                </button>
                <button type="button" onClick={() => setShowCollectCash(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال استرجاع بضاعة للمخزن الأصلي */}
      {showReturnLoad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowReturnLoad(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-lg mb-4">📦 استرجاع بضاعة من {workerName}</h4>
            <form onSubmit={handleReturnLoad} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج (من عهدة العامل)</label>
                <select
                  value={returnProduct}
                  onChange={e => setReturnProduct(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  required
                >
                  <option value="">-- اختر المنتج --</option>
                  {workerProducts.map((item, i) => (
                    <option key={i} value={item.product_name}>
                      {item.product_name} (مع العامل: {parseFloat(item.quantity).toFixed(1)} {item.unit_type === 'weight' ? 'كجم' : 'قطعة'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المرتجعة</label>
                <input
                  type="number"
                  step="0.1"
                  value={returnQty}
                  onChange={e => setReturnQty(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  placeholder="الكمية"
                  required
                />
                <p className="text-xs text-amber-600 mt-1">⚡ سيتم إرجاع البضاعة للمخزن الأصلي</p>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 text-white py-3 rounded-xl font-bold">
                  استرجاع
                </button>
                <button type="button" onClick={() => setShowReturnLoad(false)} className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* سجل حركة العهدة المالية */}
      {workerData?.custody_log?.length > 0 && (
        <div className="mt-6 mb-4">
          <h4 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-600" />
            سجل حركة العهدة المالية
          </h4>
          <div className="space-y-2">
            {workerData.custody_log.map((log, index) => {
              const isDeposit = log.type === 'collected_from_tasks' || log.type === 'received_from_supervisor';
              return (
                <div key={index} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-2">
                      {isDeposit ? (
                        <ArrowUpRight size={16} className="text-green-500 mt-1 shrink-0" />
                      ) : (
                        <ArrowDownRight size={16} className="text-red-500 mt-1 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm text-gray-700">{log.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={`text-base font-bold ${isDeposit ? 'text-green-600' : 'text-red-600'}`}>
                      {isDeposit ? '+' : '-'}{parseFloat(log.amount).toFixed(1)} ج.م
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerLoadManagement;
