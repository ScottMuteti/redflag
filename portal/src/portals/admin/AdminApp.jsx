import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icon, Logo } from '../../components/ui';
import EmployeeRoster from './EmployeeRoster';
import CampaignsPage from './CampaignsPage';
import AnalyticsDashboard from './AnalyticsDashboard';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/admin/employees', label: 'Employees', icon: 'employees' },
  { to: '/admin/campaigns', label: 'Campaigns', icon: 'campaigns' },
];

function AdminApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const name = user?.fullName || user?.email || '';

  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo light />
        <nav>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{name.charAt(0).toUpperCase()}</span>
          <div className="who">
            <strong>{user?.fullName || 'Admin'}</strong>
            <span>{user?.email}</span>
          </div>
          <button type="button" onClick={handleLogout} title="Log out" aria-label="Log out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<AnalyticsDashboard />} />
          <Route path="/employees" element={<EmployeeRoster />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default AdminApp;
