import { render, screen } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { EmployeeSummary } from './EmployeeSummary';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('EmployeeSummary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders employee summary data and status breakdown', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'emp1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
      isLoading: false,
    });

    const mockSummary = {
      employeeId: 'emp1',
      totalHours: 40,
      statusBreakdown: {
        APPROVED: 25,
        SUBMITTED: 10,
        DRAFT: 5,
        REJECTED: 0,
      },
      projectBreakdown: [
        { projectId: 'p1', projectName: 'Core Platform', hours: 30 },
        { projectId: 'p2', projectName: 'Mobile App', hours: 10 },
      ],
      dailyTotals: [
        { date: '2026-09-15', hours: 8 },
        { date: '2026-09-16', hours: 8 },
      ],
    };

    (apiClient as any).mockResolvedValue(mockSummary);

    render(
      <BrowserRouter>
        <EmployeeSummary />
      </BrowserRouter>
    );

    expect(await screen.findByText('Core Platform')).toBeInTheDocument();
    expect(screen.getByText('Mobile App')).toBeInTheDocument();
    expect(screen.getAllByText('Total Hours').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('25h')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getAllByText('10h').length).toBeGreaterThanOrEqual(1);
  });

  it('displays empty state when no data exists', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'emp1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
      isLoading: false,
    });

    (apiClient as any).mockResolvedValue(null);

    render(
      <BrowserRouter>
        <EmployeeSummary />
      </BrowserRouter>
    );

    expect(await screen.findByText('No data to display. Adjust date range and refresh.')).toBeInTheDocument();
  });

  it('allows Admin to select all employees or a specific employee', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'admin1', role: 'ADMIN', roles: ['ADMIN'] },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url.includes('/employees?limit=100')) {
        return Promise.resolve([
          { id: 'emp-kiran', name: 'Kiran Mane', employeeCode: 'EMP001' },
          { id: 'emp-suyash', name: 'Suyash Patil', employeeCode: 'EMP002' },
        ]);
      }
      return Promise.resolve({
        totalHours: 44.5,
        statusBreakdown: { APPROVED: 44.5, SUBMITTED: 0, DRAFT: 0, REJECTED: 0 },
        projectBreakdown: [{ projectId: 'p1', projectName: 'Core Platform', hours: 44.5 }],
        dailyTotals: [{ date: '2026-09-18', hours: 44.5 }],
      });
    });

    render(
      <BrowserRouter>
        <EmployeeSummary />
      </BrowserRouter>
    );

    expect(await screen.findByText('All Employees (Organization-Wide)')).toBeInTheDocument();
  });
});

