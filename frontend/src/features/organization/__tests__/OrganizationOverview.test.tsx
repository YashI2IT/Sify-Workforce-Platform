import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationOverview } from '../OrganizationOverview';

// Mock useCurrentEmployee
let mockEmployee: any = {
  id: 'emp-1',
  name: 'Admin User',
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

const mockRefetchOrg = vi.fn();
const mockRefetchTeams = vi.fn();
const mockRefetchEmp = vi.fn();

vi.mock('../../../store/apiSlice', () => ({
  useGetCurrentOrganizationQuery: () => ({
    data: {
      id: 'org-1',
      name: 'Sify Technologies',
      organizationType: 'TECHNOLOGY',
      description: 'Enterprise IT and Cloud Services',
    },
    isLoading: false,
    refetch: mockRefetchOrg,
  }),
  useGetTeamsQuery: () => ({
    data: [
      { id: 'team-1', name: 'Cloud Ops', managerId: 'emp-1' },
    ],
    isLoading: false,
    refetch: mockRefetchTeams,
  }),
  useGetEmployeesQuery: () => ({
    data: [
      { id: 'emp-1', name: 'Admin User', email: 'admin@sify.com', teamId: 'team-1' },
    ],
    isLoading: false,
    refetch: mockRefetchEmp,
  }),
}));

describe('OrganizationOverview - Company Information Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmployee = {
      id: 'emp-1',
      name: 'Admin User',
      role: 'ADMIN',
      roles: ['ADMIN'],
    };
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <OrganizationOverview />
      </MemoryRouter>
    );

  it('renders Company Information heading, subtitle, and Refresh button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /^company information$/i })).toBeInTheDocument();
    expect(screen.getByText('Company details and team directory.')).toBeInTheDocument();
    const refreshBtn = screen.getByRole('button', { name: /^refresh$/i });
    expect(refreshBtn).toBeInTheDocument();
    expect(refreshBtn).toHaveAttribute('title', 'Refresh company information');
  });

  it('renders company summary card with compact badges and real description', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 2, name: 'Sify Technologies' })).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBe(2);
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Enterprise IT and Cloud Services')).toBeInTheDocument();
  });

  it('renders Teams section with exact heading, subtitle, and table columns', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 2, name: /^teams$/i })).toBeInTheDocument();
    expect(screen.getByText('Team leads and members.')).toBeInTheDocument();
    expect(screen.getByText('1 Team')).toBeInTheDocument();

    expect(screen.getByRole('columnheader', { name: /^team$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^team lead$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^members$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^status$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^actions$/i })).toBeInTheDocument();

    // Verify row data
    expect(screen.getByText('Cloud Ops')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('(admin@sify.com)')).toBeInTheDocument();
    expect(screen.getByText('1 Member')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage/i })).toHaveAttribute('href', '/teams');
  });

  it('renders professional Settings and Edit Company buttons for Admin user', () => {
    renderComponent();

    const settingsLink = screen.getByRole('link', { name: /^settings$/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/organization/settings');
    expect(settingsLink).toHaveAttribute('title', 'Company Settings');

    const editCompanyLink = screen.getByRole('link', { name: /^edit company$/i });
    expect(editCompanyLink).toBeInTheDocument();
    expect(editCompanyLink).toHaveAttribute('href', '/organization/profile');
    expect(editCompanyLink).toHaveAttribute('title', 'Edit Company');
  });

  it('does NOT render Settings or Edit Company buttons for MANAGER or EMPLOYEE roles', () => {
    // Switch to Manager
    mockEmployee = {
      id: 'emp-mgr',
      name: 'Manager User',
      role: 'MANAGER',
      roles: ['MANAGER'],
    };

    const { unmount } = renderComponent();
    expect(screen.queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^edit company$/i })).not.toBeInTheDocument();
    unmount();

    // Switch to Employee
    mockEmployee = {
      id: 'emp-staff',
      name: 'Staff User',
      role: 'EMPLOYEE',
      roles: ['EMPLOYEE'],
    };

    renderComponent();
    expect(screen.queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^edit company$/i })).not.toBeInTheDocument();
  });

  it('triggers refetch when Refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const refreshButton = screen.getByRole('button', { name: /^refresh$/i });
    await user.click(refreshButton);

    expect(mockRefetchOrg).toHaveBeenCalledTimes(1);
    expect(mockRefetchTeams).toHaveBeenCalledTimes(1);
    expect(mockRefetchEmp).toHaveBeenCalledTimes(1);
  });
});
