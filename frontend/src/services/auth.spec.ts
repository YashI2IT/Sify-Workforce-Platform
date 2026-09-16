import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import { authStorage } from '../lib/authUtils';
import * as apiClientModule from '../lib/apiClient';

// Mock apiClient
vi.mock('../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

describe('Auth System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('authStorage (Token Storage)', () => {
    it('sets and gets tokens correctly', () => {
      authStorage.setTokens('access_123', 'refresh_456');
      expect(authStorage.getAccessToken()).toBe('access_123');
      expect(authStorage.getRefreshToken()).toBe('refresh_456');
    });

    it('clears tokens correctly', () => {
      authStorage.setTokens('access_123', 'refresh_456');
      authStorage.setOrgId('org_123');
      authStorage.clear();
      expect(authStorage.getAccessToken()).toBeNull();
      expect(authStorage.getRefreshToken()).toBeNull();
      expect(authStorage.getOrgId()).toBeNull();
    });
  });

  describe('authService', () => {
    it('register request calls UMS API with correct payload', async () => {
      const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({});
      
      await authService.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      expect(mockApiClient).toHaveBeenCalledWith('/user/', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        }),
      }, true);
    });

    it('login response mapping extracts correct fields', async () => {
      vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
        data: {
          accessToken: 'jwt_access',
          refreshToken: 'jwt_refresh',
          expiresIn: 300,
          user: {
            id: 'uuid_123',
            email: 'test@example.com',
            username: 'testuser'
          }
        }
      });
      
      const result = await authService.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toEqual({
        accessToken: 'jwt_access',
        refreshToken: 'jwt_refresh',
        expiresIn: 300,
        userId: 'uuid_123',
        email: 'test@example.com',
        username: 'testuser'
      });
    });

    it('logout calls UMS API', async () => {
      const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({});
      
      await authService.logout('jwt_refresh');

      expect(mockApiClient).toHaveBeenCalledWith('/user/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'jwt_refresh' }),
      }, true);
    });
  });
});
