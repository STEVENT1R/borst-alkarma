import { Routes, Route } from 'react-router-dom';
import CashierDashboard from './CashierDashboard';
import CashierSales from './CashierSales';
import CashierInventory from './CashierInventory';
import CashierLogs from './CashierLogs';
import CashierSettings from './CashierSettings';
import Notifications from '../common/Notifications';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import PullToRefresh from '../../components/PullToRefresh';

const CashierLayout = () => (
  <div className="h-screen flex flex-col">
    <TopBar />
    <PullToRefresh>
      <Routes>
        <Route index element={<CashierDashboard />} />
        <Route path="sales" element={<CashierSales />} />
        <Route path="inventory" element={<CashierInventory />} />
        <Route path="logs" element={<CashierLogs />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<CashierSettings />} />
      </Routes>
    </PullToRefresh>
    <BottomNav />
  </div>
);

export default CashierLayout;
