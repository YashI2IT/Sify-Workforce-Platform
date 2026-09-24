import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ManagerDashboard } from './ManagerDashboard';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('ManagerDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error if user is not a Manager', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'emp1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ManagerDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText('You are not authorized to view the Manager Dashboard.')).toBeInTheDocument();
  });

  it('renders summary metrics and managed teams list for Manager', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'mgr1', role: 'MANAGER', roles: ['MANAGER'] },
      isLoading: false,
    });

    const mockDashboardData = {
      pendingApprovalsCount: 3,
      teamWeeklyFinalizedHours: 120,
      missingDraftTimesheetCount: 2,
      totalTeamMembers: 8,
      managedTeamsCount: 2,
      managedTeams: [
        { id: 't1', name: 'Frontend Team', memberCount: 5 },
        { id: 't2', name: 'Backend Team', memberCount: 3 },
      ],
    };

    (apiClient as any).mockImplementation((url: string) => {
      if (url.startsWith('/reports/manager-dashboard')) {
        return Promise.resolve(mockDashboardData);
      }
      return Promise.resolve(null);
    });

    render(
      <BrowserRouter>
        <ManagerDashboard />
      </BrowserRouter>
    );

    expect(await screen.findByText('Frontend Team')).toBeInTheDocument();
    expect(await screen.findByText('Backend Team')).toBeInTheDocument();
    expect(screen.getByText('Total Team Members')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Pending approvals
  });
});
