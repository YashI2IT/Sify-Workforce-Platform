import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ManagerDashboardView, type ManagerDashboardViewProps } from '../Dashboard';

describe('ManagerDashboardView Redesign', () => {
  const defaultProps: ManagerDashboardViewProps = {
    employee: { id: 'mgr-1', name: 'Arjun Patel', role: 'MANAGER', roles: ['MANAGER'] },
    loading: false,
    fetchDashboardData: vi.fn(),
    getGreeting: () => 'Good morning',
    managerTeams: [
      { id: 'team-1', name: 'Platform Engineering', memberCount: 8 },
      { id: 'team-2', name: 'Cloud Infrastructure', memberCount: 5 },
    ],
    managerProjects: [
      {
        id: 'proj-1',
        name: 'Workforce Modernization',
        status: 'ACTIVE',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isActive: true,
      },
      {
        id: 'proj-2',
        name: 'Identity Migration',
        status: 'IN_PROGRESS',
        startDate: '2026-03-01',
        endDate: '2026-09-30',
        isActive: true,
      },
    ],
    approvalsCount: 3,
    managerApprovalsList: [
      {
        id: 'ts-1',
        employee: { name: 'Priya Sharma' },
        totalHours: 40,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
      },
      {
        id: 'ts-2',
        employee: { name: 'Rahul Verma' },
        totalHours: 42.5,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
      },
    ],
    dashboardError: null,
    managerReport: {
      totalTeamMembers: 13,
      managedTeamsCount: 2,
      activeProjectsCount: 2,
    },
    managerOverdueTasks: 2,
    overdueTasksList: [
      {
        id: 'task-1',
        name: 'Audit database performance',
        projectId: 'proj-1',
        projectName: 'Workforce Modernization',
        dueDate: '2026-10-15T00:00:00Z',
      },
    ],
    projectTasksMap: {
      'proj-1': { total: 10, open: 4, overdue: 1 },
      'proj-2': { total: 6, open: 2, overdue: 0 },
    },
    auditLogs: [
      {
        id: 'log-1',
        action: 'TIMESHEET_SUBMITTED',
        actorName: 'Priya Sharma',
        createdAt: '2026-10-21T08:00:00Z',
        details: {},
      },
    ],
  };

  const renderComponent = (props: Partial<ManagerDashboardViewProps> = {}) => {
    return render(
      <MemoryRouter>
        <ManagerDashboardView {...defaultProps} {...props} />
      </MemoryRouter>
    );
  };

  it('renders simplified header with personalized greeting and normal workplace language', () => {
    renderComponent();
    expect(screen.getByText(/Good morning, Arjun/i)).toBeInTheDocument();
    expect(screen.getByText("Here's what needs your attention today.")).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();

    // Verify buzzwords are gone
    expect(screen.queryByText(/team control center/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/managed functional telemetry/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/team snapshot/i)).not.toBeInTheDocument();
  });

  it('renders combined compact Team overview with real metrics', () => {
    renderComponent();
    expect(screen.getByText('Team overview')).toBeInTheDocument();

    // Metric titles and counts
    expect(screen.getByText('Managed teams')).toBeInTheDocument();
    expect(screen.getByText('Team members')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByText('Active projects')).toBeInTheDocument();
  });

  it('renders Needs your attention with prominent overdue tasks and pending approvals', () => {
    renderComponent();
    expect(screen.getByText('Needs your attention')).toBeInTheDocument();

    // Overdue tasks
    expect(screen.getByText('2 overdue')).toBeInTheDocument();
    expect(screen.getByText('Audit database performance')).toBeInTheDocument();
    expect(screen.getAllByText('Workforce Modernization').length).toBeGreaterThanOrEqual(1);

    // Pending approvals
    expect(screen.getByText('3 waiting')).toBeInTheDocument();
    expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('40 hrs')).toBeInTheDocument();
    expect(screen.getByText('Review 3 timesheets')).toBeInTheDocument();
  });

  it('renders reassuring state when there are zero pending approvals and zero overdue tasks', () => {
    renderComponent({
      approvalsCount: 0,
      managerApprovalsList: [],
      managerOverdueTasks: 0,
      overdueTasksList: [],
    });

    expect(screen.getByText('No approvals waiting.')).toBeInTheDocument();
    expect(screen.getByText('All on schedule')).toBeInTheDocument();
  });

  it('renders compact Team and project status section with real data and links', () => {
    renderComponent();
    expect(screen.getByText('Team and project status')).toBeInTheDocument();

    // Projects panel
    expect(screen.getAllByText('Workforce Modernization').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Identity Migration')).toBeInTheDocument();
    expect(screen.getByText('10 tasks (4 open)')).toBeInTheDocument();

    // Teams panel
    expect(screen.getByText('Platform Engineering')).toBeInTheDocument();
    expect(screen.getByText('8 members')).toBeInTheDocument();
    expect(screen.getByText('Cloud Infrastructure')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();

    // View all links
    const viewAllLinks = screen.getAllByRole('link', { name: /view all/i });
    expect(viewAllLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('renders compact Recent activity with logs or compact empty state', () => {
    // With logs
    const { unmount } = renderComponent();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
    unmount();

    // Without logs
    renderComponent({ auditLogs: [] });
    expect(
      screen.getByText(
        'No recent activity. New timesheet submissions, task updates, and approvals will appear here.'
      )
    ).toBeInTheDocument();
  });
});
