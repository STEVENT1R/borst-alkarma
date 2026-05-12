import { Routes, Route } from 'react-router-dom';
import SupervisorDashboard from './SupervisorDashboard';
import CreateTask from './CreateTask';
import AllTasks from './AllTasks';
import Inventory from './Inventory';
import Settings from './Settings';
import Notifications from '../common/Notifications';
import TaskLogs from './TaskLogs';
import InventoryLog from './InventoryLog';
import SupervisorReports from './SupervisorReports';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import WorkerManagement from './WorkerManagement';
import SalaryManagement from './SalaryManagement';
import SalaryLog from './SalaryLog';
import ReceiversLog from './ReceiversLog';
import ProfitLog from './ProfitLog';
import PerformanceLog from './PerformanceLog';
import PurchasesLog from './PurchasesLog';
import PerformanceReport from './PerformanceReport';
import ShopsLog from './ShopsLog';
import WorkerDailyLogs from './WorkerDailyLogs';
import WorkerLoadManagement from './WorkerLoadManagement';
import WorkerAdmin from './WorkerAdmin';

const SupervisorLayout = () => (

  <div className="h-screen flex flex-col">
    <TopBar />
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <Routes>
        <Route index element={<SupervisorDashboard />} />
        <Route path="create-task" element={<CreateTask />} />
        <Route path="tasks" element={<AllTasks />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="task-logs" element={<TaskLogs />} />
        <Route path="inventory-log" element={<InventoryLog />} />
        <Route path="reports" element={<SupervisorReports />} />
        <Route path="manage-workers" element={<WorkerManagement />} />
        <Route path="manage-salaries" element={<SalaryManagement />} />
        <Route path="salary-log" element={<SalaryLog />} />
        <Route path="receivers-log" element={<ReceiversLog />} />
        <Route path="profit-log" element={<ProfitLog />} />
        <Route path="performance-log" element={<PerformanceLog />} />
        <Route path="purchases-log" element={<PurchasesLog />} />
        <Route path="performance-report" element={<PerformanceReport />} />
        <Route path="shops-log" element={<ShopsLog />} />
        <Route path="worker-daily-logs" element={<WorkerDailyLogs />} />
        <Route path="worker-load/:workerId" element={<WorkerLoadManagement />} />
        <Route path="worker-admin/:workerId" element={<WorkerAdmin />} />
        </Routes>


      </div>
    </div>
    <BottomNav />
  </div>
);

export default SupervisorLayout;
