import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsList } from '../TeamsList';

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

const mockRefetchTeams = vi.fn();
const mockRefetchEmployees = vi.fn();
const mockCreateTeam = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'team-new' }) });
const mockUpdateTeam = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'team-1' }) });
const mockDeleteTeam = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ success: true }) });

const mockTeams = [
  { id: 'team-1', organizationId: 'org-1', name: 'Cloud Engineering', managerId: 'mgr-1' },
  { id: 'team-2', organizationId: 'org-1', name: 'Product Design', managerId: 'mgr-2' },
  { id: 'team-3', organizationId: 'org-1', name: 'Quality Assurance', managerId: null },
];

const mockEmployees = [
  { id: 'mgr-1', name: 'Alice Walker', employeeCode: 'EMP001', email: 'alice@sify.com', teamId: 'team-1', isActive: true, role: 'MANAGER', roles: ['MANAGER'] },
  { id: 'mgr-2', name: 'Bob Roberts', employeeCode: 'EMP002', email: 'bob@sify.com', teamId: 'team-2', isActive: true, role: 'MANAGER', roles: ['MANAGER'] },
  { id: 'emp-3', name: 'Charlie Dave', employeeCode: 'EMP003', email: 'charlie@sify.com', teamId: 'team-1', isActive: true, role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
  { id: 'emp-4', name: 'Diana Prince', employeeCode: 'EMP004', email: 'diana@sify.com', teamId: 'team-2', isActive: true, role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
  { id: 'emp-inactive', name: 'Inactive Emp', employeeCode: 'EMP005', email: 'inactive@sify.com', teamId: 'team-3', isActive: false, role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
  { id: 'emp-unassigned', name: 'Evan Green', employeeCode: 'EMP006', email: 'evan@sify.com', teamId: null, isActive: true, role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
];

vi.mock('../../../store/apiSlice', () => ({
  useGetTeamsQuery: () => ({
    data: mockTeams,
    isLoading: false,
    error: null,
    refetch: mockRefetchTeams,
  }),
  useGetEmployeesQuery: () => ({
    data: mockEmployees,
    isLoading: false,
    error: null,
    refetch: mockRefetchEmployees,
  }),
  useCreateTeamMutation: () => [mockCreateTeam],
  useUpdateTeamMutation: () => [mockUpdateTeam],
  useDeleteTeamMutation: () => [mockDeleteTeam],
}));

describe('TeamsList UX and Functionality Improvements', () => {
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

  it('renders page heading with exact title, subtitle, and action buttons', () => {
    render(<TeamsList />);
    
    expect(screen.getByRole('heading', { level: 1, name: 'Teams' })).toBeInTheDocument();
    expect(screen.getByText('Manage teams, team leads, and members.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh teams' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Team' })).toBeInTheDocument();
  });

  it('renders 4 summary cards with accurate and mathematically agreeing KPI counts', () => {
    render(<TeamsList />);

    // Total Teams: 3 teams
    expect(screen.getByText('Total Teams')).toBeInTheDocument();
    expect(screen.getByText('3 teams in organization')).toBeInTheDocument();

    // Team Members: 4 distinct active members assigned (mgr-1, mgr-2, emp-3, emp-4; inactive emp is excluded)
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('4 distinct active members')).toBeInTheDocument();

    // Team Leads: 2 distinct active managers assigned (mgr-1, mgr-2)
    expect(screen.getByText('Team Leads')).toBeInTheDocument();
    expect(screen.getByText('2 active leads managing teams')).toBeInTheDocument();

    // Teams Without a Lead: 1 team (team-3)
    expect(screen.getByText('Teams Without a Lead')).toBeInTheDocument();
    expect(screen.getByText('1 team requires a lead')).toBeInTheDocument();
  });

  it('filters table when clicking the "Teams Without a Lead" summary card', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    // Initially all 3 teams are in document
    expect(screen.getByText('Cloud Engineering')).toBeInTheDocument();
    expect(screen.getByText('Product Design')).toBeInTheDocument();
    expect(screen.getByText('Quality Assurance')).toBeInTheDocument();

    // Click the Teams Without a Lead card
    const card = screen.getByRole('button', { name: 'Filter teams without a lead' });
    await user.click(card);

    // Only Quality Assurance should remain
    expect(screen.queryByText('Cloud Engineering')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Design')).not.toBeInTheDocument();
    expect(screen.getByText('Quality Assurance')).toBeInTheDocument();

    // Click again to toggle back
    await user.click(card);
    expect(screen.getByText('Cloud Engineering')).toBeInTheDocument();
    expect(screen.getByText('Product Design')).toBeInTheDocument();
  });

  it('provides search and filtering that work seamlessly together', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    const searchInput = screen.getByPlaceholderText('Search teams...');
    await user.type(searchInput, 'Cloud');

    expect(screen.getByText('Cloud Engineering')).toBeInTheDocument();
    expect(screen.queryByText('Product Design')).not.toBeInTheDocument();
    expect(screen.queryByText('Quality Assurance')).not.toBeInTheDocument();

    // Clear search
    await user.click(screen.getByTitle('Clear search'));
    expect(screen.getByText('Product Design')).toBeInTheDocument();

    // Click "With Team Lead" filter pill
    const withLeadBtn = screen.getByRole('button', { name: 'With Team Lead (2)' });
    await user.click(withLeadBtn);
    expect(screen.getByText('Cloud Engineering')).toBeInTheDocument();
    expect(screen.getByText('Product Design')).toBeInTheDocument();
    expect(screen.queryByText('Quality Assurance')).not.toBeInTheDocument();

    // Click "Without Team Lead" filter pill
    const withoutLeadBtn = screen.getByRole('button', { name: 'Without Team Lead (1)' });
    await user.click(withoutLeadBtn);
    expect(screen.queryByText('Cloud Engineering')).not.toBeInTheDocument();
    expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
  });

  it('displays the exact 5 column headers in the table', () => {
    render(<TeamsList />);

    expect(screen.getByRole('columnheader', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Team Lead' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('does not display generic filler descriptions like "Operational Team"', () => {
    render(<TeamsList />);
    expect(screen.queryByText('Operational Team')).not.toBeInTheDocument();
  });

  it('displays "No team lead" restrained warning for unassigned teams', () => {
    render(<TeamsList />);
    expect(screen.getByText('No team lead')).toBeInTheDocument();
  });

  it('shows member counts and opens member roster on click', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    const rosterBtn = screen.getByRole('button', { name: 'View roster for Cloud Engineering' });
    expect(rosterBtn).toBeInTheDocument();
    await user.click(rosterBtn);

    expect(screen.getByText('Cloud Engineering Members')).toBeInTheDocument();
    expect(screen.getAllByText('Alice Walker').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Charlie Dave')).toBeInTheDocument();
  });

  it('opens Create Team modal with Team Name and Team Lead labels and creates a team', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    await user.click(screen.getByRole('button', { name: 'Create Team' }));

    expect(screen.getByRole('heading', { level: 3, name: 'Create Team' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Team Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Team Lead/)).toBeInTheDocument();

    // Fill form
    await user.type(screen.getByLabelText(/Team Name/), 'Security Operations');
    await user.selectOptions(screen.getByLabelText(/Team Lead/), 'mgr-1');

    const submitButtons = screen.getAllByRole('button', { name: 'Create Team' });
    const modalSubmitBtn = submitButtons[submitButtons.length - 1];
    await user.click(modalSubmitBtn);

    await waitFor(() => {
      expect(mockCreateTeam).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Security Operations',
        managerId: 'mgr-1',
      });
      expect(mockShowToast).toHaveBeenCalledWith('Team created successfully', 'success');
    });
  });

  it('opens Edit Team modal and updates team name and lead', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    const editBtn = screen.getByRole('button', { name: 'Edit Cloud Engineering' });
    await user.click(editBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Edit Team' })).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Team Name/);
    expect(nameInput).toHaveValue('Cloud Engineering');

    await user.clear(nameInput);
    await user.type(nameInput, 'Platform Infrastructure');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(mockUpdateTeam).toHaveBeenCalledWith({
        id: 'team-1',
        data: {
          name: 'Platform Infrastructure',
          managerId: 'mgr-1',
        },
      });
      expect(mockShowToast).toHaveBeenCalledWith('Team updated successfully', 'success');
    });
  });

  it('opens Delete confirmation dialog and executes deletion safely', async () => {
    const user = userEvent.setup();
    render(<TeamsList />);

    const deleteBtn = screen.getByRole('button', { name: 'Delete Cloud Engineering' });
    await user.click(deleteBtn);

    expect(screen.getByRole('heading', { level: 3, name: 'Delete Team' })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    expect(screen.getAllByText('Cloud Engineering').length).toBeGreaterThanOrEqual(2);

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Team' });
    await user.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteTeam).toHaveBeenCalledWith('team-1');
      expect(mockShowToast).toHaveBeenCalledWith('Team deleted successfully', 'success');
    });
  });
});
