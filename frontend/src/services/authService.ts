import { apiClient } from '../lib/apiClient';

function normalizeAuthResponse(response: any) {
  // Try to find the token in known common places, but since the exact
  // contract is unknown, we do not guess blindly. We expect a clear 'token'
  // or 'accessToken' field, either at the root or under 'data'.
  const accessToken = response?.accessToken || response?.token || response?.data?.accessToken || response?.data?.token;
  const refreshToken = response?.refreshToken || response?.data?.refreshToken;

  if (!accessToken) {
    throw new Error('UNKNOWN_TOKEN_CONTRACT: Could not resolve access token from login response.');
  }

  // The organization structure and user identity structure is also unknown.
  // We leave them null until the contract is confirmed.
  return {
    accessToken,
    refreshToken: refreshToken || '', // Refresh token might be optional depending on provider
    orgId: null,
  };
}

export const authService = {
  login: async (credentials: any) => {
    const response = await apiClient('/user/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true);
    return normalizeAuthResponse(response);
  },
  refreshToken: async (token: string) => {
    const response = await apiClient('/user/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    }, true);
    return normalizeAuthResponse(response);
  },
  logout: async (token: string) => {
    return apiClient('/user/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    }, true);
  }
};
