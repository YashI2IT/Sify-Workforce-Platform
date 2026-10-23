import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardView, type AdminDashboardViewProps } from '../Dashboard';

describe('AdminDashboardView Selective Content & Role Governance', () => {
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
    pendingActionsCount: 6, // 2 invites + 1 team without mgr + 3 overdue tasks
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

  it('renders the compact header with the "Your company at a glance." subtitle', () => {
    renderAdminView();

    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getByText('Sify Technologies')).toBeInTheDocument();
    expect(screen.getByText('Your company at a glance.')).toBeInTheDocument();
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

    // 4th card removed from summary ribbon
    expect(screen.queryByText('Pending Actions')).not.toBeInTheDocument();

    // Verify navigation links of summary cards
    expect(screen.getByRole('link', { name: /active employees/i })).toHaveAttribute('href', '/employees');
    expect(screen.getByRole('link', { name: /active projects/i })).toHaveAttribute('href', '/admin/projects');
    expect(screen.getByRole('link', { name: /total teams/i })).toHaveAttribute('href', '/teams');
  });

  it('renders outstanding issues in Needs Attention when items require action', () => {
    renderAdminView();

    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('6 Action Items')).toBeInTheDocument();

    // 3 attention categories
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument();
    expect(screen.getByText('Teams Without a Lead')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();

    // Links for next actions
    expect(screen.getByRole('link', { name: /overdue tasks/i })).toHaveAttribute('href', '/admin/projects');
    expect(screen.getByRole('link', { name: /teams without a lead/i })).toHaveAttribute('href', '/teams');
    expect(screen.getByRole('link', { name: /pending invitations/i })).toHaveAttribute('href', '/employees');
  });

  it('hides resolved categories with zero issues in Needs Attention', () => {
    renderAdminView({
      overdueTasksCount: 0,
      teamsWithoutManager: 2,
      pendingInvitationsCount: 0,
    });

    // Only Teams Without a Lead should be visible
    expect(screen.getByText('Teams Without a Lead')).toBeInTheDocument();
    expect(screen.queryByText('Overdue Tasks')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Invitations')).not.toBeInTheDocument();
    expect(screen.getByText('2 Action Items')).toBeInTheDocument();
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
    expect(screen.queryByText(/action item/i)).not.toBeInTheDocument();
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
