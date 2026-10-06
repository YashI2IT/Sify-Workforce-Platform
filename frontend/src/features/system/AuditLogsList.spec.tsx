import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { AuditLogsList } from './AuditLogsList';
import { MemoryRouter } from 'react-router-dom';

const mockUseGetAuditLogsQuery = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

vi.mock('../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    useGetAuditLogsQuery: (params: any) => mockUseGetAuditLogsQuery(params),
  };
});

describe('AuditLogsList', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAuditLogsQuery.mockReturnValue({
      data: {
        data: [
          {
            id: 'log-1',
            organizationId: 'org-1',
            actorId: 'user-1',
            actorName: 'Aarav Sharma',
            actorEmail: 'aarav@sify.com',
            action: 'EMPLOYEE_INVITED',
            resourceType: 'EmployeeInvitation',
            resourceId: 'inv-12345',
            details: { invitedEmail: 'newbie@sify.com', role: 'EMPLOYEE' },
            createdAt: '2026-10-05T09:00:00.000Z',
          },
          {
            id: 'log-2',
            organizationId: 'org-1',
            actorId: 'user-2',
            actorName: 'Neha Patel',
            actorEmail: 'neha@sify.com',
            action: 'TIMESHEET_APPROVED',
            resourceType: 'Timesheet',
            resourceId: 'ts-67890',
            details: { comment: 'All 40 hours approved' },
            createdAt: '2026-10-05T08:30:00.000Z',
          },
        ],
        meta: {
          total: 2,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <AuditLogsList />
      </MemoryRouter>
    );
  };

  it('renders clean header, live activity pill, and refresh button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /System Audit Logs/i })).toBeInTheDocument();
    expect(screen.getByText(/Immutable operational and administrative event history/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Activity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
  });

  it('renders table headers and audit log rows with formatted actors and actions', () => {
    renderComponent();

    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('EMPLOYEE_INVITED')).toBeInTheDocument();
    expect(screen.getByText('EmployeeInvitation')).toBeInTheDocument();
    expect(screen.getByText(/Invited:/i)).toBeInTheDocument();
    expect(screen.getByText('newbie@sify.com')).toBeInTheDocument();

    expect(screen.getByText('Neha Patel')).toBeInTheDocument();
    expect(screen.getByText('TIMESHEET_APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Timesheet')).toBeInTheDocument();
    expect(screen.getByText(/All 40 hours approved/i)).toBeInTheDocument();
  });

  it('filters audit logs via search input', () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/Search by actor, action, resource, or ID…/i);
    fireEvent.change(searchInput, { target: { value: 'Aarav' } });

    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.queryByText('Neha Patel')).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'NoMatchFound' } });
    expect(screen.getByText(/No events matching current filters/i)).toBeInTheDocument();
  });

  it('opens portaled inspection modal when clicking Inspect and displays payload', () => {
    renderComponent();

    const inspectButtons = screen.getAllByRole('button', { name: /Inspect/i });
    fireEvent.click(inspectButtons[0]);

    expect(screen.getByRole('heading', { name: /Audit Event Inspection/i })).toBeInTheDocument();
    expect(screen.getByText(/EMPLOYEE_INVITED on EmployeeInvitation/i)).toBeInTheDocument();
    expect(screen.getByText(/Event Payload & Changes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy JSON/i })).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('heading', { name: /Audit Event Inspection/i })).not.toBeInTheDocument();
  });

  it('calls refetch on refresh button click', () => {
    renderComponent();

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    expect(mockRefetch).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('Audit trail logs refreshed', 'info');
  });
});
