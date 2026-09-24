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
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

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
      // Only redirect on 401 in production mode for authenticated requests — dev mode may not have
      // a selected employee yet, and we don't want a redirect loop.
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
