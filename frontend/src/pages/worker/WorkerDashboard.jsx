import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Briefcase, DollarSign, CreditCard } from 'lucide-react';

const WorkerDashboard = () => {
  const [tasksCount, setTasksCount] = useState(0);
  const [salary, setSalary] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get('/tasks')
      .then(res => {
        const active = res.data.filter(t => !['completed', 'cancelled'].includes(t.status));
        setTasksCount(active.length);
      })
      .catch(console.error);

    Promise.all([
      api.get('/salaries/worker'),
      api.get('/salaries/payments')
    ]).then(([salRes, payRes]) => {
      setSalary(salRes.data);
      setPayments(payRes.data);
    }).catch(console.error);
  }, []);

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const baseSalary = salary ? parseFloat(salary.base_salary) : 0;
  const remaining = baseSalary - totalPaid;

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6 text-gray-800">الرئيسية</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-2xl shadow-sm border border-green-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Briefcase size={20} className="text-green-600" />
            <span className="text-sm">المهام النشطة</span>
          </div>
          <div className="text-4xl font-extrabold text-green-700">{tasksCount}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <DollarSign size={20} className="text-blue-600" />
            <span className="text-sm">المرتب الأساسي</span>
          </div>
          <div className="text-3xl font-extrabold text-blue-700">{baseSalary} ج.م</div>
          <div className="mt-2 text-xs text-gray-500">
            <span className="text-red-500">مدفوع: {totalPaid} ج.م</span>
            <span className="mx-1">|</span>
            <span className="text-green-600">متبقي: {remaining} ج.م</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
