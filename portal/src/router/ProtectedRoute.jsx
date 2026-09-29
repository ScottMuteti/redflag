import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatusPage from '../pages/StatusPage';

// Signed out → /login. Signed in with the wrong role → 403 page.
// eslint-disable-next-line react/prop-types
function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <StatusPage code={403} />;
  return children;
}

export default ProtectedRoute;
