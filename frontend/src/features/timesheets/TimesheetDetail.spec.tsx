import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TimesheetDetail } from './TimesheetDetail';
import { ToastProvider } from '../../context/ToastContext';

const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: { id: 'emp-1', name: 'John Employee' },
    isLoading: false,
  }),
}));

const mockTimesheet = {
  id: 'ts-12345678',
  employeeId: 'emp-1',
  startDate: '2026-09-15T00:00:00.000Z',
  endDate: '2026-09-21T23:59:59.999Z',
  status: 'SUBMITTED',
  timeEntries: [
    {
      id: 'te-1',
      projectId: 'proj-1',
      taskId: 'task-1',
      activityId: 'act-1',
      date: '2026-09-15',
      hours: 8,
      remarks: 'Initial dev setup',
    },
  ],
};

describe('TimesheetDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve([
          { id: 'h-1', action: 'SUBMITTED', timestamp: '2026-09-21T10:00:00.000Z' },
        ]);
      }
      if (url.includes('/projects/proj-1/tasks')) {
        return Promise.resolve([{ id: 'task-1', name: 'Setup Engine' }]);
      }
      if (url.includes('/projects/proj-1/activities')) {
        return Promise.resolve([{ id: 'act-1', name: 'Engineering' }]);
      }
      if (url.includes('/employees/emp-1/projects')) {
        return Promise.resolve([{ id: 'proj-1', name: 'Enterprise Cloud', code: 'PRJ-EC' }]);
      }
      if (url.includes('/timesheets/ts-12345678')) {
        return Promise.resolve(mockTimesheet);
      }
      return Promise.resolve([]);
    });
  });

  it('renders timesheet detail overview, matrix table, and audit history', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/timesheets/ts-12345678']}>
          <Routes>
            <Route path="/timesheets/:id" element={<TimesheetDetail />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    );

    expect(screen.getByText('Loading timesheet details...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud (PRJ-EC)')).toBeDefined();
    });

    expect(screen.getAllByText('SUBMITTED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8h').length).toBeGreaterThan(0);
    expect(screen.getByText('Back to Timesheets')).toBeDefined();
    expect(screen.getByText('Status History & Audit Ledger')).toBeDefined();
  });
});
