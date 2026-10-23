import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationSettings } from '../OrganizationSettings';

// Mock updateSettings mutation
const mockUpdateSettingsMutation = vi.fn();

const mockInitialSettings = {
  id: 'org-settings-1',
  organizationId: 'org-1',
  weekStartsOn: 1,
  timeZone: 'UTC',
  dateFormat: 'DD/MM/YYYY',
  emailNotifications: true,
  defaultEmployeeRole: 'EMPLOYEE',
  projectCreationPermission: 'ADMIN',
  projectAssignmentPermission: 'MANAGER',
};

let mockQueryResult = {
  data: mockInitialSettings,
  isLoading: false,
  error: null,
};

vi.mock('../../../store/apiSlice', () => ({
  useGetOrganizationSettingsQuery: () => mockQueryResult,
  useUpdateOrganizationSettingsMutation: () => [
    mockUpdateSettingsMutation,
    { isLoading: false },
  ],
}));

describe('OrganizationSettings - Company Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = {
      data: { ...mockInitialSettings },
      isLoading: false,
      error: null,
    };
    mockUpdateSettingsMutation.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ success: true }),
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <OrganizationSettings />
      </MemoryRouter>
    );

  it('renders page header and all four clear sections with exact headings and subtitles', () => {
    renderComponent();

    // Page Header
    expect(screen.getByRole('heading', { level: 1, name: /^company settings$/i })).toBeInTheDocument();
    expect(screen.getByText('Manage schedules, preferences, and access.')).toBeInTheDocument();

    // Section A: Work Schedule
    expect(screen.getByRole('heading', { level: 2, name: /^work schedule$/i })).toBeInTheDocument();
    expect(screen.getByText('Set your weekly schedule and timesheet rules.')).toBeInTheDocument();

    // Section B: Company Preferences
    expect(screen.getByRole('heading', { level: 2, name: /^company preferences$/i })).toBeInTheDocument();
    expect(screen.getByText('Set your time zone, date format, and email alerts.')).toBeInTheDocument();

    // Section C: Employee Access
    expect(screen.getByRole('heading', { level: 2, name: /^employee access$/i })).toBeInTheDocument();
    expect(screen.getByText('Set default access for new employees.')).toBeInTheDocument();

    // Section D: Project Permissions
    expect(screen.getByRole('heading', { level: 2, name: /^project permissions$/i })).toBeInTheDocument();
    expect(screen.getByText('Control who can create and assign projects.')).toBeInTheDocument();
  });

  it('displays concise helper texts and mandatory status badges', () => {
    renderComponent();

    // Work Schedule helpers & badge
    expect(screen.getByText('Work Week Starts On')).toBeInTheDocument();
    expect(screen.getByText('First day of the weekly timesheet.')).toBeInTheDocument();
    expect(screen.getByText('Timesheet Approval')).toBeInTheDocument();
    expect(screen.getByText('Weekly timesheet approval.')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();

    // Company Preferences helpers
    expect(screen.getByText('Time Zone')).toBeInTheDocument();
    expect(screen.getByText('Used for company scheduling and dates.')).toBeInTheDocument();
    expect(screen.getByText('Date Format')).toBeInTheDocument();
    expect(screen.getByText('Choose how dates appear.')).toBeInTheDocument();
    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
    expect(screen.getByText('Send supported alerts by email.')).toBeInTheDocument();

    // Employee Access helpers & badge
    expect(screen.getByText('Default Employee Role')).toBeInTheDocument();
    expect(screen.getByText('Role assigned to new employees.')).toBeInTheDocument();
    expect(screen.getByText('Employee Join Policy')).toBeInTheDocument();
    expect(screen.getByText('Who can join the company?')).toBeInTheDocument();
    expect(screen.getByText('Invitation Only')).toBeInTheDocument();

    // Project Permissions helpers
    expect(screen.getByText('Project Creation Permission')).toBeInTheDocument();
    expect(screen.getByText('Who can create projects?')).toBeInTheDocument();
    expect(screen.getByText('Project Assignment Permission')).toBeInTheDocument();
    expect(screen.getByText('Who can assign employees to projects?')).toBeInTheDocument();
  });

  it('toggles email notifications, reveals unsaved changes dock, and saves changes', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Initially no unsaved changes indicator
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();

    const emailToggle = screen.getByRole('switch', { name: /toggle email notifications/i });
    expect(emailToggle).toHaveAttribute('aria-checked', 'true');

    await user.click(emailToggle);
    expect(emailToggle).toHaveAttribute('aria-checked', 'false');

    // Floating dock is revealed
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();

    // Click Save Changes button
    const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
    await user.click(saveButtons[saveButtons.length - 1]);

    expect(mockUpdateSettingsMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        emailNotifications: false,
        timeZone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
      })
    );

    await waitFor(() => {
      expect(screen.getByText(/company settings updated successfully/i)).toBeInTheDocument();
    });
  });

  it('reverts changes when Discard button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const emailToggle = screen.getByRole('switch', { name: /toggle email notifications/i });
    await user.click(emailToggle);
    expect(emailToggle).toHaveAttribute('aria-checked', 'false');

    const discardBtn = screen.getByRole('button', { name: /discard/i });
    await user.click(discardBtn);

    expect(emailToggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });

  it('renders loading state when query is loading', () => {
    mockQueryResult = {
      data: null as any,
      isLoading: true,
      error: null,
    };

    renderComponent();
    expect(screen.getByText(/loading company settings/i)).toBeInTheDocument();
  });

  it('renders error state when query fails', () => {
    mockQueryResult = {
      data: null as any,
      isLoading: false,
      error: { message: 'Network error' } as any,
    };

    renderComponent();
    expect(screen.getByText(/failed to load company settings/i)).toBeInTheDocument();
  });
});
