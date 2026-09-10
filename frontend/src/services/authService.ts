import { apiClient } from '../lib/apiClient';

export const authService = {
  login: async (credentials: any) => {
    return apiClient('/user/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, true);
  },
  refreshToken: async (token: string) => {
    return apiClient('/user/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    }, true);
  },
  logout: async (token: string) => {
    return apiClient('/user/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: token }),
    }, true);
  }
};
