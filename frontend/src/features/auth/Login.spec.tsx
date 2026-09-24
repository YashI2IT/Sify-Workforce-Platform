import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Login } from './Login';
import authReducer from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { authStorage } from '../../lib/authUtils';

vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    bootstrap: vi.fn(),
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
  sanitizeReturnTo: (path: string | null | undefined) => {
    if (!path || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
      return '/dashboard';
    }
    return path;
  },
}));

function renderWithProviders(ui: React.ReactElement, preloadedState: any = {}, initialRoute = '/login') {
  const store = configureStore({
    reducer: { auth: authReducer } as any,
    preloadedState,
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={ui} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
            <Route path="/onboarding" element={<div data-testid="onboarding-page">Onboarding</div>} />
            <Route path="/projects/p1" element={<div data-testid="project-p1-page">Project P1</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form for anonymous user', () => {
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });
    expect(screen.getByText('Sign in with your company credentials')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('redirects already authenticated user to /dashboard automatically', async () => {
    renderWithProviders(<Login />, { auth: { isAuthenticated: true } });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeDefined();
    });
  });

  it('validates email and password requirements using Zod without calling authService', async () => {
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeDefined();
      expect(screen.getByText('Password is required')).toBeDefined();
    });

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('validates invalid email format with Zod schema', async () => {
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeDefined();
    });

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('clears field-level error when user starts typing', async () => {
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'u@' } });
    await waitFor(() => {
      expect(screen.queryByText('Email is required')).toBeNull();
    });
  });

  it('stays on login page and shows normalized error for invalid credentials', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new Error('Invalid credentials'));
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeDefined();
    });

    expect(screen.queryByTestId('dashboard-page')).toBeNull();
  });

  it('displays friendly message for network failure', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Unable to reach the server. Please check your internet connection.')).toBeDefined();
    });
  });

  it('displays friendly message for UMS service unavailable error', async () => {
    vi.mocked(authService.login).mockRejectedValueOnce({ status: 503, message: 'Service unavailable' });
    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Authentication service is temporarily unavailable. Please try again later.')).toBeDefined();
    });
  });

  it('trims email, succeeds, stores tokens, and redirects existing user to /dashboard', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 300,
      userId: '1',
      email: 'test@example.com',
      username: 'test',
    });

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp_1', organizationId: 'org_1', role: 'EMPLOYEE' } as any,
      organization: { id: 'org_1', name: 'Org 1', organizationType: 'TECHNOLOGY' } as any,
    });

    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: '  test@example.com  ' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'correctpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'correctpass' });
      expect(authService.bootstrap).toHaveBeenCalled();
      expect(authStorage.setTokens).toHaveBeenCalledWith('access', 'refresh');
      expect(screen.getByTestId('dashboard-page')).toBeDefined();
    });
  });

  it('redirects to /onboarding if user is authenticated with UMS but has no employee record', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 300,
      userId: '1',
      email: 'test@example.com',
      username: 'test',
    });

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: true,
      employee: null,
      organization: null,
    });

    renderWithProviders(<Login />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'correctpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('onboarding-page')).toBeDefined();
    });
  });

  it('respects safe returnTo query param and navigates to intended deep link destination after login', async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 300,
      userId: '1',
      email: 'test@example.com',
      username: 'test',
    });

    vi.mocked(authService.bootstrap).mockResolvedValueOnce({
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp_1', organizationId: 'org_1', role: 'EMPLOYEE' } as any,
      organization: { id: 'org_1', name: 'Org 1' } as any,
    });

    renderWithProviders(<Login />, { auth: { isAuthenticated: false } }, '/login?returnTo=%2Fprojects%2Fp1');

    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'correctpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('project-p1-page')).toBeDefined();
    });
  });
});
