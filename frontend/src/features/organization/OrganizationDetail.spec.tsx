import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test-utils';
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

describe('OrganizationDetail (Setup Dashboard)', () => {
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

  it('renders admin dashboard with checklist and stats for new org', async () => {
    vi.mocked(authService.bootstrap).mockResolvedValue({
      roles: ['ADMIN'],
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp1' } as any,
      organization: { id: 'org1' } as any,
    });

    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/organizations/current') {
        return { name: 'My Org', organizationType: 'TECHNOLOGY', description: 'desc' };
      }
      if (url === '/organizations/current/setup-status') {
        return { data: { hasEmployees: true, hasTeams: false, hasRoles: false, hasManagers: false } };
      }
      return null;
    });

    renderComponent();

    (expect(screen.getByText(/Loading organization.../i)) as any).toBeInTheDocument();

    await waitFor(() => {
      (expect(screen.getByText('My Org')) as any).toBeInTheDocument();
      // Admin should see setup actions
      (expect(screen.getByText('You are the Organization Admin')) as any).toBeInTheDocument();
      (expect(screen.getByText('Setup Actions')) as any).toBeInTheDocument();
    });
  });

  it('hides setup actions for non-admin users', async () => {
    vi.mocked(authService.bootstrap).mockResolvedValue({
      roles: ['EMPLOYEE'],
      authenticated: true,
      onboardingRequired: false,
      employee: { id: 'emp2', role: 'EMPLOYEE' } as any,
      organization: { id: 'org1' } as any,
    });

    vi.spyOn(apiClientModule, 'apiClient').mockImplementation(async (url: string) => {
      if (url === '/organizations/current') {
        return { name: 'My Org', organizationType: 'TECHNOLOGY', description: 'desc' };
      }
      return { data: [], meta: { total: 0 } };
    });

    renderComponent();

    await waitFor(() => {
      (expect(screen.getByText('My Org')) as any).toBeInTheDocument();
      // Non-admin should NOT see setup actions or admin indicator
      (expect(screen.queryByText('You are the Organization Admin')) as any).not.toBeInTheDocument();
      (expect(screen.queryByText('Setup Actions')) as any).not.toBeInTheDocument();
    });
  });
});
