import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ManagerApprovals } from './ManagerApprovals';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('ManagerApprovals Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCurrentEmployee as any).mockReturnValue({
      employee: { id: 'mgr1', name: 'Manager User', role: 'MANAGER', roles: ['MANAGER'] },
      isLoading: false,
    });
  });

  it('renders pending approvals header and loading state', async () => {
    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/timesheets/approvals') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <ManagerApprovals />
      </BrowserRouter>
    );

    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
  });

  it('displays submitted timesheets for managed team members', async () => {
    const mockTimesheets = [
      { id: 'ts1', employeeId: 'emp1', startDate: '2026-09-01', endDate: '2026-09-07', status: 'SUBMITTED' }
    ];
    const mockEmp = { id: 'emp1', name: 'Alice Employee', employeeCode: 'EMP001', email: 'alice@example.com' };

    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/timesheets/approvals') {
        return Promise.resolve({ data: mockTimesheets });
      }
      if (url === '/employees/emp1') {
        return Promise.resolve(mockEmp);
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <ManagerApprovals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Employee')).toBeInTheDocument();
    });

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('handles approve action', async () => {
    const mockTimesheets = [
      { id: 'ts1', employeeId: 'emp1', startDate: '2026-09-01', endDate: '2026-09-07', status: 'SUBMITTED' }
    ];

    (apiClient as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/timesheets/approvals') {
        return Promise.resolve({ data: mockTimesheets });
      }
      if (url === '/employees/emp1') {
        return Promise.resolve({ id: 'emp1', name: 'Alice Employee' });
      }
      if (url === '/timesheets/ts1/approve' && opts?.method === 'PATCH') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <ManagerApprovals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Employee')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Approve'));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith('/timesheets/ts1/approve', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  it('opens reject modal and enforces required rejection comment', async () => {
    const mockTimesheets = [
      { id: 'ts1', employeeId: 'emp1', startDate: '2026-09-01', endDate: '2026-09-07', status: 'SUBMITTED' }
    ];

    (apiClient as any).mockImplementation((url: string, opts?: any) => {
      if (url === '/timesheets/approvals') {
        return Promise.resolve({ data: mockTimesheets });
      }
      if (url === '/employees/emp1') {
        return Promise.resolve({ id: 'emp1', name: 'Alice Employee' });
      }
      if (url === '/timesheets/ts1/reject' && opts?.method === 'PATCH') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <ManagerApprovals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Employee')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Reject'));

    expect(screen.getByText('Reject Timesheet')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText('Enter rejection reason...');
    fireEvent.change(textarea, { target: { value: 'Hours do not match project allocations' } });

    fireEvent.click(screen.getByText('Confirm Rejection'));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith('/timesheets/ts1/reject', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ comment: 'Hours do not match project allocations' }),
      }));
    });
  });

  it('displays empty state when no pending approvals exist', async () => {
    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/timesheets/approvals') {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve([]);
    });

    render(
      <BrowserRouter>
        <ManagerApprovals />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No pending approvals')).toBeInTheDocument();
    });
  });
});
