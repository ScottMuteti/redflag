import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EmployeeRoster from './EmployeeRoster';
import CampaignsPage from './CampaignsPage';

function AdminHome() {
  return <p>Welcome to the RedFlag admin dashboard. Analytics tools land in a later sprint.</p>;
}

function AdminApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="portal">
      <header className="portal-header">
        <h1>RedFlag — {user?.email}</h1>
        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/employees">Employees</Link>
          <Link to="/admin/campaigns">Campaigns</Link>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/employees" element={<EmployeeRoster />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default AdminApp;
