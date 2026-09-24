import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from './apiClient';
import { authStorage } from './authUtils';

// Mock dependencies
vi.mock('./authUtils', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getOrgId: vi.fn(),
    clear: vi.fn(),
  },
}));

vi.mock('../config/env', () => ({
  env: {
    VITE_DEV_AUTH_BYPASS: false,
    VITE_API_URL: 'http://localhost:3000',
    VITE_USER_MANAGEMENT_URL: 'http://localhost:4000',
    VITE_AUTH_APP_ID: 'test-app-id',
  },
}));

describe('apiClient', () => {
  let originalWindowLocation: any;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
    
    // Mock window.location
    originalWindowLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalWindowLocation,
      href: '',
      pathname: '/some-path',
    };
  });

  afterEach(() => {
    window.location = originalWindowLocation;
  });

  it('adds authorization headers if token exists', async () => {
    vi.mocked(authStorage.getAccessToken).mockReturnValue('mock-token');
    vi.mocked(authStorage.getOrgId).mockReturnValue('mock-org');
    
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiClient('/test');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
          'x-org-id': 'mock-org',
          'x-app-id': 'test-app-id',
        }),
      })
    );
  });

  it('clears authStorage and redirects to /login on 401 Unauthorized', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthorized' }),
    } as Response);

    await expect(apiClient('/test')).rejects.toThrow('Session expired. Please log in again.');

    expect(authStorage.clear).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });

  it('redirects to /onboarding ONLY on 403 WORKFORCE_ONBOARDING_REQUIRED', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ code: 'WORKFORCE_ONBOARDING_REQUIRED' }),
    } as Response);

    await expect(apiClient('/test')).rejects.toThrow();

    expect(window.location.href).toBe('/onboarding');
  });

  it('does NOT redirect to /onboarding on other 403 errors (e.g. insufficient role)', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ code: 'WORKFORCE_INSUFFICIENT_ROLE' }),
    } as Response);

    await expect(apiClient('/test')).rejects.toThrow();

    expect(window.location.href).not.toBe('/onboarding');
  });

  it('does NOT attach Bearer token or org header when calling login endpoint', async () => {
    vi.mocked(authStorage.getAccessToken).mockReturnValue('stale-token');
    vi.mocked(authStorage.getOrgId).mockReturnValue('stale-org');

    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    await apiClient('/user/login', {}, true);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4000/user/login',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: 'Bearer stale-token',
        }),
      })
    );
  });

  it('passes through 401 on login endpoint without throwing session expired', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid credentials' }),
    } as Response);

    await expect(apiClient('/user/login', {}, true)).rejects.toThrow('Invalid credentials');
    expect(window.location.href).not.toBe('/login');
  });
});
