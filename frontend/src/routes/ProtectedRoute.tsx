import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

/**
 * ProtectedRoute
 *
 * Consumes the established authentication state from Redux.
 * MUST NOT call bootstrap, /auth/me, or restore the session independently.
 *
 * States:
 *   - !isInitialized: Verifying session (loading skeleton)
 *   - !isAuthenticated: Redirect to /login with returnTo
 *   - onboardingRequired || !employee: Redirect to /onboarding
 *   - authenticated + employee: Render Outlet (enforcing admin setup lock)
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
        <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow-md mb-4 animate-pulse">
          <div className="w-6 h-6 rounded bg-[#27F087] flex items-center justify-center text-slate-950 font-black text-xs">
            SW
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
          <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  // STATE A & STATE E: Unauthenticated or session expired
  if (!isAuthenticated) {
    const targetUrl = location.pathname + location.search;
    return (
      <Navigate 
        to={`/login?returnTo=${encodeURIComponent(targetUrl)}`} 
        state={{ from: targetUrl }} 
        replace 
      />
    );
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

  return <Outlet />;
};
