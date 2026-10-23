import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { isRouteAllowedForRole } from '../lib/authUtils';

/**
 * ProtectedRoute
 *
 * Consumes the established authentication state from Redux.
 * MUST NOT call bootstrap, /auth/me, or restore the session independently.
 *
 * States:
 *   - !isInitialized: Verifying session (loading skeleton)
 *   - !isAuthenticated: Redirect to /login
 *   - onboardingRequired || !employee: Redirect to /onboarding
 *   - authenticated + employee: Enforce admin setup lock and role-based route permissions
 */
export const ProtectedRoute = () => {
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const onboardingRequired = useSelector((state: RootState) => state.auth.onboardingRequired);
  const employee = useSelector((state: RootState) => state.auth.employee);
  const isInitialSetup = useSelector((state: RootState) => state.auth.isInitialSetup);
  const location = useLocation();

  // STATE B: Session is being restored by AuthInitializer
  if (!isInitialized) {
    return (
      <div 
        data-testid="session-loading"
        className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 antialiased"
      >
        <div className="mb-4">
          <img
            src="/sify Workforce Logo on Transparent Canvas.png"
            alt="Sify Workforce"
            className="h-10 w-auto max-w-[180px] object-contain animate-pulse"
          />
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
          <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  // STATE A: Unauthenticated or session expired
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // STATE C: Authenticated with UMS, but no Workforce Employee record exists
  if (onboardingRequired || !employee) {
    return <Navigate to="/onboarding" replace />;
  }

  const currentPath = location.pathname;

  // STATE D: Authenticated Workforce employee
  // Setup Lock: New Admin must complete organization setup
  if (isInitialSetup && currentPath !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  // Prevent accessing setup after it is complete
  if (!isInitialSetup && currentPath === '/setup') {
    return <Navigate to="/dashboard" replace />;
  }

  // Enforce authoritative role-based landing & route protection
  // If an employee's old page (e.g. /time-entries) is accessed by an ADMIN or unauthorized role,
  // redirect immediately to the role-specific landing destination (/dashboard).
  if (!isRouteAllowedForRole(currentPath, employee)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
