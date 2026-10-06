import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ReportsAndAnalytics } from './ReportsAndAnalytics';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('ReportsAndAnalytics Component (Unified Single Reports Page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReportResponse = {
    trendData: [
      { period: '2026-09-21', totalHours: 40, APPROVED: 24, SUBMITTED: 10, DRAFT: 4, REJECTED: 2 }
    ],
    projectHoursTrend: [
      { period: '2026-09-21', projectId: 'p1', projectName: 'E-Commerce Platform', hours: 25 },
      { period: '2026-09-21', projectId: 'p2', projectName: 'Internal Tools', hours: 15 }
    ],
    estimatedVsActual: [
      { taskId: 't1', taskName: 'Design Database Schema', estimatedHours: 20, actualHours: 18 },
      { taskId: 't2', taskName: 'Setup Auth Flow', estimatedHours: 8, actualHours: 12 }
    ],
    overdueTaskTrend: [],
    periodOverPeriod: {
      currentPeriod: { totalHours: 40 },
      previousPeriod: { totalHours: 35 },
      percentageChange: 14
    }
  };

  it('renders clean header, live indicator, and summary metric cards', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'admin1', role: 'ADMIN', roles: ['ADMIN'] },
      isLoading: false,
    });

    (apiClient as any).mockResolvedValue(mockReportResponse);

    render(
      <BrowserRouter>
        <ReportsAndAnalytics />
      </BrowserRouter>
    );

    // 1. Clean Header
    expect(screen.getByText('Workforce Reports')).toBeDefined();
    expect(screen.getByText('Live Reports')).toBeDefined();
    expect(screen.getByText('A simple overview of team working hours, project progress, and timesheet approvals.')).toBeDefined();

    // 2. Preset Filter Buttons
    expect(screen.getByText('Last 7 Days')).toBeDefined();
    expect(screen.getByText('Last 30 Days')).toBeDefined();
    expect(screen.getByText('This Month')).toBeDefined();
    expect(screen.getByText('Last 90 Days')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Total Hours Worked')).toBeDefined();
    });

    expect(screen.getByText('40h')).toBeDefined();
    expect(screen.getByText('+14% vs prior period')).toBeDefined();

    expect(screen.getByText('Approved Hours')).toBeDefined();
    expect(screen.getAllByText('24h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('60% of all hours')).toBeDefined();

    expect(screen.getByText('Pending Review')).toBeDefined();
    expect(screen.getAllByText('10h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('25% awaiting check')).toBeDefined();

    expect(screen.getByText('Active Projects')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();

    // 4. Visual Section 1: Work Hours by Project
    expect(screen.getByText('Work Hours by Project')).toBeDefined();
    expect(screen.getByText('E-Commerce Platform')).toBeDefined();
    expect(screen.getByText('25h')).toBeDefined();
    expect(screen.getByText('Internal Tools')).toBeDefined();
    expect(screen.getByText('15h')).toBeDefined();

    // 5. Visual Section 2: Timesheet Review Status
    expect(screen.getByText('Timesheet Review Status')).toBeDefined();
    expect(screen.getByText('Overall Approval Distribution')).toBeDefined();
    expect(screen.getByText('60% Approved')).toBeDefined();

    // 6. Visual Section 3: Planned Time vs. Actual Time
    expect(screen.getByText('Planned Time vs. Actual Time')).toBeDefined();
    expect(screen.getByText('Design Database Schema')).toBeDefined();
    expect(screen.getByText('On Track')).toBeDefined();
    expect(screen.getByText('Setup Auth Flow')).toBeDefined();
    expect(screen.getByText('Over plan by +4h')).toBeDefined();
  });

  it('allows clicking preset filters to update date range', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'admin1', role: 'ADMIN', roles: ['ADMIN'] },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url.startsWith('/reports/advanced-analytics')) {
        return Promise.resolve(mockReportResponse);
      }
      return Promise.resolve(null);
    });

    render(
      <BrowserRouter>
        <ReportsAndAnalytics />
      </BrowserRouter>
    );

    const btn7d = screen.getByText('Last 7 Days');
    fireEvent.click(btn7d);

    expect(btn7d.className).toContain('bg-slate-900');
  });
});
