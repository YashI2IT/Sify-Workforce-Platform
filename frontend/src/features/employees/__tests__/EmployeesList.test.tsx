import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeesList } from '../EmployeesList';

// Mock current employee
let mockCurrentEmp: any = {
  id: 'emp-admin',
  name: 'Admin User',
  email: 'admin@sify.com',
  role: 'ADMIN',
  roles: ['ADMIN'],
  organizationId: 'org-1',
};

vi.mock('../../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: mockCurrentEmp,
    isLoading: false,
    error: null,
  }),
}));

const mockShowToast = vi.fn();
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

const mockRefetchEmployees = vi.fn();
const mockRefetchTeams = vi.fn();
const mockRefetchInvites = vi.fn();
const mockCreateInvitation = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'inv-new' }) });
const mockUpdateEmployee = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'emp-1' }) });
const mockCancelInvitation = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });
const mockResendInvitation = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });

const mockTeams = [
  { id: 'team-1', name: 'Core Infrastructure' },
  { id: 'team-2', name: 'Product Engineering' },
];

const mockEmployees = [
  {
    id: 'emp-admin',
    organizationId: 'org-1',
    employeeCode: 'EMP-001',
    name: 'Admin User',
    email: 'admin@sify.com',
    teamId: 'team-1',
    isActive: true,
    role: 'ADMIN',
  },
  {
    id: 'emp-2',
    organizationId: 'org-1',
    employeeCode: 'EMP-002',
    name: 'Sarah Connor',
    email: 'sarah@sify.com',
    teamId: 'team-1',
    isActive: true,
    role: 'MANAGER',
  },
  {
    id: 'emp-3',
    organizationId: 'org-1',
    employeeCode: 'EMP-003',
    name: 'John Smith',
    email: 'john@sify.com',
    teamId: 'team-2',
    isActive: true,
    role: 'EMPLOYEE',
  },
  {
    id: 'emp-4',
    organizationId: 'org-1',
    employeeCode: 'EMP-004',
    name: 'David Miller',
    email: 'david@sify.com',
    teamId: null,
    isActive: false,
    role: 'EMPLOYEE',
  },
];

const mockInvitations = [
  {
    id: 'inv-1',
    organizationId: 'org-1',
    email: 'alex@sify.com',
    name: 'Alex Rivera',
    role: 'EMPLOYEE',
    teamId: 'team-2',
    status: 'PENDING',
    expiresAt: '2026-11-01T00:00:00Z',
    createdAt: '2026-10-20T00:00:00Z',
  },
];

vi.mock('../../../store/apiSlice', () => ({
  useGetEmployeesQuery: () => ({
    data: mockEmployees,
    isLoading: false,
    error: null,
    refetch: mockRefetchEmployees,
  }),
  useGetTeamsQuery: () => ({
    data: mockTeams,
    isLoading: false,
    error: null,
    refetch: mockRefetchTeams,
  }),
  useGetEmployeeInvitationsQuery: () => ({
    data: mockInvitations,
    isLoading: false,
    error: null,
    refetch: mockRefetchInvites,
  }),
  useCreateEmployeeInvitationMutation: () => [mockCreateInvitation],
  useUpdateEmployeeMutation: () => [mockUpdateEmployee],
  useCancelEmployeeInvitationMutation: () => [mockCancelInvitation],
  useResendEmployeeInvitationMutation: () => [mockResendInvitation],
}));

