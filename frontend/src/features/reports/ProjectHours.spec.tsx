import { render, screen } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ProjectHours } from './ProjectHours';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('ProjectHours Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error if user is not an Admin', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'mgr1', role: 'MANAGER', roles: ['MANAGER'] },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProjectHours />
      </BrowserRouter>
    );

    expect(screen.getByText('You are not authorized to view the Project Hours report.')).toBeInTheDocument();
  });

  it('renders employee and task breakdowns for Admin', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'adm1', role: 'ADMIN', roles: ['ADMIN'] },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/projects') {
        return Promise.resolve([{ id: 'p1', name: 'Billing System', code: 'BILL' }]);
      }
      if (url.startsWith('/reports/project-hours')) {
        return Promise.resolve({
          totalApprovedHours: 42,
          employeeBreakdown: [{ employeeId: 'e1', name: 'John Doe', employeeCode: 'EMP1', hours: 42 }],
          taskBreakdown: [{ taskId: 't1', taskName: 'Design Database', hours: 42 }]
        });
      }
      return Promise.resolve(null);
    });

    render(
      <BrowserRouter>
        <ProjectHours />
      </BrowserRouter>
    );

    expect(await screen.findByText('Total Approved Hours: 42h')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Design Database')).toBeInTheDocument();
  });
});
