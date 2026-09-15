import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { env } from '../config/env';

/**
 * ProtectedRoute
 *
 * In production (VITE_DEV_AUTH_BYPASS=false):
 *   Requires isAuthenticated from Redux. Redirects to /login if not set.
 *
 * In development (VITE_DEV_AUTH_BYPASS=true):
 *   Bypasses Redux authentication check.
 *   The DevBypassGuard on the backend enforces real data access.
 *   No fake tokens are used.
 */
export const ProtectedRoute = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // Development bypass: skip auth check entirely.
  // All API requests still go through the backend with real dev headers.
  if (env.VITE_DEV_AUTH_BYPASS) {
    return <Outlet />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
