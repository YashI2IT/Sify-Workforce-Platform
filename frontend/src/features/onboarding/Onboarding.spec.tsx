import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Onboarding } from './Onboarding';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import { MemoryRouter } from 'react-router-dom';
import * as apiClientModule from '../../lib/apiClient';
import * as authUtilsModule from '../../lib/authUtils';

// Mock context
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Onboarding', () => {
  const renderComponent = (isAuthenticated = true) => {
    const store = configureStore({
      reducer: { auth: authReducer } as any,
      preloadedState: { auth: { isAuthenticated, isInitializing: false, orgId: null, user: null, roles: [] } } as any
    });

    return render(
      <Provider store={store}>
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('1. Anonymous user → /login', () => {
    renderComponent(false);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('4. Organization form validation', async () => {
    renderComponent(true);
    const submitButton = screen.getByRole('button', { name: /create organization/i });
    
    // Simulate empty submit (HTML5 validation would normally catch this, but we can test manual fallback if any)
    fireEvent.submit(submitButton.closest('form') as HTMLFormElement);
    (expect(screen.getByText(/Please fill in both fields/i)) as any).toBeInTheDocument();
  });

  it('5. POST request body contains only name + code & 6. Successful creation → /organization', async () => {
    renderComponent(true);
    
    const apiClientSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
      data: {
        organization: { id: 'org1' },
        employee: { id: 'emp1' }
      }
    });

    const setOrgIdSpy = vi.spyOn(authUtilsModule.authStorage, 'setOrgId');

    fireEvent.change(screen.getByPlaceholderText(/Organization Name/i), { target: { value: 'My Org' } });
    fireEvent.change(screen.getByPlaceholderText(/Organization Code/i), { target: { value: 'ORG' } });
    fireEvent.click(screen.getByRole('button', { name: /create organization/i }));

    await waitFor(() => {
      expect(apiClientSpy).toHaveBeenCalledWith('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: 'My Org', code: 'ORG' }),
      });
      expect(setOrgIdSpy).toHaveBeenCalledWith('org1');
      expect(window.location.href).toBe('/organization');
    });
  });

  it('7. Duplicate code error is shown', async () => {
    renderComponent(true);
    
    vi.spyOn(apiClientModule, 'apiClient').mockRejectedValueOnce(new Error('Organization with this code already exists'));

    fireEvent.change(screen.getByPlaceholderText(/Organization Name/i), { target: { value: 'My Org' } });
    fireEvent.change(screen.getByPlaceholderText(/Organization Code/i), { target: { value: 'DUP' } });
    fireEvent.click(screen.getByRole('button', { name: /create organization/i }));

    await waitFor(() => {
      (expect(screen.getByText(/Organization with this code already exists/i)) as any).toBeInTheDocument();
    });
  });
});
