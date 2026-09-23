import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function EmployeeApp() {
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
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </header>
      <p>Assigned training and your risk score will appear here in a later sprint.</p>
    </div>
  );
}

export default EmployeeApp;
