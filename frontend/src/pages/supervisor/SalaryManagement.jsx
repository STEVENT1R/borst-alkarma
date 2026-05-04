import { useState, useEffect } from 'react';
import api from '../../services/api';
import { DollarSign, Save, Wallet } from 'lucide-react';

const SalaryManagement = () => {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [salaryData, setSalaryData] = useState({ base_salary: '', deduction: '', bonus: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [payAmount, setPayAmount] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payWorker, setPayWorker] = useState(null);
  const [payDeduction, setPayDeduction] = useState('');
  const [payDeductionReason, setPayDeductionReason] = useState('');
  const [payBonus, setPayBonus] = useState('');
  const [payBonusReason, setPayBonusReason] = useState('');

  useEffect(() => {
    api.get('/salaries/summary')
      .then(res => setWorkers(res.data))
      .catch(() => {});
  }, []);

  const openEditor = (worker) => {
    setSelectedWorker(worker);
    setSalaryData({
      base_salary: worker.base_salary || '',
      deduction: worker.deduction || '',
      bonus: worker.bonus || '',
    });
    setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (!selectedWorker) return;
    try {
      await api.post('/salaries', {
        worker_id: selectedWorker.worker_id,
        base_salary: parseFloat(salaryData.base_salary) || 0,
        deduction: parseFloat(salaryData.deduction) || 0,
        bonus: parseFloat(salaryData.bonus) || 0,
      });
      setMessage({ type: 'success', text: 'تم حفظ المرتب بنجاح' });
      setWorkers(prev => prev.map(w =>
        w.worker_id === selectedWorker.worker_id
          ? { ...w, base_salary: salaryData.base_salary, deduction: salaryData.deduction, bonus: salaryData.bonus }
          : w
      ));
      setSelectedWorker(null);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  const openPayModal = (worker) => {
    setPayWorker(worker);
    setPayAmount(worker.net_salary || '');
    setPayDeduction('');
    setPayDeductionReason('');
    setPayBonus('');
    setPayBonusReason('');
    setShowPayModal(true);
  };

  const handlePay = async () => {
    if (!payWorker || !payAmount) return;
    try {
      await api.post('/salaries/pay', {
        worker_id: payWorker.worker_id,
        amount: parseFloat(payAmount),
        deduction_amount: parseFloat(payDeduction) || 0,
        deduction_reason: payDeductionReason || null,
        bonus_amount: parseFloat(payBonus) || 0,
        bonus_reason: payBonusReason || null,
      });
      setMessage({ type: 'success', text: `تم إيداع ${payAmount} ج.م لـ ${payWorker.username}` });
      setShowPayModal(false);
      setPayAmount('');
      setPayWorker(null);
      setPayDeduction('');
      setPayDeductionReason('');
      setPayBonus('');
      setPayBonusReason('');
      // Refresh
      const res = await api.get('/salaries/summary');
      setWorkers(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'فشل' });
    }
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">إدارة الرواتب</h3>
      
      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {selectedWorker ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h4 className="font-bold text-lg mb-4">تعديل مرتب: {selectedWorker.username}</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الراتب الأساسي</label>
              <input
                type="number"
                value={salaryData.base_salary}
                onChange={e => setSalaryData({...salaryData, base_salary: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الخصومات</label>
              <input
                type="number"
                value={salaryData.deduction}
                onChange={e => setSalaryData({...salaryData, deduction: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحوافز</label>
              <input
                type="number"
                value={salaryData.bonus}
                onChange={e => setSalaryData({...salaryData, bonus: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
            <div className="bg-gray-50 p-3 rounded-xl flex justify-between">
              <span className="font-bold">الصافي المتوقع</span>
              <span className="font-bold text-green-700">
                {((parseFloat(salaryData.base_salary) || 0) - (parseFloat(salaryData.deduction) || 0) + (parseFloat(salaryData.bonus) || 0)).toFixed(1)} ج.م
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Save size={18} /> حفظ
              </button>
              <button
                onClick={() => setSelectedWorker(null)}
                className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {workers.map((w) => (
            <div key={w.worker_id} className="bg-white p-4 rounded-2xl shadow-sm border">
              <div className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded-xl" onClick={() => openEditor(w)}>
                <div>
                  <span className="font-bold text-gray-800">{w.username}</span>
                  <div className="text-sm text-gray-500">الأساسي: {w.base_salary || 0} ج.م | الصافي: {w.net_salary || 0} ج.م</div>
                  <div className="text-xs text-gray-400">المدفوع: {w.total_paid || 0} ج.م</div>
                </div>
                <DollarSign size={20} className="text-green-600" />
              </div>
              <button
                onClick={() => openPayModal(w)}
                className="w-full mt-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <Wallet size={16} /> إيداع المرتب
              </button>
            </div>
          ))}
          {workers.length === 0 && (
            <div className="bg-white p-8 rounded-2xl text-center text-gray-400">لا يوجد رجاله بعد</div>
          )}
        </div>
      )}

      {/* مودال إيداع المرتب */}
      {showPayModal && payWorker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h4 className="font-bold text-lg mb-2">إيداع مرتب</h4>
            <p className="text-gray-600 mb-4">صاحب المهمه: <span className="font-bold">{payWorker.username}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50"
                  autoFocus
                />
              </div>
              <div className="border-t pt-4">
                <h5 className="font-bold text-sm text-gray-700 mb-3">خصم (اختياري)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">مبلغ الخصم</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payDeduction}
                      onChange={e => setPayDeduction(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">سبب الخصم</label>
                    <input
                      type="text"
                      value={payDeductionReason}
                      onChange={e => setPayDeductionReason(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                      placeholder="مثال: تأخير"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h5 className="font-bold text-sm text-gray-700 mb-3">زيادة (اختياري)</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">مبلغ الزيادة</label>
                    <input
                      type="number"
                      step="0.01"
                      value={payBonus}
                      onChange={e => setPayBonus(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">سبب الزيادة</label>
                    <input
                      type="text"
                      value={payBonusReason}
                      onChange={e => setPayBonusReason(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm"
                      placeholder="مثال: عمل إضافي"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handlePay}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Wallet size={18} /> تأكيد الإيداع
                </button>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="px-6 py-3 border border-gray-200 rounded-xl text-gray-600"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;
