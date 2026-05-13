import { Routes, Route } from 'react-router-dom';
import WorkerDashboard from './WorkerDashboard';
import WorkerTasks from './WorkerTasks';
import WorkerCreateTask from './WorkerCreateTask';
import WorkerLoad from './WorkerLoad';
import WorkerSalary from './WorkerSalary';
import WorkerSettings from './WorkerSettings';

import Notifications from '../common/Notifications';
import BottomNav from '../../components/BottomNav';
import TopBar from '../../components/TopBar';
import PullToRefresh from '../../components/PullToRefresh';
const WorkerLayout = () => (
  <div className="h-screen flex flex-col">
    <TopBar />
    <PullToRefresh>
      <Routes>
      <Route index element={<WorkerDashboard />} />
      <Route path="tasks" element={<WorkerTasks />} />
      <Route path="create-task" element={<WorkerCreateTask />} />
      <Route path="load" element={<WorkerLoad />} />
      <Route path="salary" element={<WorkerSalary />} />

      <Route path="settings" element={<WorkerSettings />} />
      <Route path="notifications" element={<Notifications />} />
      </Routes>
    </PullToRefresh>
    <BottomNav />
  </div>
);


export default WorkerLayout;
