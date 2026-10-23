import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AdminReportsView } from '../AdminReportsView';
import { ReportsAndAnalytics } from '../ReportsAndAnalytics';

let mockEmployee: any = {
  id: 'emp-admin',
  organizationId: 'org-1',
  name: 'Admin User',
  email: 'admin@sify.com',
  role: 'ADMIN',
  roles: ['ADMIN'],
};

vi.mock('../../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: mockEmployee,
    isLoading: false,
    error: null,
  }),
}));

const mockRefetch = vi.fn();

const mockReportData = {
  organization: {
    id: 'org-1',
    name: 'Sify Technologies',
    timeZone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
  },
  period: {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
  },
  filters: {},
  summary: {
    activeProjects: 3,
    completedProjects: 2,
    totalProjects: 5,
    tasksCompletedInPeriod: 14,
    totalTasks: 32,
    openTasks: 18,
    overdueTasks: 3,
    teamMembers: 24,
    totalLoggedHours: 320.5,
    approvedHours: 240,
    submittedHours: 50.5,
    draftHours: 20,
    rejectedHours: 10,
    approvalRate: 75,
  },
  projectPerformance: {
    statusBreakdown: {
      ACTIVE: 2,
      IN_PROGRESS: 1,
      PLANNING: 1,
      ON_HOLD: 0,
      COMPLETED: 2,
    },
    overdueProjectsCount: 1,
    projects: [
      {
        id: 'p-1',
        name: 'Enterprise Cloud Portal',
        code: 'ECP',
        status: 'ACTIVE',
        isActive: true,
        startDate: '2026-08-01T00:00:00.000Z',
        endDate: '2026-12-15T00:00:00.000Z',
        totalTasks: 20,
        completedTasks: 12,
        openTasks: 8,
        overdueTasks: 2,
        progressPct: 60,
        isOverdue: false,
        loggedHours: 180,
      },
      {
        id: 'p-2',
        name: 'Datacenter Automation',
        code: 'DCA',
        status: 'IN_PROGRESS',
        isActive: true,
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-10-10T00:00:00.000Z',
        totalTasks: 12,
        completedTasks: 2,
        openTasks: 10,
        overdueTasks: 1,
        progressPct: 17,
        isOverdue: true,
        loggedHours: 140.5,
      },
    ],
  },
  taskProgress: {
    totalOpenTasks: 18,
    completedInPeriod: 14,
    overdueTasksCount: 3,
    distribution: {
      TODO: { count: 8, pct: 25 },
      IN_PROGRESS: { count: 7, pct: 22 },
      REVIEW: { count: 3, pct: 9 },
      DONE: { count: 14, pct: 44 },
    },
    tasks: [
      {
        id: 'tsk-101',
        ticketId: 'ECP-101',
        name: 'API Gateway Routing',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: 'p-1',
        projectName: 'Enterprise Cloud Portal',
        projectCode: 'ECP',
        assigneeId: 'emp-2',
        assigneeName: 'Priya Sharma',
        teamId: 'team-core',
        teamName: 'Core Platform',
        dueDate: '2026-10-12T00:00:00.000Z',
        isOverdue: true,
        estimatedHours: 20,
        actualHours: 24,
        completedAt: null,
      },
      {
        id: 'tsk-102',
        ticketId: 'DCA-201',
        name: 'Network Switch Provisioning',
        status: 'DONE',
        priority: 'MEDIUM',
        projectId: 'p-2',
        projectName: 'Datacenter Automation',
        projectCode: 'DCA',
        assigneeId: 'emp-3',
        assigneeName: 'Arjun Verma',
        teamId: 'team-ops',
        teamName: 'Network Ops',
        dueDate: '2026-10-18T00:00:00.000Z',
        isOverdue: false,
        estimatedHours: 16,
        actualHours: 15.5,
        completedAt: '2026-10-17T14:30:00.000Z',
      },
    ],
  },
  teamOverview: {
    totalTeams: 2,
    teams: [
      {
        id: 'team-core',
        name: 'Core Platform',
        managerId: 'emp-10',
        managerName: 'Vikram Mehta',
        managerEmail: 'vikram.mehta@sify.com',
        activeMemberCount: 14,
        openTaskCount: 11,
        overdueTaskCount: 2,
        totalLoggedHours: 195,
      },
      {
        id: 'team-ops',
        name: 'Network Ops',
        managerId: 'emp-11',
        managerName: 'Anita Roy',
        managerEmail: 'anita.roy@sify.com',
        activeMemberCount: 10,
        openTaskCount: 7,
        overdueTaskCount: 1,
        totalLoggedHours: 125.5,
      },
    ],
  },
  workHoursSummary: {
    totalLoggedHours: 320.5,
    approvedHours: 240,
    submittedHours: 50.5,
    draftHours: 20,
    rejectedHours: 10,
    byProject: [
      { projectId: 'p-1', projectName: 'Enterprise Cloud Portal', projectCode: 'ECP', hours: 180, pct: 56 },
      { projectId: 'p-2', projectName: 'Datacenter Automation', projectCode: 'DCA', hours: 140.5, pct: 44 },
    ],
    byTeam: [
      { teamId: 'team-core', teamName: 'Core Platform', hours: 195, pct: 61 },
      { teamId: 'team-ops', teamName: 'Network Ops', hours: 125.5, pct: 39 },
    ],
  },
  filterOptions: {
    projects: [
      { id: 'p-1', name: 'Enterprise Cloud Portal', code: 'ECP' },
      { id: 'p-2', name: 'Datacenter Automation', code: 'DCA' },
    ],
    teams: [
      { id: 'team-core', name: 'Core Platform' },
      { id: 'team-ops', name: 'Network Ops' },
    ],
    employees: [
      { id: 'emp-2', name: 'Priya Sharma', email: 'priya@sify.com' },
      { id: 'emp-3', name: 'Arjun Verma', email: 'arjun@sify.com' },
    ],
    statuses: [
      { value: 'TODO', label: 'To Do' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'REVIEW', label: 'Review' },
      { value: 'DONE', label: 'Done' },
    ],
  },
};

