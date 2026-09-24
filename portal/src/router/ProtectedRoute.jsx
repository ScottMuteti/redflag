import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// eslint-disable-next-line react/prop-types
function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;
  return children;
}

export default ProtectedRoute;