describe('EmployeesList UX and Functionality Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentEmp = {
      id: 'emp-admin',
      name: 'Admin User',
      email: 'admin@sify.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
      organizationId: 'org-1',
    };
  });

  it('renders page heading with exact title, subtitle, count badge, and actions', () => {
    render(<EmployeesList />);

    expect(screen.getByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByText('Manage employees, roles, and team assignments.')).toBeInTheDocument();
    expect(screen.getByText('4 employees')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh employees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite Employee' })).toBeInTheDocument();
  });

  it('renders 4 summary cards with accurate and mathematically agreeing metrics', () => {
    render(<EmployeesList />);

    // Total Employees: 4 employees in workforce
    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('Across the organization · Excludes pending invites')).toBeInTheDocument();

    // Assigned to Teams: 3 active employees (EMP-001, EMP-002, EMP-003) all assigned = 100%
    expect(screen.getByText('Assigned to Teams')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('3 of 3 active employees assigned')).toBeInTheDocument();

    // Leadership: 1 Admin + 1 Manager = 2 leaders
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.getByText('1 manager · 1 admin')).toBeInTheDocument();

    // Pending Invitations: 1 pending invitation
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('1 awaiting response')).toBeInTheDocument();
  });

  it('provides search across name, employee code/ID, and email', async () => {
    const user = userEvent.setup();
    render(<EmployeesList />);

    const searchInput = screen.getByPlaceholderText('Search by name, employee ID, or email...');

    // Search by code
    await user.type(searchInput, 'EMP-003');
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();

    // Clear search
    await user.click(screen.getByTitle('Clear search'));
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();

    // Search by email
    await user.type(searchInput, 'sarah@sify.com');
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
  });

  it('filters by status & role pills (All, Active, Managers, Invited)', async () => {
    const user = userEvent.setup();
    render(<EmployeesList />);

    // Active pill (3 active employees: EMP-001, EMP-002, EMP-003)
    const activeBtn = screen.getByRole('button', { name: 'Active (3)' });
    await user.click(activeBtn);
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
    expect(screen.queryByText('David Miller')).not.toBeInTheDocument();
    expect(screen.queryByText('Alex Rivera')).not.toBeInTheDocument();

    // Managers pill (1 manager: Sarah Connor)
    const managersBtn = screen.getByRole('button', { name: 'Managers (1)' });
    await user.click(managersBtn);
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();

    // Invited pill (1 pending invitation: Alex Rivera)
    const invitedBtn = screen.getByRole('button', { name: 'Invited (1)' });
    await user.click(invitedBtn);
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.queryByText('Sarah Connor')).not.toBeInTheDocument();
  });

  it('displays the exact 6 column headings in the table', () => {
    render(<EmployeesList />);

    expect(screen.getByRole('columnheader', { name: 'Employee' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Employee ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('displays role badges and Unassigned team cell appropriately', () => {
    render(<EmployeesList />);

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getAllByText('Employee').length).toBeGreaterThanOrEqual(1);

    // David Miller is unassigned
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('opens Invite Employee modal, generates password, and submits invitation', async () => {
    const user = userEvent.setup();
    render(<EmployeesList />);

    await user.click(screen.getByRole('button', { name: 'Invite Employee' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Invite Employee' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial Password/)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Full Name/), 'Bruce Wayne');
    await user.clear(screen.getByLabelText(/Email Address/));
    await user.type(screen.getByLabelText(/Email Address/), 'bruce@wayne.com');

    const submitBtn = screen.getByRole('button', { name: 'Send Invitation' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateInvitation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Bruce Wayne',
          email: 'bruce@wayne.com',
          role: 'EMPLOYEE',
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith('Invitation sent successfully with login details', 'success');
    });
  });

  it('opens Edit Employee modal, loads data, and saves changes', async () => {
    const user = userEvent.setup();
    render(<EmployeesList />);

    const editBtn = screen.getByRole('button', { name: 'Edit Sarah Connor' });
    await user.click(editBtn);

    expect(screen.getByRole('heading', { level: 2, name: 'Edit Employee' })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Full Name/);
    expect(nameInput).toHaveValue('Sarah Connor');

    await user.clear(nameInput);
    await user.type(nameInput, 'Sarah Connor Smith');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateEmployee).toHaveBeenCalledWith({
        id: 'emp-2',
        data: expect.objectContaining({
          name: 'Sarah Connor Smith',
        }),
      });
      expect(mockShowToast).toHaveBeenCalledWith('Employee updated successfully', 'success');
    });
  });

  it('opens Deactivate confirmation modal and executes status toggle', async () => {
    const user = userEvent.setup();
    render(<EmployeesList />);

    const deactivateBtn = screen.getByRole('button', { name: 'Deactivate Sarah Connor' });
    await user.click(deactivateBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Deactivate Employee' })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to deactivate Sarah Connor/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Deactivate' });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUpdateEmployee).toHaveBeenCalledWith({
        id: 'emp-2',
        data: { isActive: false },
      });
      expect(mockShowToast).toHaveBeenCalledWith('Employee Sarah Connor is now Inactive', 'success');
    });
  });

  it('resends and cancels pending invitations', async () => {
    const user = userEvent.setup();
    render(<EmployeesList />);

    // Resend
    const resendBtn = screen.getByRole('button', { name: 'Resend invitation to alex@sify.com' });
    await user.click(resendBtn);
    await waitFor(() => {
      expect(mockResendInvitation).toHaveBeenCalledWith('inv-1');
      expect(mockShowToast).toHaveBeenCalledWith('Invitation resent successfully', 'success');
    });

    // Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel invitation for alex@sify.com' });
    await user.click(cancelBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Cancel Invitation' })).toBeInTheDocument();
    const confirmCancelBtn = screen.getByRole('button', { name: 'Cancel Invitation' });
    await user.click(confirmCancelBtn);

    await waitFor(() => {
      expect(mockCancelInvitation).toHaveBeenCalledWith('inv-1');
      expect(mockShowToast).toHaveBeenCalledWith('Invitation for Alex Rivera cancelled', 'success');
    });
  });
});
