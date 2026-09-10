import { env } from '../config/env';

export async function apiClient(endpoint: string, options: RequestInit = {}, useAuthService = false) {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  headers['x-app-id'] = env.VITE_AUTH_APP_ID;
  if (env.VITE_AUTH_ORG_ID) {
    headers['x-org-id'] = env.VITE_AUTH_ORG_ID;
  }

  const baseUrl = useAuthService ? env.VITE_USER_MANAGEMENT_URL : env.VITE_API_URL;
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // In a real app, handle refresh token logic here.
      // For now, we dispatch logout via store if possible, or reload.
    }
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
