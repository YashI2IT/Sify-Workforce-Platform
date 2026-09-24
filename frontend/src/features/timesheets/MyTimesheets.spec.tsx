import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MyTimesheets } from './MyTimesheets';

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

const mockTimesheets = [
  {
    id: 'ts-1',
    employeeId: 'emp-1',
    startDate: '2026-09-15T00:00:00.000Z',
    endDate: '2026-09-21T23:59:59.999Z',
    status: 'APPROVED',
  },
  {
    id: 'ts-2',
    employeeId: 'emp-1',
    startDate: '2026-09-08T00:00:00.000Z',
    endDate: '2026-09-14T23:59:59.999Z',
    status: 'SUBMITTED',
  },
];

describe('MyTimesheets Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockResolvedValue(mockTimesheets);
  });

  it('renders timesheet list with status pills and actions', async () => {
    render(
      <MemoryRouter>
        <MyTimesheets />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading timesheets...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('APPROVED')).toBeDefined();
      expect(screen.getByText('SUBMITTED')).toBeDefined();
    });

    expect(screen.getAllByText('View Details').length).toBe(2);
    expect(screen.getByText('Log Time')).toBeDefined();
  });
});