vi.mock('../../../store/apiSlice', () => ({
  useGetAdminReportQuery: () => ({
    data: mockReportData,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: mockRefetch,
  }),
  useGetAdvancedAnalyticsReportQuery: () => ({
    data: { trendData: [], estimatedVsActual: [] },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('AdminReportsView UI/UX & Interactivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmployee = {
      id: 'emp-admin',
      organizationId: 'org-1',
      name: 'Admin User',
      email: 'admin@sify.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
    };
  });

  it('renders the required Page Heading, subtitle, and action buttons', () => {
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument();
    expect(screen.getByText('Organization-wide performance and activity.')).toBeInTheDocument();
    expect(screen.getByText('Live Telemetry')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export Report/i })).toBeInTheDocument();
  });

  it('renders 4 Summary KPI cards with genuine database values', () => {
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    // KPI 1: Active Projects
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2 completed')).toBeInTheDocument();

    // KPI 2: Tasks Completed
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getAllByText('14').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Completed in period')).toBeInTheDocument();

    // KPI 3: Overdue Tasks
    expect(screen.getAllByText('Overdue Tasks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Requires attention')).toBeInTheDocument();

    // KPI 4: Team Members
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Across 2 teams')).toBeInTheDocument();
  });

  it('renders Section A: Project Performance with status breakdown and projects table', () => {
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Project Performance' })).toBeInTheDocument();
    expect(screen.getByText('Active: 2')).toBeInTheDocument();
    expect(screen.getByText('In Progress: 1')).toBeInTheDocument();
    expect(screen.getByText('Completed: 2')).toBeInTheDocument();
    expect(screen.getByText('Overdue: 1')).toBeInTheDocument();

    // Projects in table
    expect(screen.getAllByText('Enterprise Cloud Portal').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('ECP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('180h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Datacenter Automation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('140.5h').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Section B: Task Progress with status distribution cards and tasks table', () => {
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Task Progress' })).toBeInTheDocument();
    expect(screen.getByText('API Gateway Routing')).toBeInTheDocument();
    expect(screen.getByText('ECP-101')).toBeInTheDocument();
    expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Network Switch Provisioning')).toBeInTheDocument();
    expect(screen.getByText('DCA-201')).toBeInTheDocument();
    expect(screen.getAllByText('Arjun Verma').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Section C: Team Overview with leads, active members, and open workloads', () => {
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Team Overview' })).toBeInTheDocument();
    expect(screen.getAllByText('Core Platform').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Vikram Mehta')).toBeInTheDocument();
    expect(screen.getByText('vikram.mehta@sify.com')).toBeInTheDocument();
    expect(screen.getAllByText('Network Ops').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Anita Roy')).toBeInTheDocument();
    expect(screen.getAllByText('195h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('125.5h').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Section D: Work Hours Summary with approval states and breakdowns', () => {
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    expect(screen.getByText('Work Hours Summary')).toBeInTheDocument();
    expect(screen.getByText('320.5h')).toBeInTheDocument(); // Total logged
    expect(screen.getByText('240h')).toBeInTheDocument(); // Approved
    expect(screen.getByText('50.5h')).toBeInTheDocument(); // Submitted
    expect(screen.getByText('20h')).toBeInTheDocument(); // Draft
    expect(screen.getByText('10h')).toBeInTheDocument(); // Rejected

    // Timezone and format
    expect(screen.getByText(/Organization Timezone: Asia\/Kolkata/i)).toBeInTheDocument();
    expect(screen.getByText(/Date Format: DD\/MM\/YYYY/i)).toBeInTheDocument();
  });

  it('allows period preset selection and filter dropdown interactions', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    // Switch to This Week
    const weekBtn = screen.getByRole('button', { name: 'This Week' });
    await user.click(weekBtn);
    expect(weekBtn).toHaveClass('bg-[#0B1738]');

    // Switch to This Quarter
    const quarterBtn = screen.getByRole('button', { name: 'This Quarter' });
    await user.click(quarterBtn);
    expect(quarterBtn).toHaveClass('bg-[#0B1738]');

    // Filter by project
    const projectSelect = screen.getByTitle('Filter by Project');
    await user.selectOptions(projectSelect, 'p-1');
    expect(screen.getByRole('button', { name: /Reset Filters/i })).toBeInTheDocument();

    // Click Reset Filters
    const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
    await user.click(resetBtn);
    expect(screen.queryByRole('button', { name: /Reset Filters/i })).not.toBeInTheDocument();
  });

  it('triggers CSV download when Export Report is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock Blob and URL.createObjectURL
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <MemoryRouter>
        <AdminReportsView />
      </MemoryRouter>
    );

    const exportBtn = screen.getByRole('button', { name: /Export Report/i });
    await user.click(exportBtn);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it('delegates to AdminReportsView for ADMIN users in ReportsAndAnalytics entry point', () => {
    mockEmployee = {
      id: 'emp-admin',
      role: 'ADMIN',
      roles: ['ADMIN'],
    };

    render(
      <MemoryRouter>
        <ReportsAndAnalytics />
      </MemoryRouter>
    );

    // Admin view has "Organization-wide performance and activity."
    expect(screen.getByText('Organization-wide performance and activity.')).toBeInTheDocument();
  });

  it('preserves existing non-admin view for non-admin roles (e.g. MANAGER)', () => {
    mockEmployee = {
      id: 'emp-mgr',
      role: 'MANAGER',
      roles: ['MANAGER'],
    };

    render(
      <MemoryRouter>
        <ReportsAndAnalytics />
      </MemoryRouter>
    );

    // Non-admin view has "Workforce Reports" and subtitle "A simple overview of team working hours..."
    expect(screen.getByText('Workforce Reports')).toBeInTheDocument();
    expect(screen.getByText(/A simple overview of team working hours/i)).toBeInTheDocument();
  });
});
