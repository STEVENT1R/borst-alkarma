import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Clock, Trash2, AlertTriangle, Shield, CheckCircle } from 'lucide-react';

const AutoDelete = () => {
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [result, setResult] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        if (res.data.cleanup_months) {
          setMonths(parseInt(res.data.cleanup_months));
        }
      } catch (err) {
        console.error('Failed to load settings');
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/settings', { key: 'cleanup_months', value: String(months) });
      setMessage({ type: 'success', text: `تم حفظ الإعداد: تصفية البيانات الأقدم من ${months} شهر` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل الحفظ' });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm(`سيتم حذف جميع البيانات المكتملة الأقدم من ${months} أشهر. الحسابات والمخزون الحالي والمستلمين لن يتأثروا. هل أنت متأكد؟`)) return;

    setCleaning(true);
    setMessage({ type: '', text: '' });
    setResult(null);
    try {
      const res = await api.post('/settings/cleanup');
      setResult(res.data.deleted);
      setMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشلت التصفية' });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">إعدادات تصفية البيانات</h3>

      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* فترة التصفية */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={20} className="text-blue-600" />
          <h4 className="font-bold text-gray-800">فترة الاحتفاظ بالبيانات</h4>
        </div>
        <p className="text-sm text-gray-500 pr-7">
          سيتم الاحتفاظ بالبيانات المكتملة (مهام، أرباح، معاملات) لهذه المدة. البيانات الأقدم سيتم حذفها تلقائياً.
          الحسابات والمخزون الحالي والمستلمين والموردين محميون ولن يتم حذفهم.
        </p>
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">المدة (بالأشهر)</label>
            <input
              type="number"
              min="1"
              max="120"
              value={months}
              onChange={e => setMonths(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>
          <div className="pt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري...' : 'حفظ'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 6, 12, 24].map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setMonths(m)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                parseInt(months) === m
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {m === 1 ? 'شهر' : m === 12 ? 'سنة' : m === 24 ? 'سنتين' : `${m} أشهر`}
            </button>
          ))}
        </div>
      </div>

      {/* تشغيل التصفية يدوي */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 size={20} className="text-red-600" />
          <h4 className="font-bold text-gray-800">تصفية يدوية</h4>
        </div>
        <p className="text-sm text-gray-500 pr-7">
          يمكنك تشغيل التصفية في أي وقت لحذف البيانات المكتملة الأقدم من المدة المحددة أعلاه.
        </p>
        <button
          onClick={handleCleanup}
          disabled={cleaning}
          className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-red-700 hover:to-red-600 transition-colors disabled:opacity-50"
        >
          <Trash2 size={18} />
          {cleaning ? 'جاري التصفية...' : `تصفية البيانات الأقدم من ${months} أشهر`}
        </button>
      </div>

      {/* نتيجة التصفية */}
      {result && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <h4 className="font-bold">تم الحذف بنجاح</h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="text-gray-500">المهام المكتملة</span>
              <span className="font-bold text-gray-800">{result.tasks}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="text-gray-500">حركات المخزون</span>
              <span className="font-bold text-gray-800">{result.inventory_transactions}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="text-gray-500">سجل الأرباح</span>
              <span className="font-bold text-gray-800">{result.profit_log}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="text-gray-500">معاملات المستلمين</span>
              <span className="font-bold text-gray-800">{result.receiver_transactions}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="text-gray-500">الإشعارات</span>
              <span className="font-bold text-gray-800">{result.notifications}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="text-gray-500">سجل الأداء</span>
              <span className="font-bold text-gray-800">{result.performance_log}</span>
            </div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-xl flex items-start gap-2 text-sm text-yellow-700">
            <Shield size={16} className="mt-0.5 shrink-0" />
            <span>الحسابات والمخزون الحالي والمستلمين والموردين لم يتأثروا</span>
          </div>
        </div>
      )}

      {/* تنبيه */}
      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3 mt-6">
        <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-bold mb-1">تنبيه هام</p>
          <p>عملية التصفية لا يمكن التراجع عنها. تأكد من أنك تريد حذف هذه البيانات قبل المتابعة. البيانات النشطة (مهام قيد التنفيذ، مخزون حالي، حسابات المستخدمين) محمية تماماً.</p>
        </div>
      </div>
    </div>
  );
};

export default AutoDelete;
