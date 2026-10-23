import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogsList } from '../AuditLogsList';

// Mock RTK Query hooks
const mockRefetch = vi.fn();
const mockShowToast = vi.fn();

const mockLogsData = [
  {
    id: 'log-1',
    organizationId: 'org-1',
    actorId: 'emp-1',
    actorName: 'Priya Sharma',
    actorEmail: 'priya@sify.com',
    action: 'PROJECT_UPDATED',
    readableAction: 'Project updated',
    resourceType: 'Project',
    resourceId: 'proj-12345678-abcd-1111',
    details: {
      changes: {
        status: { from: 'ACTIVE', to: 'INACTIVE' },
      },
    },
    detailsSummary: 'status: ACTIVE → INACTIVE',
    createdAt: '2026-10-22T08:30:00.000Z',
  },
  {
    id: 'log-2',
    organizationId: 'org-1',
    actorId: null,
    actorName: 'System',
    actorEmail: null,
    action: 'TIME_ENTRY_CREATED',
    readableAction: 'Time entry created',
    resourceType: 'TimeEntry',
    resourceId: 'entry-98765432-wxyz-2222',
    details: {
      hours: 8,
      date: '2026-10-22',
    },
    detailsSummary: '8 hrs on 2026-10-22',
    createdAt: '2026-10-22T09:15:00.000Z',
  },
  {
    id: 'log-3',
    organizationId: 'org-1',
    actorId: 'emp-deleted',
    actorName: 'Former Employee',
    actorEmail: null,
    action: 'ORGANIZATION_UPDATED',
    readableAction: 'Organization details updated',
    resourceType: 'Organization',
    resourceId: 'org-1',
    details: {
      updatedFields: ['name', 'description'],
    },
    detailsSummary: 'Changed fields: Name, Description',
    createdAt: '2026-10-22T07:00:00.000Z',
  },
  {
    id: 'log-4',
    organizationId: 'org-1',
    actorId: 'emp-1',
    actorName: 'Yash Borade',
    actorEmail: 'yash@sify.com',
    action: 'EMPLOYEE_ASSIGNED_TO_PROJECT',
    readableAction: 'Assigned to project',
    resourceType: 'Project',
    resourceId: 'proj-c62e6ede',
    resourceName: 'Portal Alpha',
    details: {
      assignedEmployeeId: '5eebe186-4bf9-4143-add0-965e658381c0',
      assignedEmployeeName: 'Yash Borade',
    },
    detailsSummary: 'Assigned: Yash Borade',
    createdAt: '2026-10-22T06:00:00.000Z',
  },
];

