import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authService } from '../../services/authService';
import { authStorage } from '../../lib/authUtils';
import { setAuth, setInitialized, logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store';

interface AuthInitializerProps {
  children: React.ReactNode;
}

/**
 * AuthInitializer
 *
 * The single authoritative authentication and session bootstrap runner.
 * Responsible for verifying stored sessions against GET /api/v1/auth/me on app mount.
 *
 * ProtectedRoute and other components MUST NOT independently trigger bootstrap or /auth/me.
 */
export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useDispatch();
  const isInitialized = useSelector((state: RootState) => state.auth.isInitialized);
  const bootstrapAttempted = useRef(false);

  useEffect(() => {
    // Prevent duplicate bootstrap runs in StrictMode or re-renders
    if (isInitialized || bootstrapAttempted.current) {
      return;
    }

    const token = authStorage.getAccessToken();
    if (!token) {
      dispatch(setInitialized(true));
      return;
    }

    bootstrapAttempted.current = true;

    // Safety fallback: ensure session verification never hangs indefinitely (max 5s)
    const safetyTimer = setTimeout(() => {
      console.warn('[AuthInitializer] Session verification timed out. Unblocking route.');
      dispatch(setInitialized(true));
    }, 5000);

    authService
      .bootstrap()
      .then((state) => {
        clearTimeout(safetyTimer);
        dispatch(
          setAuth({
            accessToken: authStorage.getAccessToken() || '',
            refreshToken: authStorage.getRefreshToken() || '',
            orgId: state.organization?.id || state.employee?.organizationId || null,
            employee: state.employee || null,
            isInitialSetup: state.isInitialSetup || false,
            umsUserEmail: state.umsUserEmail || null,
            onboardingRequired: !!state.onboardingRequired,
          })
        );
      })
      .catch(() => {
        clearTimeout(safetyTimer);
        // On 401 or network failure, clean up stale session and mark initialized
        authStorage.clear();
        dispatch(logout());
      });
  }, [isInitialized, dispatch]);

  return <>{children}</>;
};
