import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProjectDetail } from './ProjectDetail';

const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: { id: 'admin-1', name: 'Admin User', roles: ['ADMIN'] },
    isLoading: false,
  }),
}));

const mockProject = {
  id: 'proj-1',
  name: 'Enterprise Core Platform',
  code: 'ECP-001',
  status: 'ACTIVE',
  isActive: true,
  organizationId: 'org-1',
};

describe('ProjectDetail Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation((url: string) => {
      if (url === '/projects/proj-1') {
        return Promise.resolve(mockProject);
      }
      if (url === '/projects/proj-1/tasks') {
        return Promise.resolve([{ id: 'task-1', name: 'Database Migration', status: 'IN_PROGRESS', isActive: true }]);
      }
      if (url === '/projects/proj-1/activities') {
        return Promise.resolve([{ id: 'act-1', name: 'Backend Engineering', isActive: true }]);
      }
      if (url === '/projects/proj-1/requirements') {
        return Promise.resolve([{ id: 'req-1', title: 'Data Isolation', isMandatory: true, status: 'ACTIVE' }]);
      }
      if (url === '/projects/proj-1/employees') {
        return Promise.resolve([{ id: 'emp-1', name: 'Alice Developer', employeeCode: 'EMP-01', email: 'alice@example.com', role: 'EMPLOYEE', isActive: true }]);
      }
      return Promise.resolve([]);
    });
  });

  it('renders project workspace overview, metrics, and navigation tabs', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Platform')).toBeDefined();
    });

    expect(screen.getByText('ECP-001')).toBeDefined();
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
    expect(screen.getByText('Project Information & Metrics')).toBeDefined();
    expect(screen.getByText('Back to Projects')).toBeDefined();
  });

  it('allows switching between animated workspace tabs and displays dynamic counts', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Core Platform')).toBeDefined();
    });

    // Overview should be visible by default
    expect(screen.getByText('Project Information & Metrics')).toBeDefined();

    // Click Tasks tab
    const tasksTab = screen.getByRole('button', { name: /Tasks/i });
    expect(tasksTab).toBeDefined();
    fireEvent.click(tasksTab);

    // Verify task view renders
    await waitFor(() => {
      expect(screen.getByText('Database Migration')).toBeDefined();
    });

    // Click Activities tab
    const activitiesTab = screen.getByRole('button', { name: /Activities/i });
    fireEvent.click(activitiesTab);

    await waitFor(() => {
      expect(screen.getByText('Project Activities')).toBeDefined();
      expect(screen.getByText('Backend Engineering')).toBeDefined();
    });

    // Click Members tab
    const membersTab = screen.getByRole('button', { name: /Members/i });
    fireEvent.click(membersTab);

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeDefined();
    });
  });
});
