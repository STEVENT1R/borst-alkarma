import { Routes, Route } from 'react-router-dom';
import WorkerDashboard from './WorkerDashboard';
import WorkerTasks from './WorkerTasks';
import Salary from './Salary';
import Notifications from '../common/Notifications';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';

const WorkerLayout = () => (
  <div className="pb-20">
    <TopBar />
    <div className="p-4 max-w-lg mx-auto">
      <Routes>
        <Route index element={<WorkerDashboard />} />
        <Route path="tasks" element={<WorkerTasks />} />
        <Route path="salary" element={<Salary />} />
        <Route path="notifications" element={<Notifications />} />
      </Routes>
    </div>
    <BottomNav />
  </div>
);

export default WorkerLayout;