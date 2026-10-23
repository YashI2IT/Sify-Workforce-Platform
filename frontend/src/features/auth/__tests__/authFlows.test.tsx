import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import authReducer from '../../../store/slices/authSlice';
import { apiSlice } from '../../../store/apiSlice';
import { Login } from '../Login';
import { ProtectedRoute } from '../../../routes/ProtectedRoute';

// Helper component to display current route pathname
const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

function createMockStore(preloadedState?: any) {
  const appReducer = combineReducers({
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  });

  return configureStore({
    reducer: appReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });
}

describe('Authentication & Routing Integration Flows', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects an already authenticated EMPLOYEE visiting /login to /dashboard', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: false,
        token: 'valid-token',
        employee: { id: 'emp-1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
        isInitialSetup: false,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<div>Employee Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/dashboard');
      expect(screen.getByText('Employee Dashboard Page')).toBeDefined();
    });
  });

  it('redirects an authenticated ADMIN requiring initial setup visiting /login to /setup', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: false,
        token: 'valid-token',
        employee: { id: 'admin-1', role: 'ADMIN', roles: ['ADMIN'] },
        isInitialSetup: true,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<div>Organization Setup Wizard</div>} />
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/setup');
      expect(screen.getByText('Organization Setup Wizard')).toBeDefined();
    });
  });

  it('redirects an authenticated user requiring onboarding visiting /login to /onboarding', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: true,
        token: 'valid-token',
        employee: null,
        isInitialSetup: false,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login']}>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<div>User Onboarding Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/onboarding');
      expect(screen.getByText('User Onboarding Page')).toBeDefined();
    });
  });

  it('redirects unauthenticated user accessing protected route to /login', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: false,
        token: null,
        employee: null,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <LocationDisplay />
          <Routes>
            <Route path="/login" element={<div>Login Page Form</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/login');
      expect(screen.getByText('Login Page Form')).toBeDefined();
    });
  });

  it('prevents ADMIN from accessing employee old page /time-entries, redirecting to /dashboard', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: false,
        token: 'admin-token',
        employee: { id: 'admin-1', role: 'ADMIN', roles: ['ADMIN'] },
        isInitialSetup: false,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/time-entries']}>
          <LocationDisplay />
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Admin Dashboard</div>} />
              <Route path="/time-entries" element={<div>Time Entries Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/dashboard');
      expect(screen.getByText('Admin Dashboard')).toBeDefined();
      expect(screen.queryByText('Time Entries Page')).toBeNull();
    });
  });

  it('prevents EMPLOYEE from accessing admin /admin/audit-logs, redirecting to /dashboard', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: false,
        token: 'emp-token',
        employee: { id: 'emp-1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
        isInitialSetup: false,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/admin/audit-logs']}>
          <LocationDisplay />
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Employee Dashboard</div>} />
              <Route path="/admin/audit-logs" element={<div>Audit Logs Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/dashboard');
      expect(screen.getByText('Employee Dashboard')).toBeDefined();
      expect(screen.queryByText('Audit Logs Page')).toBeNull();
    });
  });

  it('allows EMPLOYEE to view permitted route /time-entries on session restore/refresh', async () => {
    const store = createMockStore({
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: false,
        token: 'emp-token',
        employee: { id: 'emp-1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
        isInitialSetup: false,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/time-entries']}>
          <LocationDisplay />
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Employee Dashboard</div>} />
              <Route path="/time-entries" element={<div>Employee Time Entries Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toBe('/time-entries');
      expect(screen.getByText('Employee Time Entries Page')).toBeDefined();
    });
  });

  it('shows loading skeleton while session is not initialized without redirecting to /login', () => {
    const store = createMockStore({
      auth: {
        isInitialized: false,
        isAuthenticated: true,
        token: 'restoring-token',
        employee: null,
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/timesheets']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/timesheets" element={<div>Timesheets Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByTestId('session-loading')).toBeDefined();
    expect(screen.getByText('Verifying session...')).toBeDefined();
    expect(screen.queryByText('Login Page')).toBeNull();
  });
});
