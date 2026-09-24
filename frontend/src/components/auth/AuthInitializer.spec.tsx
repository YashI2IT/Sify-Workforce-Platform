import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '../../test-utils';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import { AuthInitializer } from './AuthInitializer';
import { authService } from '../../services/authService';
import { authStorage } from '../../lib/authUtils';

vi.mock('../../services/authService', () => ({
  authService: {
    bootstrap: vi.fn(),
  },
}));

vi.mock('../../lib/authUtils', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getOrgId: vi.fn(),
    setTokens: vi.fn(),
    setOrgId: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('AuthInitializer', () => {
  let store: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderInitializer = (initialAuthState: any = {}) => {
    store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          isInitialized: false,
          isAuthenticated: false,
          onboardingRequired: false,
          token: null,
          refreshToken: null,
          orgId: null,
          employee: null,
          isInitialSetup: false,
          umsUserEmail: null,
          ...initialAuthState,
        },
      },
    });

    return render(
      <Provider store={store}>
        <AuthInitializer>
          <div data-testid="child-content">Child Content</div>
        </AuthInitializer>
      </Provider>
    );
  };

  it('marks initialized immediately without network call when no token exists', () => {
    vi.mocked(authStorage.getAccessToken).mockReturnValue(null);

    renderInitializer({ isInitialized: false });

    expect(store.getState().auth.isInitialized).toBe(true);
    expect(authService.bootstrap).not.toHaveBeenCalled();
  });

  it('bootstraps workforce session when token exists and updates auth state on success', async () => {
    vi.mocked(authStorage.getAccessToken).mockReturnValue('valid-token');
    vi.mocked(authStorage.getRefreshToken).mockReturnValue('valid-refresh');

    const mockEmployee = { id: 'emp-101', organizationId: 'org-202', role: 'EMPLOYEE' };
    const mockOrg = { id: 'org-202', name: 'Sify Digital' };

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: false,
      employee: mockEmployee,
      organization: mockOrg,
      isInitialSetup: false,
      umsUserEmail: 'user@sify.com',
    });

    renderInitializer({ isInitialized: false });

    await waitFor(() => {
      expect(authService.bootstrap).toHaveBeenCalledTimes(1);
      const state = store.getState().auth;
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.employee).toEqual(mockEmployee);
      expect(state.orgId).toBe('org-202');
      expect(state.onboardingRequired).toBe(false);
    });
  });

  it('handles 401/expired token by clearing storage and logging out', async () => {
    vi.mocked(authStorage.getAccessToken).mockReturnValue('expired-token');

    vi.mocked(authService.bootstrap).mockRejectedValueOnce(new Error('Session expired'));

    renderInitializer({ isInitialized: false });

    await waitFor(() => {
      expect(authService.bootstrap).toHaveBeenCalledTimes(1);
      expect(authStorage.clear).toHaveBeenCalled();
      const state = store.getState().auth;
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.employee).toBeNull();
    });
  });

  it('sets onboardingRequired to true when authenticated UMS user has no employee', async () => {
    vi.mocked(authStorage.getAccessToken).mockReturnValue('new-user-token');

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: true,
      employee: null,
      organization: null,
      umsUserEmail: 'newuser@sify.com',
    });

    renderInitializer({ isInitialized: false });

    await waitFor(() => {
      const state = store.getState().auth;
      expect(state.isInitialized).toBe(true);
      expect(state.isAuthenticated).toBe(true);
      expect(state.onboardingRequired).toBe(true);
      expect(state.employee).toBeNull();
    });
  });

  it('unblocks route via safety timeout if bootstrap stalls indefinitely', async () => {
    vi.useFakeTimers();
    vi.mocked(authStorage.getAccessToken).mockReturnValue('slow-token');

    // Never resolves
    vi.mocked(authService.bootstrap).mockReturnValue(new Promise(() => {}));

    renderInitializer({ isInitialized: false });

    expect(store.getState().auth.isInitialized).toBe(false);

    await React.act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(store.getState().auth.isInitialized).toBe(true);

    vi.useRealTimers();
  });
});

