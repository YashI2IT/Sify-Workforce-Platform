import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import '@testing-library/jest-dom';
import { Onboarding } from './Onboarding';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import { MemoryRouter } from 'react-router-dom';
import * as apiClientModule from '../../lib/apiClient';
import * as authUtilsModule from '../../lib/authUtils';
import { authService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  authService: {
    bootstrap: vi.fn(),
  },
}));

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
      preloadedState: { 
        auth: { 
          isAuthenticated, 
          isInitializing: false, 
          orgId: null, 
          user: null, 
          roles: [],
          umsUserEmail: 'user@sify.com'
        } 
      } as any
    });

    return render(
      <Provider store={store}>
        <MemoryRouter>
          <Onboarding />
        </MemoryRouter>
      </Provider>
    );
  };

  const mockInvites = [
    {
      id: 'inv1',
      organizationId: 'org1',
      organizationName: 'Sify Cloud Technologies',
      organizationType: 'TECHNOLOGY',
      role: 'EMPLOYEE',
      inviterName: 'Alice Admin',
      teamName: 'Engineering',
      createdAt: '2026-09-21T00:00:00Z',
      expiresAt: '2026-09-28T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
    vi.mocked(authService.bootstrap).mockResolvedValue({
      authenticated: true,
      onboardingRequired: true,
      employee: null,
      organization: null,
      umsUserEmail: 'user@sify.com',
    });
    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/employee-invitations/my-invitations') {
        return { data: mockInvites };
      }
      return null;
    });
  });

  it('1. Anonymous user → /login', () => {
    renderComponent(false);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('4. Shows error if form is incomplete', async () => {
    renderComponent(true);
    // Wait for invites to fetch
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));

    // Fill with whitespace to bypass HTML5 'required' but trigger our custom validation
    fireEvent.change(screen.getByLabelText(/Organization Name \*/i), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create organization/i }));
    
    // We can also simulate the submit directly to bypass HTML5 validation in JSDOM
    fireEvent.submit(screen.getByRole('button', { name: /create organization/i }).closest('form') as HTMLFormElement);
    
    (expect(screen.getByText(/Please provide an organization name./i)) as any).toBeInTheDocument();
  });

  it('5. POST request body contains only name + organizationType + description & 6. Successful creation → /organization', async () => {
    renderComponent(true);
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));
    
    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string, options?: any) => {
      if (url === '/employee-invitations/my-invitations') return { data: [] };
      if (url === '/organizations' && options?.method === 'POST') {
        return { data: { organization: { id: 'org1' }, employee: { id: 'emp1' } } };
      }
      return null;
    });
    const setOrgIdSpy = vi.spyOn(authUtilsModule.authStorage, 'setOrgId');

    fireEvent.change(screen.getByLabelText(/Organization Name \*/i), { target: { value: 'My Org' } });
    fireEvent.change(screen.getByLabelText(/Organization Type \*/i), { target: { value: 'TECHNOLOGY' } });
    fireEvent.change(screen.getByLabelText(/Description \(Optional\)/i), { target: { value: 'Some desc' } });
    
    fireEvent.click(screen.getByRole('button', { name: /Create Organization/i }));

    await waitFor(() => {
      expect(apiClientModule.apiClient).toHaveBeenCalledWith('/organizations', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'My Org', organizationType: 'TECHNOLOGY', description: 'Some desc' }),
      }));
      expect(setOrgIdSpy).toHaveBeenCalledWith('org1');
      expect(window.location.href).toContain('/organization');
    });
  });

  it('7. Duplicate normalizedName error is shown', async () => {
    renderComponent(true);
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));
    
    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string, options?: any) => {
      if (url === '/employee-invitations/my-invitations') return { data: [] };
      if (url === '/organizations' && options?.method === 'POST') {
        throw new Error("An organization named 'My Org' already exists.");
      }
      return null;
    });

    fireEvent.change(screen.getByLabelText(/Organization Name \*/i), { target: { value: 'My Org' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Organization/i }));

    await waitFor(() => {
      (expect(screen.getByText(/An organization named 'My Org' already exists./i)) as any).toBeInTheDocument();
    });
  });

  it('8. Organization invites flow (accepting admin invitation)', async () => {
    renderComponent(true);
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));

    // Switch to Organization Invites tab
    fireEvent.click(screen.getByRole('button', { name: /Organization Invites/i }));

    // Wait for the invitation card to be visible
    expect(await screen.findByText('Sify Cloud Technologies')).toBeInTheDocument();
    expect(screen.getByText(/Alice Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Engineering/i)).toBeInTheDocument();

    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string, options?: any) => {
      if (url === '/employee-invitations/inv1/accept-invite' && options?.method === 'POST') {
        return { data: { organization: { id: 'org1' }, employee: { id: 'emp1' } } };
      }
      return null;
    });

    const setOrgIdSpy = vi.spyOn(authUtilsModule.authStorage, 'setOrgId');

    // Click Accept & Join button
    fireEvent.click(screen.getByRole('button', { name: /Accept & Join/i }));

    await waitFor(() => {
      expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/inv1/accept-invite', expect.objectContaining({
        method: 'POST',
      }));
      expect(setOrgIdSpy).toHaveBeenCalledWith('org1');
      expect(window.location.href).toContain('/dashboard');
    });
  });

  it('9. Shows empty state when no invites exist', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/employee-invitations/my-invitations') {
        return { data: [] };
      }
      return null;
    });

    renderComponent(true);
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));

    // Switch to Organization Invites tab
    fireEvent.click(screen.getByRole('button', { name: /Organization Invites/i }));

    expect(await screen.findByText('No Pending Invites')).toBeInTheDocument();
    expect(screen.getByText(/When an organization admin invites your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Organization/i })).toBeInTheDocument();
  });

  it('10. Clicking Create New Organization button from empty invites switches to Create tab', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/employee-invitations/my-invitations') return { data: [] };
      return null;
    });

    renderComponent(true);
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));

    // Switch to Organization Invites tab
    fireEvent.click(screen.getByRole('button', { name: /Organization Invites/i }));
    expect(await screen.findByText('No Pending Invites')).toBeInTheDocument();

    // Click "Create New Organization" button on empty state
    fireEvent.click(screen.getByRole('button', { name: /Create New Organization/i }));

    // Should switch back to CREATE form
    expect(screen.getByLabelText(/Organization Name \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Organization/i })).toBeInTheDocument();
  });

  it('11. Declines invitation successfully', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string, options?: any) => {
      if (url === '/employee-invitations/my-invitations') return { data: mockInvites };
      if (url === '/employee-invitations/inv1/decline-invite' && options?.method === 'POST') {
        return { data: { success: true } };
      }
      return null;
    });

    renderComponent(true);
    await waitFor(() => expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/my-invitations'));

    // Switch to invites
    fireEvent.click(screen.getByRole('button', { name: /Organization Invites/i }));
    expect(await screen.findByText('Sify Cloud Technologies')).toBeInTheDocument();

    // Click Decline button
    fireEvent.click(screen.getByRole('button', { name: /Decline/i }));

    await waitFor(() => {
      expect(apiClientModule.apiClient).toHaveBeenCalledWith('/employee-invitations/inv1/decline-invite', expect.objectContaining({
        method: 'POST',
      }));
      // The invitation should be removed from the view
      expect(screen.queryByText('Sify Cloud Technologies')).not.toBeInTheDocument();
    });
  });
});
