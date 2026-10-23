import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationDetail } from '../OrganizationDetail';

const mockUpdateCurrentOrg = vi.fn();
const mockRefetch = vi.fn();

let mockOrgData = {
  id: 'org-1',
  name: 'Sify Technologies Limited',
  organizationType: 'TECHNOLOGY',
  description: 'Enterprise IT solutions and services.',
};

let mockEmployee = {
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

vi.mock('../../../store/apiSlice', () => ({
  useGetCurrentOrganizationQuery: () => ({
    data: mockOrgData,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  }),
  useUpdateCurrentOrganizationMutation: () => [
    mockUpdateCurrentOrg,
    { isLoading: false },
  ],
}));

describe('OrganizationDetail - Edit Company Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrgData = {
      id: 'org-1',
      name: 'Sify Technologies Limited',
      organizationType: 'TECHNOLOGY',
      description: 'Enterprise IT solutions and services.',
    };
    mockEmployee = {
      id: 'emp-1',
      name: 'Admin User',
      role: 'ADMIN',
      roles: ['ADMIN'],
    };
    mockUpdateCurrentOrg.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <OrganizationDetail />
      </MemoryRouter>
    );

  it('renders Edit Company title, subtitle, and Company Details section', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /^edit company$/i })).toBeInTheDocument();
    expect(screen.getByText('Update your company details.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^company details$/i })).toBeInTheDocument();
  });

  it('populates fields with saved values and displays character counter', () => {
    renderComponent();

    const nameInput = screen.getByLabelText(/company name/i);
    expect(nameInput).toHaveValue('Sify Technologies Limited');

    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toHaveValue('Enterprise IT solutions and services.');

    expect(screen.getByText(/37 \/ 500/)).toBeInTheDocument();
  });

  it('disables Save Changes button when there are no changes', () => {
    renderComponent();

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables Save Changes button when user edits a field and updates successfully', async () => {
    const user = userEvent.setup();
    renderComponent();

    const nameInput = screen.getByLabelText(/company name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Sify Global Enterprise');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    expect(mockUpdateCurrentOrg).toHaveBeenCalledWith({
      name: 'Sify Global Enterprise',
      organizationType: 'TECHNOLOGY',
      description: 'Enterprise IT solutions and services.',
    });

    await waitFor(() => {
      expect(screen.getByText(/company details updated successfully/i)).toBeInTheDocument();
    });
  });

  it('shows field-specific error when company name is emptied and prevents submission', async () => {
    const user = userEvent.setup();
    renderComponent();

    const nameInput = screen.getByLabelText(/company name/i);
    await user.clear(nameInput);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it('renders Cancel link pointing back to company information', () => {
    renderComponent();

    const cancelLinks = screen.getAllByRole('link', { name: /cancel/i });
    expect(cancelLinks.length).toBeGreaterThanOrEqual(1);
    expect(cancelLinks[0]).toHaveAttribute('href', '/organization');
  });
});
