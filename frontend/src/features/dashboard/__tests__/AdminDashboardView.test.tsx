import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardView, type AdminDashboardViewProps } from '../Dashboard';

describe('AdminDashboardView UI Refinements & Selective Layout', () => {
  const defaultProps: AdminDashboardViewProps = {
    employee: { id: 'admin-1', name: 'Yash Bhosale', role: 'ADMIN', roles: ['ADMIN'] },
    orgSummary: { name: 'Sify Technologies', domain: 'sify.com' },
    loading: false,
    fetchDashboardData: vi.fn(),
    activeEmployees: 42,
    inactiveEmployees: 3,
    totalEmployees: 45,
    auditLogs: [],
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

    // Main page heading: Good morning, Yash
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
    expect(screen.getByText('View employees')).toBeInTheDocument();
    expect(screen.getByText('View projects')).toBeInTheDocument();
    expect(screen.getByText('View teams')).toBeInTheDocument();

    // 4th card removed from summary ribbon
    expect(screen.queryByText('Pending Actions')).not.toBeInTheDocument();

    // Verify navigation links of summary cards
    expect(screen.getByRole('link', { name: /active employees/i })).toHaveAttribute('href', '/employees');
    expect(screen.getByRole('link', { name: /active projects/i })).toHaveAttribute('href', '/admin/projects');
    expect(screen.getByRole('link', { name: /total teams/i })).toHaveAttribute('href', '/teams');
  });

  it('renders a full-width horizontal panel when only one category has outstanding items', () => {
    renderAdminView({
      overdueTasksCount: 10,
      teamsWithoutManager: 0,
      pendingInvitationsCount: 0,
    });

    // Badge indicates exact category count: 1 Category
    expect(screen.getByText('1 Category')).toBeInTheDocument();

    // Overdue Tasks category content
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('10 tasks')).toBeInTheDocument();
    expect(screen.getByText('Tasks past their due date.')).toBeInTheDocument();

    // Clear call to action button
    const actionLink = screen.getByRole('link', { name: /view overdue tasks/i });
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute('href', '/admin/projects');

    // Other categories must not appear
    expect(screen.queryByText('Teams Without a Lead')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
  });

  it('renders balanced multi-category layout when multiple categories have outstanding items', () => {
    renderAdminView({
      overdueTasksCount: 3,
      teamsWithoutManager: 1,
      pendingInvitationsCount: 2,
    });

    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('3 Categories')).toBeInTheDocument();

    // 3 attention categories
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('Teams Without a Lead')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();

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
    expect(screen.queryByText(/category/i)).not.toBeInTheDocument();
  });

  it('removes Projects Portfolio, Organization Teams list, and Recent Activity feed from dashboard', () => {
    renderAdminView();

    // Secondary duplicate feeds must NOT be in the admin dashboard
    expect(screen.queryByText('Projects Portfolio')).not.toBeInTheDocument();
    expect(screen.queryByText('Organization Teams')).not.toBeInTheDocument();
    expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Stream')).not.toBeInTheDocument();
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
