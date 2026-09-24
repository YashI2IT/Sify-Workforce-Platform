import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test-utils';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import { ProtectedRoute } from './ProtectedRoute';
import { authService } from '../services/authService';

vi.mock('../config/env', () => ({
  env: {
    VITE_DEV_AUTH_BYPASS: false,
  },
}));

vi.mock('../services/authService', () => ({
  authService: {
    bootstrap: vi.fn(),
  },
}));

vi.mock('../lib/authUtils', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getOrgId: vi.fn(),
    setOrgId: vi.fn(),
    clear: vi.fn(),
  },
  sanitizeReturnTo: (path: string) => path || '/dashboard',
}));

describe('ProtectedRoute', () => {
  const renderWithStore = (initialState: any, initialRoute = '/dashboard') => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          isInitialized: true,
          isAuthenticated: false,
          onboardingRequired: false,
          token: null,
          refreshToken: null,
          orgId: null,
          employee: null,
          isInitialSetup: false,
          umsUserEmail: null,
          ...initialState,
        },
      },
    });

    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route path="/onboarding" element={<div data-testid="onboarding-page">Onboarding Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div data-testid="protected-content">Protected Content</div>} />
              <Route path="/setup" element={<div data-testid="setup-page">Setup Page</div>} />
              <Route path="/projects/p1" element={<div data-testid="protected-project">Project P1</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('STATE A: redirects to /login if not authenticated', () => {
    renderWithStore({ isInitialized: true, isAuthenticated: false });
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    // ProtectedRoute MUST NOT trigger bootstrap independently
    expect(authService.bootstrap).not.toHaveBeenCalled();
  });

  it('STATE B: renders session loading skeleton while initializing (isInitialized=false)', () => {
    renderWithStore({ isInitialized: false, isAuthenticated: true });
    expect(screen.getByTestId('session-loading')).toBeInTheDocument();
    expect(screen.getByText(/verifying session/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('STATE C: redirects to /onboarding when onboardingRequired is true', () => {
    renderWithStore({
      isInitialized: true,
      isAuthenticated: true,
      onboardingRequired: true,
      employee: null,
    });
    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
    expect(authService.bootstrap).not.toHaveBeenCalled();
  });

  it('STATE C: redirects to /onboarding if employee is missing', () => {
    renderWithStore({
      isInitialized: true,
      isAuthenticated: true,
      onboardingRequired: false,
      employee: null,
    });
    expect(screen.getByTestId('onboarding-page')).toBeInTheDocument();
  });

  it('STATE D: renders protected content for existing employee', () => {
    renderWithStore({
      isInitialized: true,
      isAuthenticated: true,
      orgId: 'org_123',
      employee: { id: 'emp_123', role: 'EMPLOYEE' },
      isInitialSetup: false,
    });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(authService.bootstrap).not.toHaveBeenCalled();
  });

  it('redirects new admin with isInitialSetup=true to /setup', () => {
    renderWithStore(
      {
        isInitialized: true,
        isAuthenticated: true,
        orgId: 'org_123',
        employee: { id: 'emp_admin', role: 'ADMIN' },
        isInitialSetup: true,
      },
      '/dashboard'
    );
    expect(screen.getByTestId('setup-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects completed setup admin accessing /setup back to /dashboard', () => {
    renderWithStore(
      {
        isInitialized: true,
        isAuthenticated: true,
        orgId: 'org_123',
        employee: { id: 'emp_admin', role: 'ADMIN' },
        isInitialSetup: false,
      },
      '/setup'
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
