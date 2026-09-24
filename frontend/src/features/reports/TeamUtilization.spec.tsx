import { render, screen } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { TeamUtilization } from './TeamUtilization';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('TeamUtilization Component', () => {
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
        <TeamUtilization />
      </BrowserRouter>
    );

    expect(screen.getByText('You are not authorized to view the Team Utilization report.')).toBeInTheDocument();
  });

  it('renders team utilization table for Manager', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'mgr1', role: 'MANAGER', roles: ['MANAGER'] },
      isLoading: false,
    });

    const mockData = {
      data: [
        {
          employeeId: 'e1',
          name: 'Alice Smith',
          employeeCode: 'EMP-001',
          statusBreakdown: { APPROVED: 30, SUBMITTED: 10, DRAFT: 0, REJECTED: 0 }
        }
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 }
    };

    (apiClient as any).mockResolvedValue(mockData);

    render(
      <BrowserRouter>
        <TeamUtilization />
      </BrowserRouter>
    );

    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('30h')).toBeInTheDocument();
    expect(screen.getByText('40h')).toBeInTheDocument();
  });
});
