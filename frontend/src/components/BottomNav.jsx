import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, PlusCircle, List, Package, Settings, Users, FileText, DollarSign, ShoppingCart } from 'lucide-react';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  if (user?.role === 'supervisor') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-2 pt-1">
        <div className="grid grid-cols-7 w-full">
          <NavButton icon={<Home size={20} />} label="الرئيسية" active={isActive('/supervisor') && !location.pathname.includes('/supervisor/')} onClick={() => navigate('/supervisor')} />
          <NavButton icon={<PlusCircle size={20} />} label="اضافه مهمه" active={isActive('/supervisor/create-task')} onClick={() => navigate('/supervisor/create-task')} />
          <NavButton icon={<List size={20} />} label="المهام" active={isActive('/supervisor/tasks')} onClick={() => navigate('/supervisor/tasks')} />
          <NavButton icon={<Package size={20} />} label="المخزن" active={isActive('/supervisor/inventory')} onClick={() => navigate('/supervisor/inventory')} />
          <NavButton icon={<Users size={20} />} label="الإدارة" active={isActive('/supervisor/manage-workers')} onClick={() => navigate('/supervisor/manage-workers')} />
          <NavButton icon={<FileText size={20} />} label="السجلات" active={isActive('/supervisor/reports')} onClick={() => navigate('/supervisor/reports')} />
          <NavButton icon={<Settings size={20} />} label="الإعدادات" active={isActive('/supervisor/settings')} onClick={() => navigate('/supervisor/settings')} />
        </div>
      </nav>
    );
  }

  if (user?.role === 'cashier') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-2 pt-1">
        <div className="grid grid-cols-4 w-full">
          <NavButton icon={<Home size={20} />} label="الرئيسية" active={isActive('/cashier') && !location.pathname.includes('/cashier/')} onClick={() => navigate('/cashier')} />
          <NavButton icon={<ShoppingCart size={20} />} label="البيع" active={isActive('/cashier/sales')} onClick={() => navigate('/cashier/sales')} />
          <NavButton icon={<Package size={20} />} label="المخزن" active={isActive('/cashier/inventory')} onClick={() => navigate('/cashier/inventory')} />
          <NavButton icon={<FileText size={20} />} label="السجلات" active={isActive('/cashier/logs')} onClick={() => navigate('/cashier/logs')} />
        </div>
      </nav>
    );
  }

  return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-2 pt-1">
        <div className="grid grid-cols-4 w-full">
          <NavButton icon={<Home size={20} />} label="الرئيسية" active={isActive('/worker')} onClick={() => navigate('/worker')} />
          <NavButton icon={<List size={20} />} label="المهام" active={isActive('/worker/tasks')} onClick={() => navigate('/worker/tasks')} />
          <NavButton icon={<DollarSign size={20} />} label="المرتب" active={isActive('/worker/salary')} onClick={() => navigate('/worker/salary')} />
          <NavButton icon={<Settings size={20} />} label="الإعدادات" active={isActive('/worker/settings')} onClick={() => navigate('/worker/settings')} />
        </div>
      </nav>
  );
};

const NavButton = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center w-full py-1 rounded-lg transition-colors ${active ? 'text-green-600' : 'text-gray-400'}`}>
    {icon}
    <span className="text-[10px] mt-0.5">{label}</span>
  </button>
);

export default BottomNav;