import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Register } from './Register';
import authReducer from '../../store/slices/authSlice';
import { authService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  authService: {
    register: vi.fn(),
  },
}));

vi.mock('../../lib/authUtils', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getOrgId: vi.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement, preloadedState: any = {}) {
  const store = configureStore({
    reducer: { auth: authReducer } as any,
    preloadedState,
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={ui} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form for anonymous user', () => {
    renderWithProviders(<Register />, { auth: { isAuthenticated: false } });
    expect(screen.getByText('Register a new company account')).toBeDefined();
    expect(screen.getByRole('button', { name: /register/i })).toBeDefined();
  });

  it('redirects authenticated user to /dashboard automatically', async () => {
    renderWithProviders(<Register />, { auth: { isAuthenticated: true } });
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeDefined();
    });
  });

  it('shows error for invalid registration and stays on page', async () => {
    vi.mocked(authService.register).mockRejectedValueOnce(new Error('Email already exists'));
    renderWithProviders(<Register />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeDefined();
    });
    
    // Should NOT redirect
    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('trims email, succeeds, shows message, and redirects to /login', async () => {
    vi.mocked(authService.register).mockResolvedValueOnce(undefined);

    renderWithProviders(<Register />, { auth: { isAuthenticated: false } });

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/company email/i), { target: { value: '  new@example.com  ' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({ username: 'testuser', email: 'new@example.com', password: 'password123' });
      expect(screen.getByText('Registration successful! Redirecting to login...')).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeDefined();
    }, { timeout: 3000 });
  });
});
