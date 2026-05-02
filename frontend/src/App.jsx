import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/auth/Login';
import WorkerLayout from './pages/worker/WorkerLayout';
import SupervisorLayout from './pages/supervisor/Layout';
import CashierLayout from './pages/cashier/CashierLayout';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex justify-center items-center h-screen">تحميل...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  const defaultRedirect = user ? `/${user.role}` : '/login';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/worker/*" element={<ProtectedRoute role="worker"><WorkerLayout /></ProtectedRoute>} />
      <Route path="/supervisor/*" element={<ProtectedRoute role="supervisor"><SupervisorLayout /></ProtectedRoute>} />
      <Route path="/cashier/*" element={<ProtectedRoute role="cashier"><CashierLayout /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to={defaultRedirect} />} />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
