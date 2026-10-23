import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardView, type AdminDashboardViewProps } from '../Dashboard';

describe('AdminDashboardView UI Alignment & Recent Company Activity', () => {
  const defaultProps: AdminDashboardViewProps = {
    employee: { id: 'admin-1', name: 'Yash Bhosale', role: 'ADMIN', roles: ['ADMIN'] },
    orgSummary: { name: 'Sify Technologies', domain: 'sify.com' },
    loading: false,
    fetchDashboardData: vi.fn(),
    activeEmployees: 42,
    inactiveEmployees: 3,
    totalEmployees: 45,
    auditLogs: [
      {
        id: 'log-1',
        action: 'PROJECT_UPDATED',
        actorName: 'Priya Sharma',
        details: { updatedFields: ['budget', 'timeline'] },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'log-2',
        action: 'TEAM_CREATED',
        actorName: 'Yash Bhosale',
        details: { name: 'Cloud Engineering' },
        createdAt: new Date().toISOString(),
      },
    ],
    totalTeams: 6,
    teamsWithoutManager: 1,
    activeProjectsCount: 8,
    projectsData: [
      { id: 'proj-1', name: 'Cloud Migration', status: 'ACTIVE', startDate: '2026-01-01', endDate: '2026-12-31' },
      { id: 'proj-2', name: 'Data Pipeline', status: 'IN_PROGRESS', startDate: '2026-02-01', endDate: '2026-11-30' },
    ],
    projectStatusCounts: {
      ACTIVE: 8,
      IN_PROGRESS: 2,
      PLANNING: 1,
      ON_HOLD: 0,
      COMPLETED: 4,
    },
    pendingInvitationsCount: 2,
    overdueTasksCount: 3,
    pendingActionsCount: 6,
    getGreeting: () => 'Good morning',
    dashboardError: null,
  };

  const renderAdminView = (props: Partial<AdminDashboardViewProps> = {}) => {
    return render(
      <MemoryRouter>
        <AdminDashboardView {...defaultProps} {...props} />
      </MemoryRouter>
    );
  };

  it('renders the personalized greeting with user\'s first name and excludes redundant Admin Dashboard title and OVERVIEW heading', () => {
    renderAdminView();

    // Main page heading: Good morning, Yash (matching Employee header style)
    expect(screen.getByRole('heading', { level: 1, name: /good morning, yash/i })).toBeInTheDocument();

    // Redundant Admin Dashboard title and OVERVIEW must NOT exist
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('OVERVIEW')).not.toBeInTheDocument();

    // Supporting line and subtle organization badge
    expect(screen.getByText('Your company at a glance.')).toBeInTheDocument();
    expect(screen.getByText('Sify Technologies')).toBeInTheDocument();
  });

  it('renders exactly three summary cards linking to respective pages and excludes Pending Actions card', () => {
    renderAdminView();

    // Exactly 3 summary cards
    expect(screen.getByText('Active Employees')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Total Teams')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();

    // Actions
    expect(screen.getByText(/view employees/i)).toBeInTheDocument();
    expect(screen.getByText(/view projects/i)).toBeInTheDocument();
    expect(screen.getByText(/view teams/i)).toBeInTheDocument();

    // 4th card removed from summary ribbon
    expect(screen.queryByText('Pending Actions')).not.toBeInTheDocument();

    // Verify navigation links of summary cards
    expect(screen.getByRole('link', { name: /active employees/i })).toHaveAttribute('href', '/employees');
    expect(screen.getByRole('link', { name: /active projects/i })).toHaveAttribute('href', '/admin/projects');
    expect(screen.getByRole('link', { name: /total teams/i })).toHaveAttribute('href', '/teams');
  });

  it('renders a full-width attention row without redundant category badges when only one category has outstanding items', () => {
    renderAdminView({
      overdueTasksCount: 10,
      teamsWithoutManager: 0,
      pendingInvitationsCount: 0,
    });

    // No redundant category count badges
    expect(screen.queryByText('1 Category')).not.toBeInTheDocument();
    expect(screen.queryByText(/action item/i)).not.toBeInTheDocument();

    // Overdue Tasks category content
    expect(screen.getByRole('heading', { level: 3, name: /overdue tasks/i })).toBeInTheDocument();
    expect(screen.getByText(/10 tasks/i)).toBeInTheDocument();
    expect(screen.getByText('Tasks past their due date.')).toBeInTheDocument();

    // Clear call to action button
    const actionLink = screen.getByRole('link', { name: /view overdue tasks/i });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute('href', '/admin/projects');

    // Other categories must not appear
    expect(screen.queryByText(/teams without a lead/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pending invitations/i)).not.toBeInTheDocument();
  });

  it('renders consistent compact rows when multiple categories have outstanding items', () => {
    renderAdminView({
      overdueTasksCount: 3,
      teamsWithoutManager: 1,
      pendingInvitationsCount: 2,
    });

    expect(screen.getByText('Needs Attention')).toBeInTheDocument();

    // 3 attention categories
    expect(screen.getByRole('heading', { level: 3, name: /overdue tasks/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /teams without a lead/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /pending invitations/i })).toBeInTheDocument();

    // Links for next actions
    expect(screen.getByRole('link', { name: /view overdue tasks/i })).toHaveAttribute('href', '/admin/projects');
    expect(screen.getByRole('link', { name: /assign lead/i })).toHaveAttribute('href', '/teams');
    expect(screen.getByRole('link', { name: /view invitations/i })).toHaveAttribute('href', '/employees');
  });

  it('displays "Nothing needs your attention." when all attention items are 0', () => {
    renderAdminView({
      overdueTasksCount: 0,
      teamsWithoutManager: 0,
      pendingInvitationsCount: 0,
    });

    expect(screen.getByText('Nothing needs your attention.')).toBeInTheDocument();
    expect(screen.queryByText('Overdue Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Teams Without a Lead')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
  });

  it('renders Recent Company Activity with view activity history link and real audit records', () => {
    renderAdminView();

    expect(screen.getByText('Recent Company Activity')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view activity history/i })).toHaveAttribute('href', '/activity-history');

    // Renders real activity entries from auditLogs
    expect(screen.getByText('Project Updated')).toBeInTheDocument();
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Team Created')).toBeInTheDocument();
  });

  it('renders empty state for Recent Company Activity when no logs are available', () => {
    renderAdminView({ auditLogs: [] });

    expect(screen.getByText('Recent Company Activity')).toBeInTheDocument();
    expect(screen.getByText('No recent activity recorded.')).toBeInTheDocument();
  });

  it('does NOT render Pending Approvals or any timesheet review links for Admin', () => {
    renderAdminView();

    // Pending Approvals must NOT be in the document
    expect(screen.queryByText('Pending Approvals')).not.toBeInTheDocument();
    expect(screen.queryByText(/awaiting manager approval/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /review timesheet/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /approve/i })).not.toBeInTheDocument();

    // No links to /approvals, /timesheets, or /team-timesheets
    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map(link => link.getAttribute('href'));
    expect(hrefs).not.toContain('/approvals');
    expect(hrefs).not.toContain('/timesheets');
    expect(hrefs).not.toContain('/team-timesheets');
  });
});
