import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppShell from '../components/shell/AppShell';
import { PageSkeleton } from '../components/shell/PageSkeleton';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import StatusPage from '../pages/StatusPage';

const AnalyticsDashboard = lazy(() => import('../portals/admin/AnalyticsDashboard'));
const EmployeeRoster = lazy(() => import('../portals/admin/EmployeeRoster'));
const CampaignsPage = lazy(() => import('../portals/admin/CampaignsPage'));
const EmployeeApp = lazy(() => import('../portals/employee/EmployeeApp'));

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/portal'} replace />;
}

function AppRouter() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<AnalyticsDashboard />} />
          <Route path="employees" element={<EmployeeRoster />} />
          <Route path="campaigns" element={<CampaignsPage />} />
        </Route>
        <Route
          path="/portal/*"
          element={
            <ProtectedRoute role="employee">
              <EmployeeApp />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<StatusPage code={404} />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
