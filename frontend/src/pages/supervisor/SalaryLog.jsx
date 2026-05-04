import { useState, useEffect } from 'react';
import api from '../../services/api';
import { CreditCard, MinusCircle, PlusCircle } from 'lucide-react';

const SalaryLog = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/salaries/payments')
      .then(res => setPayments(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">تحميل...</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">سجل الرواتب</h3>

      {payments.length === 0 ? (
        <p className="text-gray-400 text-center py-8">لا يوجد مدفوعات حتى الآن</p>
      ) : (
        <div className="space-y-2">
          {payments.map(p => {
            const deduction = parseFloat(p.deduction_amount || 0);
            const bonus = parseFloat(p.bonus_amount || 0);
            return (
              <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className="text-green-600" />
                    <div>
                      <span className="font-bold text-gray-800">{parseFloat(p.amount).toFixed(1)} ج.م</span>
                      <span className="text-gray-500 text-xs mr-2">- {p.worker_name}</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</span>
                </div>
                {(deduction > 0 || bonus > 0) && (
                  <div className="border-t pt-2 mt-2 space-y-1">
                    {deduction > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <MinusCircle size={14} className="text-red-500" />
                        <span className="text-red-600">خصم: {deduction} ج.م</span>
                        {p.deduction_reason && (
                          <span className="text-gray-400">({p.deduction_reason})</span>
                        )}
                      </div>
                    )}
                    {bonus > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <PlusCircle size={14} className="text-green-500" />
                        <span className="text-green-600">زيادة: {bonus} ج.م</span>
                        {p.bonus_reason && (
                          <span className="text-gray-400">({p.bonus_reason})</span>
                        )}
                      </div>
                    )}
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

export default SalaryLog;
