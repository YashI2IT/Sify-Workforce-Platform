import { render, screen, fireEvent, waitFor, within } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { OrganizationSettings } from './OrganizationSettings';
import { MemoryRouter } from 'react-router-dom';

const mockUseGetOrganizationSettingsQuery = vi.fn();
const mockUseUpdateOrganizationSettingsMutation = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useGetOrganizationSettingsQuery: () => mockUseGetOrganizationSettingsQuery(),
    useUpdateOrganizationSettingsMutation: () => [mockUpdate, { isLoading: false }],
  };
});

describe('OrganizationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetOrganizationSettingsQuery.mockReturnValue({
      data: {
        weekStartsOn: 1,
        timeZone: 'UTC',
        defaultEmployeeRole: 'EMPLOYEE',
        projectCreationPermission: 'ADMIN',
        projectAssignmentPermission: 'MANAGER',
      },
      isLoading: false,
      error: null,
    });

    mockUpdate.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <OrganizationSettings />
      </MemoryRouter>
    );
  };

  it('renders organization settings cards and fields properly', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Organization Settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Time & Timesheet Standards/i)).toBeInTheDocument();
    expect(screen.getByText(/Workforce Access & Provisioning/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Management & Authorization/i)).toBeInTheDocument();
    expect(screen.getByText(/Edit Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Required \(Enforced\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Invitation Only/i)).toBeInTheDocument();
  });

  it('shows unsaved changes dock when form is modified and allows saving', async () => {
    renderComponent();

    // Trigger dropdown for Work Week Starts On
    const weekButtons = screen.getAllByRole('button', { name: /Monday/i });
    expect(weekButtons.length).toBeGreaterThan(0);
    fireEvent.click(weekButtons[0]);

    // Choose Tuesday from the custom listbox popover
    const listbox = screen.getByRole('listbox');
    const tuesdayOption = within(listbox).getByText('Tuesday');
    fireEvent.click(tuesdayOption);

    // Dock should appear with "Unsaved changes"
    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });

    // Click Save button in the floating dock or header
    const saveButtons = screen.getAllByRole('button', { name: /Save/i });
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        weekStartsOn: 2,
      }));
    });
  });

  it('discards unsaved changes when Discard button is clicked', async () => {
    renderComponent();

    // Trigger dropdown for Work Week Starts On
    const weekButtons = screen.getAllByRole('button', { name: /Monday/i });
    fireEvent.click(weekButtons[0]);

    // Choose Friday from custom listbox popover
    const listbox = screen.getByRole('listbox');
    const fridayOption = within(listbox).getByText('Friday');
    fireEvent.click(fridayOption);

    await waitFor(() => {
      expect(screen.getByText(/Unsaved changes/i)).toBeInTheDocument();
    });

    const discardButton = screen.getByRole('button', { name: /Discard/i });
    fireEvent.click(discardButton);

    await waitFor(() => {
      expect(screen.queryByText(/Unsaved changes/i)).not.toBeInTheDocument();
    });
  });
});
