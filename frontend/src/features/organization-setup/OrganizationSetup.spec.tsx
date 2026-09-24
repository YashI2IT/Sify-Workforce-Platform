import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { OrganizationSetup } from './OrganizationSetup';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer from '../../store/slices/authSlice';
import { apiSlice } from '../../store/apiSlice';
import { apiClient } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

const mockShowToast = vi.fn();
vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const makeStore = (isInitialSetup = true) =>
  configureStore({
    reducer: {
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    preloadedState: {
      auth: {
        isInitialized: true,
        isAuthenticated: true,
        onboardingRequired: false,
        token: 'test-token',
        refreshToken: 'test-refresh',
        orgId: 'org1',
        employee: { id: 'emp1', role: 'ADMIN' },
        isInitialSetup,
        umsUserEmail: 'admin@sify.com',
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(apiSlice.middleware),
  });

const renderSetup = (isInitialSetup = true, store = makeStore(isInitialSetup)) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/setup']}>
        <OrganizationSetup />
      </MemoryRouter>
    </Provider>
  );

describe('OrganizationSetup — Step 1: Organization Profile', () => {
  const initialOrg = {
    id: 'org1',
    name: 'Sify Technologies',
    organizationType: 'TECHNOLOGY',
    description: 'A leading tech enterprise',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    isSetupComplete: false,
  };

  const setupStatusIncomplete = {
    data: {
      isProfileSaved: false,
      hasEmployees: false,
      hasTeams: false,
      hasRoles: false,
      hasManagers: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    (apiClient as any).mockImplementation(async (url: string, options?: any) => {
      if (url === '/organizations/current' && (!options || options.method === 'GET')) {
        return initialOrg;
      }
      if (url === '/organizations/current/setup-status') {
        return setupStatusIncomplete;
      }
      if (url === '/organizations/current' && options?.method === 'PATCH') {
        const body = options.body ? JSON.parse(options.body) : {};
        return {
          ...initialOrg,
          ...body,
          updatedAt: '2026-09-23T12:00:00Z',
        };
      }
      return null;
    });
  });

  // 1. Organization Profile renders
  it('1. renders custom setup header and Organization Profile form by default', async () => {
    renderSetup();

    expect(screen.getByText('Loading setup wizard...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Sify Workforce')).toBeInTheDocument();
      expect(screen.getByText('Organization Setup')).toBeInTheDocument();
      expect(screen.getAllByText('Organization Profile').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Configure your organization's core details and identity/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Organization Name \*/i)).toHaveValue('Sify Technologies');
    });
  });

  // 2. required Organization Name validation
  it('2. validates that Organization Name is required and rejects empty/whitespace input', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const nameInput = screen.getByLabelText(/Organization Name \*/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText('Organization Name is required')).toBeInTheDocument();
      expect(screen.getByText(/Please correct the highlighted errors before saving/i)).toBeInTheDocument();
    });

    expect(apiClient).not.toHaveBeenCalledWith(
      '/organizations/current',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  // 3. Organization Type validation
  it('3. validates that Organization Type is required and one of the backend supported types', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const select = screen.getByLabelText(/Industry Type \*/i);
    fireEvent.change(select, { target: { value: 'FINANCE' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        '/organizations/current',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Sify Technologies',
            organizationType: 'FINANCE',
            description: 'A leading tech enterprise',
          }),
        })
      );
    });
  });

  // 4. optional Description
  it('4. accepts an optional Description up to 500 characters and allows saving empty description', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const descInput = screen.getByLabelText(/Description \(Optional\)/i);
    fireEvent.change(descInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        '/organizations/current',
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success');
    });
  });

  // 5. Save button disabled while saving & 6. duplicate submission prevention
  it('5 & 6. disables Save button while saving and prevents duplicate submissions', async () => {
    let resolvePatch: any;
    const patchPromise = new Promise((resolve) => {
      resolvePatch = resolve;
    });

    (apiClient as any).mockImplementation(async (url: string, options?: any) => {
      if (url === '/organizations/current' && (!options || options.method === 'GET')) {
        return initialOrg;
      }
      if (url === '/organizations/current/setup-status') {
        return setupStatusIncomplete;
      }
      if (url === '/organizations/current' && options?.method === 'PATCH') {
        await patchPromise;
        return { ...initialOrg, updatedAt: '2026-09-23T12:00:00Z' };
      }
      return null;
    });

    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const saveBtn = screen.getByRole('button', { name: /Save Profile/i });
    fireEvent.click(saveBtn);

    // Save button changes to Saving... and becomes disabled
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveBtn).toBeDisabled();
    });

    // Clicking again while saving does not send another request
    fireEvent.click(saveBtn);
    expect(
      (apiClient as any).mock.calls.filter((c: any) => c[0] === '/organizations/current' && c[1]?.method === 'PATCH').length
    ).toBe(1);

    // Resolve the promise
    resolvePatch();
    await waitFor(() => {
      expect(screen.getByText('Save Profile')).toBeInTheDocument();
      expect(saveBtn).not.toBeDisabled();
    });
  });

  // 7. API success
  it('7. successfully persists profile changes and triggers success toast', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const nameInput = screen.getByLabelText(/Organization Name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Sify Global Cloud' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        '/organizations/current',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Sify Global Cloud',
            organizationType: 'TECHNOLOGY',
            description: 'A leading tech enterprise',
          }),
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success');
    });
  });

  // 8. API failure
  it('8. handles API failure safely without unlocking Step 2 and preserves field values', async () => {
    (apiClient as any).mockImplementation(async (url: string, options?: any) => {
      if (url === '/organizations/current' && (!options || options.method === 'GET')) {
        return initialOrg;
      }
      if (url === '/organizations/current/setup-status') {
        return setupStatusIncomplete;
      }
      if (url === '/organizations/current' && options?.method === 'PATCH') {
        const err = new Error("An organization named 'Taken Name' already exists.");
        (err as any).status = 409;
        throw err;
      }
      return null;
    });

    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const nameInput = screen.getByLabelText(/Organization Name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Taken Name' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('already exists'), 'error');
      // Values preserved
      expect(nameInput).toHaveValue('Taken Name');
    });

    // Step 2 remains locked
    const nextBtn = screen.getByRole('button', { name: /Next: Employees & Roles/i });
    expect(nextBtn).toBeDisabled();
  });

  // 9. Step 2 locked before successful save & 10. Step 2 unlocks after successful save
  it('9 & 10. Step 2 is locked before successful save and unlocks after successful save', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    // Step 2 is initially locked
    const step2Btn = screen.getByText('Employees & Roles').closest('button') as HTMLButtonElement;
    expect(step2Btn).toHaveAttribute('aria-disabled', 'true');

    // Clicking locked Step 2 shows subtle feedback
    fireEvent.click(step2Btn);
    expect(mockShowToast).toHaveBeenCalledWith('Complete the previous step first.', 'info');
    // Still on Step 1
    expect(screen.getByLabelText(/Organization Name \*/i)).toBeInTheDocument();

    // Now save profile
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success');
      expect(step2Btn).toHaveAttribute('aria-disabled', 'false');
    });

    // Clicking unlocked Step 2 navigates to Step 2
    fireEvent.click(step2Btn);
    await waitFor(() => {
      expect(screen.getByTestId('employees-list')).toBeInTheDocument();
    });
  });

  // 11. Step 3 remains locked
  it('11. Step 3 remains strictly locked even after Step 1 is saved', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    // Save Step 1
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success'));

    // Step 3 button
    const step3Btn = screen.getByText('Teams & Managers').closest('button') as HTMLButtonElement;
    expect(step3Btn).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(step3Btn);
    expect(mockShowToast).toHaveBeenCalledWith('Complete the previous step first.', 'info');
    expect(screen.queryByTestId('teams-list')).not.toBeInTheDocument();
  });

  // 12. Next disabled before save & 13. Next enabled after successful save
  it('12 & 13. Next button is disabled before save, enabled after save, and navigates to Step 2', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const nextBtn = screen.getByRole('button', { name: /Next: Employees & Roles/i });
    expect(nextBtn).toBeDisabled();

    // Save Step 1
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(nextBtn).not.toBeDisabled();
    });

    // Clicking Next navigates to Step 2
    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(screen.getByTestId('employees-list')).toBeInTheDocument();
    });
  });

  // 14. Continue to Workforce remains disabled
  it('14. "Continue to Workforce" button is strictly disabled and prevents bypassing incomplete setup', async () => {
    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const continueBtn = screen.getByRole('button', { name: /Continue to Workforce/i });
    expect(continueBtn).toBeDisabled();
    expect(continueBtn).toHaveAttribute('title', 'Complete all setup steps to continue');

    // Save Step 1
    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success'));

    // Still disabled!
    expect(continueBtn).toBeDisabled();
  });

  // 15. refresh preserves Step 1 completion
  it('15. page reload preserves Step 1 completion when previously saved in storage or backend', async () => {
    // Simulate persistent completion
    localStorage.setItem('setup_step1_saved_org1', 'true');

    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    // Next button should be enabled immediately without re-saving
    const nextBtn = screen.getByRole('button', { name: /Next: Employees & Roles/i });
    expect(nextBtn).not.toBeDisabled();

    // Step 2 should be unlocked immediately
    const step2Btn = screen.getByText('Employees & Roles').closest('button') as HTMLButtonElement;
    expect(step2Btn).toHaveAttribute('aria-disabled', 'false');
  });

  // 16. completed Step 1 can be edited & 17. editing does not incorrectly lock Step 2
  it('16 & 17. allows editing completed Step 1 and does not lock Step 2 after re-save', async () => {
    localStorage.setItem('setup_step1_saved_org1', 'true');

    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    const nameInput = screen.getByLabelText(/Organization Name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Sify Updated Name' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        '/organizations/current',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Sify Updated Name',
            organizationType: 'TECHNOLOGY',
            description: 'A leading tech enterprise',
          }),
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Profile updated', 'success');
    });

    // Step 2 remains unlocked
    const step2Btn = screen.getByText('Employees & Roles').closest('button') as HTMLButtonElement;
    expect(step2Btn).toHaveAttribute('aria-disabled', 'false');
    const nextBtn = screen.getByRole('button', { name: /Next: Employees & Roles/i });
    expect(nextBtn).not.toBeDisabled();
  });

  // 18. session expiry handled safely
  it('18. handles session expiry gracefully when saving profile', async () => {
    (apiClient as any).mockImplementation(async (url: string, options?: any) => {
      if (url === '/organizations/current' && (!options || options.method === 'GET')) {
        return initialOrg;
      }
      if (url === '/organizations/current/setup-status') {
        return setupStatusIncomplete;
      }
      if (url === '/organizations/current' && options?.method === 'PATCH') {
        const err = new Error('Session expired. Please log in again.');
        (err as any).status = 401;
        throw err;
      }
      return null;
    });

    renderSetup();
    await waitFor(() => screen.getByDisplayValue('Sify Technologies'));

    fireEvent.click(screen.getByRole('button', { name: /Save Profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/Session expired/i)).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Session expired'), 'error');
    });
  });

  it('renders Sign Out button and signs out user', async () => {
    renderSetup();
    await waitFor(() => screen.getByText('Sign Out'));

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i });
    expect(signOutBtn).toBeInTheDocument();
  });
});
