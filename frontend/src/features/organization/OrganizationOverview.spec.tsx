import { render, screen } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { OrganizationOverview } from './OrganizationOverview';
import { MemoryRouter } from 'react-router-dom';

const mockUseGetCurrentOrganizationQuery = vi.fn();
const mockUseGetTeamsQuery = vi.fn();
const mockUseGetEmployeesQuery = vi.fn();

vi.mock('../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useGetCurrentOrganizationQuery: () => mockUseGetCurrentOrganizationQuery(),
    useGetTeamsQuery: () => mockUseGetTeamsQuery(),
    useGetEmployeesQuery: () => mockUseGetEmployeesQuery(),
  };
});

describe('OrganizationOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetCurrentOrganizationQuery.mockReturnValue({
      data: {
        id: 'org-12345',
        name: 'Sify Technologies',
        organizationType: 'TECHNOLOGY',
        description: 'Cloud and digital enterprise solutions provider.',
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseGetTeamsQuery.mockReturnValue({
      data: [
        { id: 'team-1', name: 'Engineering Core', managerId: 'emp-1' },
        { id: 'team-2', name: 'Product Design', managerId: null },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseGetEmployeesQuery.mockReturnValue({
      data: [
        { id: 'emp-1', name: 'Aarav Sharma', email: 'aarav@sify.com', teamId: 'team-1', isActive: true },
        { id: 'emp-2', name: 'Neha Patel', email: 'neha@sify.com', teamId: 'team-1', isActive: true },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <OrganizationOverview />
      </MemoryRouter>
    );
  };

  it('renders organization identity, emblem, and status badges', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Organization Profile/i })).toBeInTheDocument();
    expect(screen.getByText('Sify Technologies')).toBeInTheDocument();
    expect(screen.getByText(/Active Tenant/i)).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText(/Cloud and digital enterprise solutions provider/i)).toBeInTheDocument();
  });

  it('renders departments and teams directory table with workforce counts', () => {
    renderComponent();

    expect(screen.getByText('Engineering Core')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('2 Members')).toBeInTheDocument();

    expect(screen.getByText('Product Design')).toBeInTheDocument();
    expect(screen.getByText(/Pending Assignment/i)).toBeInTheDocument();
    expect(screen.getByText('0 Members')).toBeInTheDocument();
  });

  it('does not render redundant metadata tiles or quick-link cards', () => {
    renderComponent();

    // Redundant header buttons
    expect(screen.queryByRole('link', { name: /Edit Profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Settings/i })).not.toBeInTheDocument();

    // Redundant metadata tiles
    expect(screen.queryByText(/Tenant ID/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Work Week Cycle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Access Governance/i)).not.toBeInTheDocument();

    // Redundant quick-link cards
    expect(screen.queryByText('Workforce Roster')).not.toBeInTheDocument();
    expect(screen.queryByText('Operating Rules')).not.toBeInTheDocument();

    // Clean refresh button is present
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });
});
