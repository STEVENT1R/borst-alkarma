import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, CreditCard } from 'lucide-react';

const WorkerSalary = () => {
  const { user } = useAuth();
  const [salary, setSalary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/salaries/worker'),
      api.get('/salaries/payments')
    ]).then(([salRes, payRes]) => {
      setSalary(salRes.data);
      setPayments(payRes.data);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">تحميل...</div>;

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const baseSalary = salary ? parseFloat(salary.base_salary) : 0;
  const remaining = baseSalary - totalPaid;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">المرتب</h3>

      <div className="bg-white p-6 rounded-2xl shadow-sm border mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <DollarSign size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">المرتب الأساسي</p>
            <p className="text-2xl font-extrabold text-gray-800">{baseSalary} ج.م</p>
          </div>
        </div>
        <div className="border-t pt-4 mt-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">تم صرفه</span>
            <span className="text-red-500 font-bold">{totalPaid} ج.م</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">المتبقي</span>
            <span className="text-green-600 font-bold">{remaining} ج.م</span>
          </div>
        </div>
      </div>

      <h4 className="font-bold text-gray-700 mb-3">سجل الصرف</h4>
      {payments.length === 0 ? (
        <p className="text-gray-400 text-center py-4">لا يوجد مدفوعات حتى الآن</p>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-green-600" />
                <span className="font-bold text-gray-800">{p.amount} ج.م</span>
              </div>
              <span className="text-xs text-gray-400">{new Date(p.payment_date).toLocaleDateString('ar-EG')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkerSalary;
