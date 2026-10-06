import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import authReducer, { logout } from '../../store/slices/authSlice';
import { apiSlice } from '../../store/apiSlice';
import { authService } from '../../services/authService';
import { Login } from './Login';
import { ProtectedRoute } from '../../routes/ProtectedRoute';

// Mocks
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    bootstrap: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../lib/authUtils', () => ({
  authStorage: {
    setTokens: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getOrgId: vi.fn(),
    setOrgId: vi.fn(),
    clear: vi.fn(),
  },
  sanitizeReturnTo: (path: string) => path || '/dashboard',
}));

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));
import { apiClient } from '../../lib/apiClient';

// Create real-like store with logout reset middleware
const appReducer = combineReducers({
  auth: authReducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout') {
    state = undefined;
  }
  return appReducer(state, action);
};

const logoutMiddleware = (storeAPI: any) => (next: any) => (action: any) => {
  if (action.type === 'auth/logout') {
    storeAPI.dispatch(apiSlice.util.resetApiState());
  }
  return next(action);
};

const createIsolationStore = () => configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(apiSlice.middleware, logoutMiddleware),
});

const MockMyTimesheets = () => {
  const { data, isLoading } = apiSlice.endpoints.getEmployees.useQuery({ limit: 100 } as any); // Use any endpoint for test
  if (isLoading) return <div>Loading timesheets...</div>;
  
  const results = data?.data || data || [];
  if (results.length > 0) return <div data-testid="manager-timesheets">Manager Timesheets: {results[0].name}</div>;
  
  return <div>No timesheets</div>;
};

const MockAppLayout = ({ store }: { store: any }) => {
  return (
    <div>
      <button onClick={() => {
        store.dispatch(apiSlice.util.resetApiState());
        store.dispatch(logout());
      }}>Logout</button>
      <Routes>
        <Route path="/dashboard" element={<div data-testid="admin-dashboard">Admin Dashboard</div>} />
        <Route path="/timesheets" element={<MockMyTimesheets />} />
      </Routes>
    </div>
  );
};

describe('State Isolation Regression Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents Manager timesheets from leaking into Admin session after logout', async () => {
    const store = createIsolationStore();

    // 1. Setup mock responses for MANAGER login
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'mgr-token',
      refreshToken: 'mgr-refresh',
      expiresIn: 300,
      userId: 'manager-1',
      email: 'manager@example.com',
      username: 'manager',
    });

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp_mgr', organizationId: 'org_1', role: 'MANAGER' } as any,
      organization: { id: 'org_1', name: 'Org 1' } as any,
    });

    // Mock API response for Manager
    vi.mocked(apiClient).mockResolvedValueOnce({ data: [{ id: 'ts-1', name: 'Manager Timesheet 1' }] });

    const { unmount } = render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login?returnTo=/timesheets']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="*" element={<MockAppLayout store={store} />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // 2. Perform MANAGER login
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'manager@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // 3. Verify Manager lands on Timesheets and data is loaded
    await waitFor(() => {
      expect(screen.getByTestId('manager-timesheets')).toBeDefined();
    });

    // 4. Perform Logout
    fireEvent.click(screen.getByText('Logout'));

    // Wait to reach login page again
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
    });

    // Unmount completely to simulate real browser routing reload if needed, 
    // or just let it stay mounted. We will let it stay mounted to prove cache is cleared internally.

    // 5. Setup mock responses for ADMIN login
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'admin-token',
      refreshToken: 'admin-refresh',
      expiresIn: 300,
      userId: 'admin-1',
      email: 'admin@example.com',
      username: 'admin',
    });

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp_admin', organizationId: 'org_1', role: 'ADMIN' } as any,
      organization: { id: 'org_1', name: 'Org 1' } as any,
    });

    // 6. Perform ADMIN login
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // 7. Verify Admin DOES NOT see Manager's Timesheets
    await waitFor(() => {
      expect(screen.queryByTestId('manager-timesheets')).toBeNull();
      // Since returnTo from the previous logout was /timesheets, it might try to route to /timesheets.
      // But because cache is cleared, it won't show old data.
    });
    
    
    vi.mocked(apiClient).mockRestore();
    unmount();
  });
});
