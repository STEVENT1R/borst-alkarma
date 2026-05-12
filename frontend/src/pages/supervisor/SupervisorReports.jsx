import { Link } from 'react-router-dom';
import { FileText, Package, Users, DollarSign, TrendingUp, BarChart3, ShoppingCart, Store, CreditCard, ClipboardList } from 'lucide-react';


const SupervisorReports = () => (
  <div>
    <h3 className="text-2xl font-bold mb-6 text-gray-800">السجلات والتقارير</h3>
    <div className="space-y-4">
      <Link to="/supervisor/task-logs" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><FileText className="text-green-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل المهام</span>
      </Link>
      <Link to="/supervisor/inventory-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><Package className="text-green-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل المخزن</span>
      </Link>
      <Link to="/supervisor/receivers-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-green-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><Users className="text-blue-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل التعاملات</span>
      </Link>
      <Link to="/supervisor/salary-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-red-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><CreditCard className="text-red-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل الرواتب</span>
      </Link>
      <Link to="/supervisor/profit-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-yellow-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><DollarSign className="text-yellow-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل الربح والمصروفات</span>
      </Link>
      <Link to="/supervisor/purchases-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-orange-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><ShoppingCart className="text-orange-600" size={24} /></div>
        <span className="font-bold text-gray-800">فواتير الشراء</span>
      </Link>
      <Link to="/supervisor/shops-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-indigo-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><Store className="text-indigo-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل المحلات</span>
      </Link>
      <Link to="/supervisor/worker-daily-logs" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-purple-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><ClipboardList className="text-purple-600" size={24} /></div>
        <span className="font-bold text-gray-800">سجل تحركات العهد</span>
      </Link>
      <Link to="/supervisor/performance-log" className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border hover:border-purple-300 transition-colors">
        <div className="bg-gray-50 p-3 rounded-xl"><BarChart3 className="text-purple-600" size={24} /></div>
        <span className="font-bold text-gray-800">الجرد</span>
      </Link>
    </div>
  </div>
);

export default SupervisorReports;
