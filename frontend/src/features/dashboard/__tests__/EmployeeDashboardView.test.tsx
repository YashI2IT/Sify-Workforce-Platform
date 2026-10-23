import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EmployeeDashboardView, type EmployeeDashboardViewProps } from '../Dashboard';

describe('EmployeeDashboardView Redesign for Everyday Use', () => {
  const defaultProps: EmployeeDashboardViewProps = {
    employee: { id: 'emp-101', name: 'John Doe', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
    loading: false,
    dashboardError: null,
    fetchDashboardData: vi.fn(),
    getGreeting: () => 'Good morning',
    projectsData: [
      { id: 'proj-1', name: 'Cloud Migration', status: 'ACTIVE', code: 'PRJ', description: 'Migrate legacy workloads' },
      { id: 'proj-2', name: 'Portal Redesign', status: 'IN_PROGRESS', code: 'PRT', description: 'NextGen web portal' },
    ],
    weeklyHours: 32.5,
    todayHours: 6.5,
    weeklyPacePct: 81,
    currentTimesheetStatus: 'DRAFT',
    recentTimesheets: [
      {
        id: 'ts-cur',
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        status: 'DRAFT',
        summary: { loggedHours: 32.5, expectedHours: 40, approvedHours: 0, variance: -7.5 },
      },
    ],
    recentEntries: [
      {
        id: 'entry-1',
        projectId: 'proj-1',
        projectName: 'Cloud Migration',
        taskId: 'task-1',
        taskName: 'Configure VPC peering',
        ticketId: 'PRJ-101',
        date: '2026-10-23',
        hours: 4.5,
      },
      {
        id: 'entry-2',
        projectId: 'proj-2',
        projectName: 'Portal Redesign',
        taskId: 'task-2',
        taskName: 'Header responsive fix',
        ticketId: 'PRT-204',
        date: '2026-10-23',
        hours: 2.0,
      },
    ],
    formatWeekRange: () => 'Oct 19 – Oct 25, 2026',
    assignedTasks: [
      {
        id: 'task-1',
        ticketId: 'PRJ-101',
        name: 'Configure VPC peering',
        projectId: 'proj-1',
        projectName: 'Cloud Migration',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2026-10-20', // Overdue
        isActive: true,
      },
      {
        id: 'task-2',
        ticketId: 'PRT-204',
        name: 'Header responsive fix',
        projectId: 'proj-2',
        projectName: 'Portal Redesign',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '2026-10-24', // Due tomorrow/soon
        isActive: true,
      },
    ],
    currentTimesheet: {
      id: 'ts-cur',
      startDate: '2026-10-19',
      endDate: '2026-10-25',
      status: 'DRAFT',
      summary: { loggedHours: 32.5, expectedHours: 40, approvedHours: 0, variance: -7.5 },
    },
  };

  const renderView = (props: Partial<EmployeeDashboardViewProps> = {}) => {
    return render(
      <MemoryRouter>
        <EmployeeDashboardView {...defaultProps} {...props} />
      </MemoryRouter>
    );
  };

  it('renders the compact header with exact supporting line and primary Log Time action', () => {
    renderView();

    expect(screen.getByText('Good morning, John')).toBeInTheDocument();
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Your work, hours, and upcoming deadlines.')).toBeInTheDocument();

    const logTimeButton = screen.getAllByRole('link', { name: /log time/i })[0];
    expect(logTimeButton).toBeInTheDocument();
    expect(logTimeButton).toHaveAttribute('href', '/time-entries');
  });

  it('renders exactly the 3 focused summary cards without the redundant 4th timesheet KPI card', () => {
    renderView();

    // 3 cards present
    expect(screen.getByText('Tasks to Complete')).toBeInTheDocument();
    expect(screen.getByText('Hours Logged Today')).toBeInTheDocument();
    expect(screen.getByText('This Week')).toBeInTheDocument();

    // Card 1 values
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 open tasks
    expect(screen.getByText(/1 overdue/i)).toBeInTheDocument();

    // Card 2 values
    expect(screen.getByText('6.5')).toBeInTheDocument();
    expect(screen.getByText('Actual recorded hours today')).toBeInTheDocument();
    expect(screen.getByText('1.5h remaining')).toBeInTheDocument();

    // Card 3 values
    expect(screen.getByText('32.5')).toBeInTheDocument();
    expect(screen.getByText(/Pace \(40h target\)/i)).toBeInTheDocument();
    expect(screen.getByText(/81%/i)).toBeInTheDocument();

    // Ensure the old redundant "Current Timesheet" KPI card is not rendered in the top ribbon
    expect(screen.queryByText('Active week status')).not.toBeInTheDocument();
    expect(screen.queryByText('Current work week cycle')).not.toBeInTheDocument();
  });

  it('State 1: Displays overdue and due-soon tasks in Needs Attention and My Active Work', () => {
    renderView();

    // Needs attention item
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText(/PRJ-101: Configure VPC peering/i)).toBeInTheDocument();
    const openTaskBtn = screen.getAllByRole('link', { name: /open task/i })[0];
    expect(openTaskBtn).toBeInTheDocument();
    expect(openTaskBtn).toHaveAttribute('href', '/projects/proj-1?taskId=task-1');

    // My Active Work list
    expect(screen.getByText('My Active Work')).toBeInTheDocument();
    expect(screen.getByText('PRJ-101')).toBeInTheDocument();
    expect(screen.getByText('PRT-204')).toBeInTheDocument();
  });

  it('State 2: Displays "You\'re all caught up." when there are no overdue tasks or pending actions', () => {
    renderView({
      assignedTasks: [
        {
          id: 'task-done',
          ticketId: 'PRJ-100',
          name: 'Completed Setup',
          projectId: 'proj-1',
          status: 'DONE',
          isActive: true,
        },
      ],
      recentTimesheets: [
        {
          id: 'ts-app',
          startDate: '2026-10-19',
          endDate: '2026-10-25',
          status: 'APPROVED',
          summary: { loggedHours: 40, expectedHours: 40, approvedHours: 40, variance: 0 },
        },
      ],
      currentTimesheet: {
        id: 'ts-app',
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        status: 'APPROVED',
        summary: { loggedHours: 40, expectedHours: 40, approvedHours: 40, variance: 0 },
      },
      currentTimesheetStatus: 'APPROVED',
    });

    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
    expect(
      screen.getByText('No overdue tasks, rejected timesheets, or pending submissions requiring your attention.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Needs Attention')).not.toBeInTheDocument();
  });

  it('State 3: Handles employee with no time entries today gracefully', () => {
    renderView({
      todayHours: 0,
      recentEntries: [],
    });

    // Hours logged today
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('8.0h remaining')).toBeInTheDocument();

    // Recent time entries empty state
    expect(screen.getByText('No recent time entries recorded.')).toBeInTheDocument();
  });

  it('State 4: Prompts employee to submit draft timesheet in My Timesheet panel', () => {
    renderView({
      currentTimesheetStatus: 'DRAFT',
      weeklyHours: 35,
      currentTimesheet: {
        id: 'ts-draft-1',
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        status: 'DRAFT',
        summary: { loggedHours: 35, expectedHours: 40, approvedHours: 0, variance: -5 },
      },
    });

    expect(screen.getByText('My Timesheet')).toBeInTheDocument();
    const submitBtns = screen.getAllByRole('link', { name: /submit timesheet/i });
    expect(submitBtns.length).toBeGreaterThan(0);
    expect(submitBtns.some((btn) => btn.getAttribute('href') === '/timesheets/ts-draft-1')).toBe(true);
  });

  it('State 5: Displays "Fix Timesheet" with rejection feedback when a timesheet is rejected', () => {
    renderView({
      currentTimesheetStatus: 'REJECTED',
      recentTimesheets: [
        {
          id: 'ts-rej-1',
          startDate: '2026-10-12',
          endDate: '2026-10-18',
          status: 'REJECTED',
          rejectionComment: 'Missing hours for Friday deployment',
          summary: { loggedHours: 32, expectedHours: 40, approvedHours: 0, variance: -8 },
        },
      ],
      currentTimesheet: {
        id: 'ts-rej-1',
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        status: 'REJECTED',
        rejectionComment: 'Missing hours for Friday deployment',
      },
    });

    // In Needs Attention
    expect(screen.getByText(/Reason: "Missing hours for Friday deployment"/i)).toBeInTheDocument();
    const fixBtns = screen.getAllByRole('link', { name: /fix timesheet/i });
    expect(fixBtns.length).toBeGreaterThan(0);
    expect(fixBtns[0]).toHaveAttribute('href', '/timesheets/ts-rej-1');

    // In My Timesheet panel
    expect(screen.getByText('Revision Required')).toBeInTheDocument();
  });

  it('State 6: Displays "View Timesheet" when current timesheet is submitted or approved', () => {
    renderView({
      currentTimesheetStatus: 'SUBMITTED',
      currentTimesheet: {
        id: 'ts-sub-1',
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        status: 'SUBMITTED',
      },
    });

    expect(screen.getByText('Under Review')).toBeInTheDocument();
    expect(screen.getByText(/Timesheet submitted. Awaiting manager review and sign-off./i)).toBeInTheDocument();
    const viewBtn = screen.getByRole('link', { name: /view timesheet/i });
    expect(viewBtn).toBeInTheDocument();
    expect(viewBtn).toHaveAttribute('href', '/timesheets/ts-sub-1');
  });

  it('State 7: Gracefully handles missing tasks or projects without errors', () => {
    renderView({
      assignedTasks: [],
      projectsData: [],
      recentEntries: [],
      recentTimesheets: [],
      currentTimesheet: null,
      currentTimesheetStatus: null,
      weeklyHours: 0,
      todayHours: 0,
      weeklyPacePct: 0,
    });

    expect(screen.getByText('No open tasks assigned')).toBeInTheDocument();
    expect(screen.getByText('No active projects assigned to you.')).toBeInTheDocument();
    expect(screen.getByText('No recent time entries recorded.')).toBeInTheDocument();
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });
});
