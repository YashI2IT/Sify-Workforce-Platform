import { render, screen, waitFor } from '../../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AdvancedAnalytics } from './AdvancedAnalytics';

vi.mock('../../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../../lib/apiClient';
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee';

describe('AdvancedAnalytics Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders advanced analytics dashboard with charts and tables', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'emp1', role: 'MANAGER', roles: ['MANAGER'] },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url.startsWith('/reports/advanced-analytics')) {
        return Promise.resolve({
          trendData: [
            { period: '2026-09-21', totalHours: 40, APPROVED: 20, SUBMITTED: 10, DRAFT: 5, REJECTED: 5 }
          ],
          projectHoursTrend: [
            { period: '2026-09-21', projectId: 'p1', projectName: 'Project Alpha', hours: 40 }
          ],
          estimatedVsActual: [
            { taskId: 't1', taskName: 'Design DB', estimatedHours: 10, actualHours: 12 }
          ],
          overdueTaskTrend: [
            { period: '2026-09-21', count: 3 }
          ],
          periodOverPeriod: {
            currentPeriod: { startDate: '2026-08-21', endDate: '2026-09-21', totalHours: 160 },
            previousPeriod: { startDate: '2026-07-21', endDate: '2026-08-20', totalHours: 150 },
            percentageChange: 6
          }
        });
      }
      return Promise.resolve(null);
    });

    render(
      <BrowserRouter>
        <AdvancedAnalytics />
      </BrowserRouter>
    );

    expect(screen.getByText('Advanced Analytics')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Logged Hours by Parent Timesheet Status')).toBeDefined();
    });

    expect(screen.getByText('Total Logged Hours')).toBeDefined();
    expect(screen.getByText('160h')).toBeDefined();
    expect(screen.getByText('+6% vs Prev')).toBeDefined();

    expect(screen.getByText('Project Alpha')).toBeDefined();
    expect(screen.getByText('Design DB')).toBeDefined();
    expect(screen.getByText('Overdue Task Pipeline (Based on Active Tasks & Due Dates)')).toBeDefined();
  });
});
