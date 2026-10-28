import { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import AppShell from '../components/shell/AppShell';
import { PageSkeleton } from '../components/shell/PageSkeleton';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import RequestAccessPage from '../pages/auth/RequestAccessPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import NotApprovedPage from '../pages/auth/NotApprovedPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import StatusPage from '../pages/StatusPage';
import LandingPage from '../pages/landing/LandingPage';

const OverviewPage = lazy(() => import('../pages/admin/OverviewPage'));
const CampaignsPage = lazy(() => import('../pages/admin/CampaignsPage'));
const EmployeesPage = lazy(() => import('../pages/admin/EmployeesPage'));
const EmployeeOverviewPage = lazy(() => import('../pages/employee/EmployeeOverviewPage'));
const MyTrainingPage = lazy(() => import('../pages/employee/MyTrainingPage'));
const NewCampaignPage = lazy(() => import('../pages/admin/NewCampaignPage'));
const CampaignResultsPage = lazy(() => import('../pages/admin/CampaignResultsPage'));
const TrainingPage = lazy(() => import('../pages/admin/TrainingPage'));
const AnalyticsPage = lazy(() => import('../pages/admin/AnalyticsPage'));
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage'));
const TrainingPlayerPage = lazy(() => import('../pages/employee/TrainingPlayerPage'));
const QuizzesPage = lazy(() => import('../pages/employee/QuizzesPage'));
const MyReportsPage = lazy(() => import('../pages/employee/MyReportsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const HelpPage = lazy(() => import('../pages/HelpPage'));
const TemplatesPage = lazy(() => import('../pages/TemplatesPage'));
const OrganisationsPage = lazy(() => import('../pages/system/OrganisationsPage'));
const PlatformAnalyticsPage = lazy(() => import('../pages/system/PlatformAnalyticsPage'));

function AppRouter() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/request-access" element={<RequestAccessPage />} />
        {/* Self sign-up is closed; old links land on the request form. */}
        <Route path="/register" element={<Navigate to="/request-access" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/not-approved" element={<NotApprovedPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

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
          <Route path="campaigns/new" element={<NewCampaignPage />} />
          <Route path="campaigns/:id" element={<CampaignResultsPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage role="admin" />} />
          <Route path="templates" element={<TemplatesPage />} />
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
          <Route path="training/:id" element={<TrainingPlayerPage />} />
          <Route path="quizzes" element={<QuizzesPage />} />
          <Route path="reports" element={<MyReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage role="employee" />} />
        </Route>

        <Route
          path="/system"
          element={
            <ProtectedRoute role="system_admin">
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<OrganisationsPage />} />
          <Route path="analytics" element={<PlatformAnalyticsPage />} />
          <Route path="templates" element={<TemplatesPage scope="system" />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage role="system_admin" />} />
        </Route>

        <Route path="*" element={<StatusPage code={404} />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
