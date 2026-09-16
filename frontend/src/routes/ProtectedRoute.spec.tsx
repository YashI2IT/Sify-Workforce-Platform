import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import { ProtectedRoute } from './ProtectedRoute';

// Mock env
vi.mock('../config/env', () => ({
  env: {
    VITE_DEV_AUTH_BYPASS: false,
  }
}));

describe('ProtectedRoute', () => {
  const renderWithStore = (initialState: any) => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: initialState }
    });

    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div data-testid="protected-content">Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>
    );
  };

  it('redirects to login if not authenticated', () => {
    renderWithStore({ isAuthenticated: false, isInitializing: false });
    // @ts-ignore
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders protected content if authenticated and employee/role exist', () => {
    // If the orgId and employee exist, auth logic should pass
    renderWithStore({ 
      isAuthenticated: true, 
      isInitializing: false,
      orgId: 'org_123',
    });
    // However, ProtectedRoute usually checks backend auth state. If it just relies on Redux `isAuthenticated`, it shows content.
    // @ts-ignore
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
