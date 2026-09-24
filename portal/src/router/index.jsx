import { Routes, Route, Navigate } from 'react-router-dom';
import AdminApp from '../portals/admin/AdminApp';
import EmployeeApp from '../portals/employee/EmployeeApp';
import LoginPage from '../pages/LoginPage';
import RegisterOrgPage from '../pages/RegisterOrgPage';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../context/AuthContext';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />;
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterOrgPage />} />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminApp />
          </ProtectedRoute>
        }
      />
      <Route
        path="/portal/*"
        element={
          <ProtectedRoute role="employee">
            <EmployeeApp />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;
