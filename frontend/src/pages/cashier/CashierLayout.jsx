import { Routes, Route } from 'react-router-dom';
import CashierDashboard from './CashierDashboard';
import CashierSales from './CashierSales';
import CashierInventory from './CashierInventory';
import CashierLogs from './CashierLogs';
import Notifications from '../common/Notifications';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';

const CashierLayout = () => (
  <div className="h-screen flex flex-col">
    <TopBar />
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <Routes>
          <Route index element={<CashierDashboard />} />
          <Route path="sales" element={<CashierSales />} />
          <Route path="inventory" element={<CashierInventory />} />
          <Route path="logs" element={<CashierLogs />} />
          <Route path="notifications" element={<Notifications />} />
        </Routes>
      </div>
    </div>
    <BottomNav />
  </div>
);

export default CashierLayout;