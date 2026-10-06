import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import '@testing-library/jest-dom';
import { OrganizationDetail } from './OrganizationDetail';
import { MemoryRouter } from 'react-router-dom';
import * as apiClientModule from '../../lib/apiClient';
import { authService } from '../../services/authService';

vi.mock('../../services/authService', () => ({
  authService: {
    bootstrap: vi.fn(),
  },
}));

describe('OrganizationDetail (Edit Profile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <OrganizationDetail />
      </MemoryRouter>
    );
  };

  it('renders edit profile form with organization data for admin', async () => {
    vi.mocked(authService.bootstrap).mockResolvedValue({
      roles: ['ADMIN'],
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp1', role: 'ADMIN' } as any,
      organization: { id: 'org1' } as any,
    });

    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/organizations/current') {
        return { name: 'My Org', organizationType: 'TECHNOLOGY', description: 'Tech company description' };
      }
      return null;
    });

    renderComponent();

    (expect(screen.getByText(/Loading organization.../i)) as any).toBeInTheDocument();

    await waitFor(() => {
      (expect(screen.getByRole('heading', { name: /Edit Profile/i })) as any).toBeInTheDocument();
      const nameInput = screen.getByLabelText(/Organization Name/i) as HTMLInputElement;
      (expect(nameInput.value) as any).toBe('My Org');
      (expect(nameInput) as any).not.toBeDisabled();
      (expect(screen.getByText('Save Changes')) as any).toBeInTheDocument();
    });
  });

  it('disables input fields and hides save button for non-admin users', async () => {
    vi.mocked(authService.bootstrap).mockResolvedValue({
      roles: ['EMPLOYEE'],
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp2', role: 'EMPLOYEE' } as any,
      organization: { id: 'org1' } as any,
    });

    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/organizations/current') {
        return { name: 'My Org', organizationType: 'TECHNOLOGY', description: 'Tech company description' };
      }
      return null;
    });

    renderComponent();

    await waitFor(() => {
      (expect(screen.getByRole('heading', { name: /Edit Profile/i })) as any).toBeInTheDocument();
      const nameInput = screen.getByLabelText(/Organization Name/i) as HTMLInputElement;
      (expect(nameInput) as any).toBeDisabled();
      (expect(screen.queryByText('Save Changes')) as any).not.toBeInTheDocument();
    });
  });

  it('allows admin to submit changes to organization details', async () => {
    vi.mocked(authService.bootstrap).mockResolvedValue({
      roles: ['ADMIN'],
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp1', role: 'ADMIN' } as any,
      organization: { id: 'org1' } as any,
    });

    const mockApiClient = vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string, options?: any) => {
      if (url === '/organizations/current' && !options) {
        return { name: 'My Org', organizationType: 'TECHNOLOGY', description: 'Tech company description' };
      }
      if (url === '/organizations/current' && options?.method === 'PATCH') {
        return { name: 'Updated Org', organizationType: 'FINANCE', description: 'Updated description' };
      }
      return null;
    });

    renderComponent();

    await waitFor(() => {
      (expect(screen.getByText('Save Changes')) as any).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Organization Name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Org' } });

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith('/organizations/current', expect.objectContaining({
        method: 'PATCH',
      }));
      (expect(screen.getByText(/Organization details updated successfully/i)) as any).toBeInTheDocument();
    });
  });
});
