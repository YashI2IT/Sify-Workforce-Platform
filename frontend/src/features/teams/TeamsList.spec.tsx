import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsList } from './TeamsList';

// Mock the API client
const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args)
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({ employee: { id: 'u1', role: 'ADMIN', roles: ['ADMIN'] } })
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

const mockEmployees = [
  { id: '1', name: 'Emp 1', employeeCode: 'E1', email: 'emp1@test.com', teamId: 't1', isActive: true, role: 'EMPLOYEE' },
  { id: '2', name: 'Admin 1', employeeCode: 'A1', email: 'admin1@test.com', teamId: null, isActive: true, role: 'ADMIN' },
  { id: '3', name: 'Manager 1', employeeCode: 'M1', email: 'mgr1@test.com', teamId: 't1', isActive: true, role: 'MANAGER' },
  { id: '4', name: 'Manager 2', employeeCode: 'M2', email: 'mgr2@test.com', teamId: null, isActive: false, role: 'MANAGER' },
];

const mockTeams = [
  { id: 't1', name: 'Team Alpha', managerId: '3', organizationId: 'org1' },
  { id: 't2', name: 'Team Beta', managerId: null, organizationId: 'org1' }
];

describe('TeamsList UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/employees')) return Promise.resolve({ data: mockEmployees });
      if (url.includes('/teams')) return Promise.resolve({ data: mockTeams });
      return Promise.resolve({ data: [] });
    });
  });

  it('renders clean header, summary metric cards, and table roster', async () => {
    render(<TeamsList />);

    // Header & Live badge
    expect(screen.getByText('Teams')).toBeDefined();
    expect(screen.getByText('Manage organization teams, assign team managers, and view member rosters.')).toBeDefined();

    // Metric cards
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
      expect(screen.getByText('Team Beta')).toBeDefined();
    });

    expect(screen.getByText('Total Teams')).toBeDefined();
    expect(screen.getByText('Team Members')).toBeDefined();
    expect(screen.getByText('Total Managers')).toBeDefined();
    expect(screen.getByText('Unassigned Pool')).toBeDefined();

    // Manager status in table
    expect(screen.getByText('Manager 1')).toBeDefined();
    expect(screen.getByText('No manager assigned')).toBeDefined();
  });

  it('allows searching teams by name', async () => {
    render(<TeamsList />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
      expect(screen.getByText('Team Beta')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search teams by name...');
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });

    expect(screen.getByText('Team Alpha')).toBeDefined();
    expect(screen.queryByText('Team Beta')).toBeNull();
  });

  it('allows filtering by manager status', async () => {
    render(<TeamsList />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
      expect(screen.getByText('Team Beta')).toBeDefined();
    });

    // Filter by "Needs Manager"
    const unmanagedBtn = screen.getByText('Needs Manager (1)');
    fireEvent.click(unmanagedBtn);

    expect(screen.queryByText('Team Alpha')).toBeNull();
    expect(screen.getByText('Team Beta')).toBeDefined();

    // Filter by "With Manager"
    const managedBtn = screen.getByText('With Manager (1)');
    fireEvent.click(managedBtn);

    expect(screen.getByText('Team Alpha')).toBeDefined();
    expect(screen.queryByText('Team Beta')).toBeNull();
  });

  it('opens and closes the create team modal', async () => {
    render(<TeamsList />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
    });

    const createBtn = screen.getByText('Create Team');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Create New Team')).toBeDefined();
    });

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create New Team')).toBeNull();
    });
  });

  it('opens view members modal', async () => {
    render(<TeamsList />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
    });

    const memberButtons = screen.getAllByTitle('View roster members');
    fireEvent.click(memberButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha Members')).toBeDefined();
      expect(screen.getByText('Emp 1')).toBeDefined();
    });

    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Team Alpha Members')).toBeNull();
    });
  });

  it('renders teams and opens edit modal with correct manager dropdown logic', async () => {
    render(<TeamsList />);

    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
    });

    expect(screen.getByText('Manager 1')).toBeDefined();

    // Open Edit Modal
    const editButtons = screen.getAllByTitle('Edit team');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Team')).toBeDefined();
    });

    const select = screen.getByRole('combobox');
    
    // Active manager included
    expect(screen.getByText('Manager 1 (M1)')).toBeDefined();

    // Employees and Admins excluded
    expect(screen.queryByText('Emp 1 (E1)')).toBeNull();
    expect(screen.queryByText('Admin 1 (A1)')).toBeNull();

    // Inactive manager excluded
    expect(screen.queryByText('Manager 2 (M2)')).toBeNull();

    // No manager option
    const noManagerOption = screen.getByText('No Manager');
    expect(noManagerOption).toBeDefined();
    
    fireEvent.change(select, { target: { value: '' } });
    expect((select as HTMLSelectElement).value).toBe('');
  });
});
