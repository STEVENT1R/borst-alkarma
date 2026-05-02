import { Routes, Route } from 'react-router-dom';
import WorkerDashboard from './WorkerDashboard';
import WorkerTasks from './WorkerTasks';
import WorkerSalary from './WorkerSalary';
import WorkerSettings from './WorkerSettings';
import Notifications from '../common/Notifications';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
const WorkerLayout = () => (
  <div className="h-screen flex flex-col">
    <TopBar />
    <div className="flex-1 overflow-y-auto pb-20">
      <div className="p-4 max-w-lg mx-auto">
        <Routes>
        <Route index element={<WorkerDashboard />} />
        <Route path="tasks" element={<WorkerTasks />} />
        <Route path="salary" element={<WorkerSalary />} />
        <Route path="settings" element={<WorkerSettings />} />
        <Route path="notifications" element={<Notifications />} />
        </Routes>
      </div>
    </div>
    <BottomNav />
  </div>
);

export default WorkerLayout;
