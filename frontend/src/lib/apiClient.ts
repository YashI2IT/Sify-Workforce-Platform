import { env } from '../config/env';
import { authStorage } from './authUtils';

/**
 * Retrieves dev identity headers from sessionStorage.
 * Only used when VITE_DEV_AUTH_BYPASS=true.
 * These correspond to real employee/org records in the database.
 */
function getDevHeaders(): Record<string, string> {
  const employeeId = sessionStorage.getItem('dev_employee_id');
  const orgId = sessionStorage.getItem('dev_org_id');
  const roles = sessionStorage.getItem('dev_roles');
  const headers: Record<string, string> = {};
  if (employeeId) headers['x-dev-employee-id'] = employeeId;
  if (orgId) headers['x-dev-org-id'] = orgId;
  if (roles) headers['x-dev-roles'] = roles;
  return headers;
}

export async function apiClient(endpoint: string, options: RequestInit = {}, useAuthService = false) {
  const isAuthEndpoint = endpoint === '/user/login' || endpoint.endsWith('/login') || endpoint === '/user/' || endpoint === '/user';
  const token = authStorage.getAccessToken();
  const orgId = authStorage.getOrgId();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (env.VITE_DEV_AUTH_BYPASS) {
    // Development mode: send real employee/org IDs to the backend DevBypassGuard.
    // These are real database records, not fake credentials.
    Object.assign(headers, getDevHeaders());
  } else {
    // Production path: send real Bearer token and org header for authenticated requests.
    if (token && !isAuthEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (orgId && !isAuthEndpoint) {
      headers['x-org-id'] = orgId;
    }
  }

  headers['x-app-id'] = env.VITE_AUTH_APP_ID;

  const baseUrl = useAuthService ? env.VITE_USER_MANAGEMENT_URL : env.VITE_API_URL;
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && !env.VITE_DEV_AUTH_BYPASS && !isAuthEndpoint) {
      // Attempt to refresh the token
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshUrl = `${env.VITE_USER_MANAGEMENT_URL}/user/refresh-token`;
          const refreshRes = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-app-id': env.VITE_AUTH_APP_ID,
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            const newAccessToken = refreshData?.data?.accessToken;
            const newRefreshToken = refreshData?.data?.refreshToken;

            if (newAccessToken && newRefreshToken) {
              authStorage.setTokens(newAccessToken, newRefreshToken);
              
              // Retry the original request with the new token
              headers['Authorization'] = `Bearer ${newAccessToken}`;
              const retryResponse = await fetch(url, {
                ...options,
                headers,
              });

              if (retryResponse.ok) {
                return retryResponse.json();
              } else {
                // If retry fails with an error other than 401, we want to extract its json properly below.
                // But if it fails with 401 again, we log out.
                if (retryResponse.status === 401) {
                  throw new Error('Session expired. Please log in again.');
                }
                const errorData = await retryResponse.json().catch(() => null);
                const errorMessage = errorData?.message || errorData?.error || `Request failed with status ${retryResponse.status}`;
                const err = new Error(errorMessage);
                (err as any).code = errorData?.code;
                (err as any).status = retryResponse.status;
                throw err;
              }
            }
          }
        } catch (refreshErr) {
          // Fall through to logout
        }
      }

      // If refresh failed or no refresh token, log out
      authStorage.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }
    const errorData = await response.json().catch(() => null);

    if (response.status === 403 && errorData?.code === 'WORKFORCE_ONBOARDING_REQUIRED') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/onboarding') {
        window.location.href = '/onboarding';
      }
    }

    const errorMessage = errorData?.message || errorData?.error || (typeof errorData === 'string' ? errorData : `Request failed with status ${response.status}`);
    const err = new Error(errorMessage);
    (err as any).code = errorData?.code;
    (err as any).status = response.status;
    throw err;
  }

  return response.json();
}
