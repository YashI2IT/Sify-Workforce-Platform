import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamsList } from './TeamsList.tsx';

// Mock the API client
const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args)
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({ employee: { id: 'u1', role: 'ADMIN' } })
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() })
}));

const mockEmployees = [
  { id: '1', name: 'Emp 1', employeeCode: 'E1', isActive: true, role: 'EMPLOYEE' },
  { id: '2', name: 'Admin 1', employeeCode: 'A1', isActive: true, role: 'ADMIN' },
  { id: '3', name: 'Manager 1', employeeCode: 'M1', isActive: true, role: 'MANAGER' },
  { id: '4', name: 'Manager 2', employeeCode: 'M2', isActive: false, role: 'MANAGER' },
];

const mockTeams = [
  { id: 't1', name: 'Team Alpha', managerId: '3', organizationId: 'org1' }
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

  it('renders teams and opens edit modal', async () => {
    render(<TeamsList />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeDefined();
    });

    // 30. Existing selected manager is displayed correctly
    expect(screen.getByText('Manager 1')).toBeDefined(); // in the table

    // Open Edit Modal
    const editButtons = screen.getAllByTitle('Edit team');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Team')).toBeDefined();
    });

    const select = screen.getByRole('combobox');
    
    // 28. Manager dropdown includes active MANAGER
    expect(screen.getByText('Manager 1 (M1)')).toBeDefined();

    // 26. Manager dropdown excludes EMPLOYEE
    expect(screen.queryByText('Emp 1 (E1)')).toBeNull();

    // 27. Manager dropdown excludes ADMIN
    expect(screen.queryByText('Admin 1 (A1)')).toBeNull();

    // 29. Inactive MANAGER is excluded
    expect(screen.queryByText('Manager 2 (M2)')).toBeNull();

    // 31. Clearing manager works (selecting "No Manager" option)
    const noManagerOption = screen.getByText('No Manager');
    expect(noManagerOption).toBeDefined();
    
    fireEvent.change(select, { target: { value: '' } });
    expect((select as HTMLSelectElement).value).toBe('');
  });
});
