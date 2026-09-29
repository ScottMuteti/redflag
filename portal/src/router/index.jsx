import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/shell/AppShell';
import { PageSkeleton } from '../components/shell/PageSkeleton';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import StatusPage from '../pages/StatusPage';
import LandingPage from '../pages/landing/LandingPage';
import ComingSoonPage from '../pages/ComingSoonPage';

const OverviewPage = lazy(() => import('../pages/admin/OverviewPage'));
const CampaignsPage = lazy(() => import('../pages/admin/CampaignsPage'));
const EmployeesPage = lazy(() => import('../pages/admin/EmployeesPage'));
const EmployeeOverviewPage = lazy(() => import('../pages/employee/EmployeeOverviewPage'));
const MyTrainingPage = lazy(() => import('../pages/employee/MyTrainingPage'));

// Sections not built yet render a "coming soon" page inside the shell instead of a 404.
const ADMIN_SOON = [
  ['templates', 'Templates', 'Kenya-specific attack scenarios'],
  ['training', 'Training', 'Remedial training and quizzes'],
  ['analytics', 'Analytics', 'Trends across campaigns and departments'],
  ['reports', 'Reports', 'Exports for leadership and audit'],
  ['settings', 'Settings', 'Your account and organisation'],
  ['help', 'Help Center', 'Guides and answers'],
  ['campaigns/new', 'New campaign', 'Set up a simulated attack'],
  ['campaigns/:id', 'Campaign results', 'Outcomes per employee'],
];

const EMPLOYEE_SOON = [
  ['quizzes', 'Quizzes', 'Check what you’ve learned'],
  ['reports', 'Reports Sent', 'Suspicious messages you flagged'],
  ['settings', 'Settings', 'Your account'],
  ['help', 'Help Center', 'Guides and answers'],
];

function AppRouter() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
          <Route index element={<OverviewPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          {ADMIN_SOON.map(([path, title, description]) => (
            <Route
              key={path}
              path={path}
              element={<ComingSoonPage title={title} description={description} backTo="/admin" />}
            />
          ))}
        </Route>

        <Route
          path="/portal"
          element={
            <ProtectedRoute role="employee">
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeOverviewPage />} />
          <Route path="training" element={<MyTrainingPage />} />
          {EMPLOYEE_SOON.map(([path, title, description]) => (
            <Route
              key={path}
              path={path}
              element={<ComingSoonPage title={title} description={description} backTo="/portal" />}
            />
          ))}
        </Route>

        <Route path="*" element={<StatusPage code={404} />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
