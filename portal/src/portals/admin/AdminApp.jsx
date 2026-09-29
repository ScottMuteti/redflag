import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChartColumn,
  LayoutGrid,
  LayoutTemplate,
  Megaphone,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppShell from '../../components/dashboard/AppShell';
import Sidebar from '../../components/dashboard/Sidebar';
import TopBar from '../../components/dashboard/TopBar';
import { initialsOf } from '../../lib/format';
import { unreadMessages } from '../../mocks/dashboard';
import EmployeeRoster from './EmployeeRoster';
import CampaignsPage from './CampaignsPage';
import AnalyticsDashboard from './AnalyticsDashboard';

// Analytics, Templates and Calendar have no page of their own yet, so they
// jump to the page that holds that content without showing as selected.
const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/admin', label: 'Analytics', icon: ChartColumn, active: false },
  { to: '/admin/campaigns', label: 'Templates', icon: LayoutTemplate, active: false },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/campaigns', label: 'Calendar', icon: CalendarDays, active: false },
];

const FOOTER_NAV = [{ label: 'Settings (coming soon)', icon: Settings }];

function AdminApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const fullName = user?.fullName || 'Admin';

  return (
    <AppShell
      topBar={
        <TopBar
          name={fullName.split(' ')[0]}
          subtitle="Track your organisation's human security posture"
          hasMessages={unreadMessages > 0}
        />
      }
      sidebar={
        <Sidebar
          items={NAV}
          footerItems={FOOTER_NAV}
          initials={initialsOf(fullName)}
          userLabel={user?.email}
          onLogout={handleLogout}
        />
      }
    >
      <Routes>
        <Route path="/" element={<AnalyticsDashboard />} />
        <Route path="/employees" element={<EmployeeRoster />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
      </Routes>
    </AppShell>
  );
}

export default AdminApp;