vi.mock('../../../store/apiSlice', () => ({
  useGetAuditLogsQuery: vi.fn(),
  useGetAuditLogFilterOptionsQuery: vi.fn(),
  useGetOrganizationSettingsQuery: vi.fn(),
  useGetEmployeesDirectoryQuery: vi.fn(),
  useGetProjectsQuery: vi.fn(),
  useGetTeamsQuery: vi.fn(),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

import {
  useGetAuditLogsQuery,
  useGetAuditLogFilterOptionsQuery,
  useGetOrganizationSettingsQuery,
  useGetEmployeesDirectoryQuery,
  useGetProjectsQuery,
  useGetTeamsQuery,
} from '../../../store/apiSlice';

describe('AuditLogsList — Production-Grade Activity History Workspace', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    (useGetOrganizationSettingsQuery as any).mockReturnValue({
      data: {
        timeZone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
      },
    });

    (useGetEmployeesDirectoryQuery as any).mockReturnValue({
      data: [
        { id: '5eebe186-4bf9-4143-add0-965e658381c0', name: 'Yash Borade', email: 'yash@sify.com' },
      ],
    });

    (useGetProjectsQuery as any).mockReturnValue({
      data: [
        { id: 'proj-c62e6ede', name: 'Portal Alpha' },
      ],
    });

    (useGetTeamsQuery as any).mockReturnValue({
      data: [],
    });

    (useGetAuditLogFilterOptionsQuery as any).mockReturnValue({
      data: {
        actions: [
          { value: 'PROJECT_UPDATED', label: 'Project updated' },
          { value: 'TIME_ENTRY_CREATED', label: 'Time entry created' },
          { value: 'ORGANIZATION_UPDATED', label: 'Organization details updated' },
        ],
        resourceTypes: [
          { value: 'Project', label: 'Project' },
          { value: 'TimeEntry', label: 'TimeEntry' },
          { value: 'Organization', label: 'Organization' },
        ],
        actors: [{ id: 'emp-1', name: 'Priya Sharma', email: 'priya@sify.com' }],
      },
    });

    (useGetAuditLogsQuery as any).mockReturnValue({
      data: {
        data: mockLogsData,
        meta: {
          total: 125,
          page: 1,
          limit: 50,
          totalPages: 3,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  describe('Page Layout & Information Hierarchy', () => {
    it('renders exact Activity History title, subtitle, refresh and export actions', () => {
      render(<AuditLogsList />);

      expect(screen.getByRole('heading', { level: 1, name: /Activity History/i })).toBeInTheDocument();
      expect(
        screen.getByText('Review important actions and changes across your organization.'),
      ).toBeInTheDocument();

      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    });

    it('refreshes the log query when clicking the Refresh button', async () => {
      render(<AuditLogsList />);

      const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
      await user.click(refreshBtn);

      expect(mockRefetch).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith('Activity history refreshed', 'info');
    });
  });

  describe('Audit Table Structure & Scannability', () => {
    it('renders all required columns with plain-language labels', () => {
      render(<AuditLogsList />);

      // Headers
      expect(screen.getByText('Date & Time')).toBeInTheDocument();
      expect(screen.getByText('Person')).toBeInTheDocument();
      expect(screen.getByText('What Happened')).toBeInTheDocument();
      expect(screen.getByText('Related Item')).toBeInTheDocument();
      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();

      // Content
      expect(screen.getByText('Project updated')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('priya@sify.com')).toBeInTheDocument();
      expect(screen.getByText('status: ACTIVE → INACTIVE')).toBeInTheDocument();

      // System fallback
      expect(screen.getByText('Time entry created')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();

      // Deleted actor fallback
      expect(screen.getByText('Former Employee')).toBeInTheDocument();
    });
  });

  describe('Dual Pagination (Top and Bottom)', () => {
    it('displays compact pagination controls at BOTH the top and bottom with real API metadata', () => {
      render(<AuditLogsList />);

      // Page metadata text rendered twice (top and bottom)
      const pageInfoElements = screen.getAllByText(/Showing/i);
      expect(pageInfoElements).toHaveLength(2);
      expect(pageInfoElements[0]).toHaveTextContent(
        'Showing Page 1 of 3 · 50 records per page · 125 matching events',
      );
      expect(pageInfoElements[1]).toHaveTextContent(
        'Showing Page 1 of 3 · 50 records per page · 125 matching events',
      );

      // Previous and Next buttons rendered at both locations
      const prevButtons = screen.getAllByRole('button', { name: /Previous/i });
      const nextButtons = screen.getAllByRole('button', { name: /Next/i });
      expect(prevButtons).toHaveLength(2);
      expect(nextButtons).toHaveLength(2);

      // On page 1, Previous is disabled
      expect(prevButtons[0]).toBeDisabled();
      expect(prevButtons[1]).toBeDisabled();
      expect(nextButtons[0]).not.toBeDisabled();
      expect(nextButtons[1]).not.toBeDisabled();
    });

    it('navigates to next page when Next is clicked', async () => {
      render(<AuditLogsList />);

      const nextButtons = screen.getAllByRole('button', { name: /Next/i });
      await user.click(nextButtons[0]);

      // Hook was queried with page 2
      expect(useGetAuditLogsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        }),
      );
    });
  });

  describe('Search, Filters, and Sorting', () => {
    it('triggers debounced server-side search query when user types', async () => {
      render(<AuditLogsList />);

      const searchInput = screen.getByPlaceholderText(/Search person, action, resource, or ID…/i);
      await user.type(searchInput, 'Priya');

      await waitFor(() => {
        expect(useGetAuditLogsQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Priya',
          }),
        );
      });
    });

    it('toggles sort order between Newest first and Oldest first', async () => {
      render(<AuditLogsList />);

      const sortBtn = screen.getByRole('button', { name: /Newest first/i });
      await user.click(sortBtn);

      expect(useGetAuditLogsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          sortOrder: 'asc',
        }),
      );
    });
  });

  describe('Rebuilt Inspect Modal (Activity Details)', () => {
    it('opens Activity Details modal with before-and-after comparison table', async () => {
      render(<AuditLogsList />);

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      await user.click(inspectButtons[0]);

      // Modal Title
      expect(screen.getByRole('heading', { level: 2, name: 'Activity Details' })).toBeInTheDocument();

      // Event Summary Card
      expect(screen.getByText('Event Summary')).toBeInTheDocument();
      expect(screen.getByText('Performed By')).toBeInTheDocument();

      // Changes Made Card with Before and After
      expect(screen.getByText('Changes Made')).toBeInTheDocument();
      expect(screen.getByText('Previous Value')).toBeInTheDocument();
      expect(screen.getByText('New Value')).toBeInTheDocument();
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();

      // Technical Details Card
      expect(screen.getByText('Technical Details & JSON Payload')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy JSON/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Download JSON/i })).toBeInTheDocument();

      // No pagination controls inside Inspect Modal!
      const modal = screen.getByRole('heading', { level: 2, name: 'Activity Details' }).closest('div');
      expect(modal).not.toHaveTextContent('records per page');

      // Close modal
      const closeBtn = screen.getByRole('button', { name: 'Close' });
      await user.click(closeBtn);
      expect(screen.queryByRole('heading', { level: 2, name: 'Activity Details' })).not.toBeInTheDocument();
    });

    it('displays list of updated fields when only field names were recorded without fabricating values', async () => {
      render(<AuditLogsList />);

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      // Click inspect on third log (log-3: ORGANIZATION_UPDATED with updatedFields)
      await user.click(inspectButtons[2]);

      expect(screen.getByText(/The following fields were modified during this update:/i)).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(
        screen.getByText(/Previous and new values were not recorded for this event./i),
      ).toBeInTheDocument();
    });

    it('displays employee and project names instead of raw UUIDs in Changes Made card', async () => {
      render(<AuditLogsList />);

      const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
      // Click inspect on fourth log (log-4: EMPLOYEE_ASSIGNED_TO_PROJECT)
      await user.click(inspectButtons[3]);

      const changesMadeHeading = screen.getByText('Changes Made');
      const changesMadeContainer = changesMadeHeading.closest('div');
      expect(changesMadeContainer).toBeInTheDocument();

      // Must display Assigned Employee label, NOT Assigned Employee ID
      expect(changesMadeContainer).toHaveTextContent('Assigned Employee');
      expect(changesMadeContainer).not.toHaveTextContent('Assigned Employee ID');

      // Must display the human name Yash Borade, and NOT the raw UUID
      expect(changesMadeContainer).toHaveTextContent('Yash Borade');
      expect(changesMadeContainer).not.toHaveTextContent('5eebe186-4bf9-4143-add0-965e658381c0');

      // In Affected Item, shows Project: Portal Alpha
      expect(screen.getByText(/Project: Portal Alpha/i)).toBeInTheDocument();
    });
  });

  describe('Export Modal', () => {
    it('opens Export modal offering CSV and JSON download options', async () => {
      render(<AuditLogsList />);

      const exportBtn = screen.getByRole('button', { name: /Export/i });
      await user.click(exportBtn);

      expect(screen.getByRole('heading', { level: 3, name: 'Export Activity History' })).toBeInTheDocument();
      expect(screen.getByText('Spreadsheet (CSV)')).toBeInTheDocument();
      expect(screen.getByText('Raw Data (JSON)')).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelBtn);
      expect(screen.queryByRole('heading', { level: 3, name: 'Export Activity History' })).not.toBeInTheDocument();
    });
  });
});
