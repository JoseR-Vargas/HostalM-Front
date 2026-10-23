import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Renders its children (or nested routes) only when an admin token exists.
 * Entering the admin area also wakes up the (possibly cold) backend, fire-and-forget.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, prewarm } = useAuth();

  const prewarmed = useRef(false);

  // The ref keeps it to one request per visit (StrictMode re-runs effects in development).
  useEffect(() => {
    if (!isAuthenticated || prewarmed.current) return;
    prewarmed.current = true;
    prewarm();
  }, [isAuthenticated, prewarm]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children ?? <Outlet />;
}
