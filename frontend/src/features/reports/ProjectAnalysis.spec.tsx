import { render, screen } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ProjectAnalysis } from './ProjectAnalysis';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('ProjectAnalysis Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error if user is not an Admin', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'emp1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <ProjectAnalysis />
      </BrowserRouter>
    );

    expect(screen.getByText('You are not authorized to view the Project Analysis report.')).toBeInTheDocument();
  });

  it('renders tasks, activities, and trend for selected project', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'adm1', role: 'ADMIN', roles: ['ADMIN'] },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/projects') {
        return Promise.resolve([{ id: 'p1', name: 'Billing System', code: 'BILL' }]);
      }
      if (url.startsWith('/reports/project-analysis')) {
        return Promise.resolve({
          hoursByTask: [{ taskId: 't1', taskName: 'Schema Design', hours: 20 }],
          hoursByActivity: [{ activityId: 'a1', activityName: 'Coding', hours: 20 }],
          trend: [{ period: '2026-09-14', hours: 20 }]
        });
      }
      return Promise.resolve(null);
    });

    render(
      <BrowserRouter>
        <ProjectAnalysis />
      </BrowserRouter>
    );

    expect(await screen.findByText('Schema Design')).toBeInTheDocument();
    expect(screen.getByText('Coding')).toBeInTheDocument();
    expect(screen.getByText('2026-09-14')).toBeInTheDocument();
    expect(screen.getByText('Total Project Hours')).toBeInTheDocument();
    expect(screen.getAllByText('20h').length).toBeGreaterThanOrEqual(1);
  });
});
