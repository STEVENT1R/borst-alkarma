import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Wallet, TrendingDown, TrendingUp } from 'lucide-react';

const Salary = () => {
  const { user } = useAuth();
  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      api.get(`/salaries/${user.id}`)
        .then(res => setSalary(res.data))
        .catch(err => setError(err.response?.status === 404 ? 'لا يوجد مرتب مسجل بعد' : 'خطأ'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) return <div className="text-center text-gray-400 mt-12">تحميل...</div>;
  if (error) return <div className="text-center text-gray-500 mt-12">{error}</div>;
  if (!salary) return <div className="text-center text-gray-500 mt-12">لا بيانات</div>;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">تفاصيل المرتب</h3>
      <div className="bg-white rounded-2xl shadow-sm p-6 max-w-xs mx-auto">
        <div className="text-center mb-6">
          <Wallet size={40} className="mx-auto text-green-600 mb-2" />
          <div className="text-sm text-gray-500">{new Date(salary.date).toLocaleDateString('ar-EG')}</div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">الراتب الأساسي</span>
            <span className="font-bold">{salary.base_salary} ج.م</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
            <span className="text-red-600 flex items-center gap-1"><TrendingDown size={16} /> الخصومات</span>
            <span className="font-bold text-red-600">- {salary.deduction} ج.م</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
            <span className="text-green-600 flex items-center gap-1"><TrendingUp size={16} /> الحوافز</span>
            <span className="font-bold text-green-600">+ {salary.bonus} ج.م</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white">
            <span className="font-bold text-lg">الصافي</span>
            <span className="font-bold text-lg">{salary.net_salary} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Salary;