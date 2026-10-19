import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

/** Renders its children (or nested routes) only when an admin token exists. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children ?? <Outlet />;
}
