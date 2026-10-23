import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardView, type AdminDashboardViewProps } from '../Dashboard';

describe('AdminDashboardView Role-Based Restrictions', () => {
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

  it('renders Admin overview metrics and 3 Needs Attention items', () => {
    renderAdminView();

    // Overview cards
    expect(screen.getByText('Active Employees')).toBeInTheDocument();
    expect(screen.getByText('Active Teams')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('Pending Actions')).toBeInTheDocument();

    // Needs Attention section items
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('Teams Without Manager')).toBeInTheDocument();
    expect(screen.getByText('Overdue Project Work')).toBeInTheDocument();
    expect(screen.getByText('6 Action Items')).toBeInTheDocument();
  });

  it('does NOT render Pending Approvals or any timesheet review links for Admin', () => {
    renderAdminView();

    // Pending Approvals must NOT be in the document
    expect(screen.queryByText('Pending Approvals')).not.toBeInTheDocument();
    expect(screen.queryByText(/awaiting manager approval/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /review/i })).not.toBeInTheDocument();

    // No links to /approvals or /timesheets
    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map(link => link.getAttribute('href'));
    expect(hrefs).not.toContain('/approvals');
    expect(hrefs).not.toContain('/timesheets');
    expect(hrefs).not.toContain('/team-timesheets');
  });

  it('renders correct navigation links for administrative responsibilities', () => {
    renderAdminView();

    // Directory, Teams, Projects links
    expect(screen.getByRole('link', { name: /directory/i })).toHaveAttribute('href', '/employees');
    expect(screen.getAllByRole('link', { name: /teams/i })[0]).toHaveAttribute('href', '/teams');
    expect(screen.getAllByRole('link', { name: /projects/i })[0]).toHaveAttribute('href', '/admin/projects');
  });
});
