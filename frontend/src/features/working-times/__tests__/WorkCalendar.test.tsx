import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkCalendar } from '../WorkCalendar';

// Mock API Slice queries & mutations
const mockRefetchOrg = vi.fn();
const mockRefetchOverrides = vi.fn();
const mockRefetchEmp = vi.fn();
const mockRefetchHolidays = vi.fn();

const mockUpdateOrg = vi.fn();
const mockUpsertOverride = vi.fn();
const mockDeleteOverride = vi.fn();
const mockCreateHoliday = vi.fn();
const mockUpdateHoliday = vi.fn();
const mockDeleteHoliday = vi.fn();
const mockImportHolidays = vi.fn();

const mockOrgWorkingTime = {
  id: 'org-wt-1',
  monday: 8,
  tuesday: 8,
  wednesday: 8,
  thursday: 8,
  friday: 8,
  saturday: 0,
  sunday: 0,
};

let currentOverridesMock: any[] = [];

const mockEmployees = [
  { id: 'emp-1', name: 'Arjun Patel', email: 'arjun@sify.com' },
  { id: 'emp-2', name: 'Priya Sharma', email: 'priya@sify.com' },
];

const mockHolidays = [
  {
    id: 'hol-1',
    name: 'Republic Day',
    date: '2026-01-26',
    isActive: true,
  },
  {
    id: 'hol-2',
    name: 'Independence Day',
    date: '2026-08-15',
    isActive: true,
  },
];

vi.mock('../../../store/apiSlice', () => ({
  useGetOrgWorkingTimeQuery: () => ({
    data: mockOrgWorkingTime,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchOrg,
  }),
  useUpdateOrgWorkingTimeMutation: () => [
    mockUpdateOrg,
    { isLoading: false },
  ],
  useGetWorkingTimeOverridesQuery: () => ({
    data: currentOverridesMock,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchOverrides,
  }),
  useUpsertEmployeeWorkingTimeMutation: () => [
    mockUpsertOverride,
    { isLoading: false },
  ],
  useDeleteEmployeeWorkingTimeMutation: () => [
    mockDeleteOverride,
    { isLoading: false },
  ],
  useGetEmployeesQuery: () => ({
    data: mockEmployees,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchEmp,
  }),
  useGetPublicHolidaysQuery: () => ({
    data: mockHolidays,
    isLoading: false,
    isFetching: false,
    refetch: mockRefetchHolidays,
  }),
  useCreatePublicHolidayMutation: () => [
    mockCreateHoliday,
    { isLoading: false },
  ],
  useUpdatePublicHolidayMutation: () => [
    mockUpdateHoliday,
    { isLoading: false },
  ],
  useDeletePublicHolidayMutation: () => [
    mockDeleteHoliday,
    { isLoading: false },
  ],
  useImportPublicHolidaysMutation: () => [
    mockImportHolidays,
    { isLoading: false },
  ],
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

describe('WorkCalendar Unified Workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentOverridesMock = [
      {
        id: 'ov-1',
        employeeId: 'emp-1',
        monday: 9,
        tuesday: 9,
        wednesday: 9,
        thursday: 9,
        friday: 9,
        saturday: 0,
        sunday: 0,
      },
    ];
    mockUpdateOrg.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
    mockUpsertOverride.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
    mockDeleteOverride.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
    mockCreateHoliday.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
    mockUpdateHoliday.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
    mockDeleteHoliday.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ success: true }) });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <WorkCalendar />
      </MemoryRouter>
    );

  it('renders page header with Work Calendar title and subtitle', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 1, name: /work calendar/i })).toBeInTheDocument();
    expect(
      screen.getByText(/manage standard working hours, individual employee schedules, and company holidays/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^refresh$/i })).toBeInTheDocument();
  });

  it('renders Section 1: Standard Working Hours with summary, 7 day cards, and Edit Schedule button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 2, name: /^standard working hours$/i })).toBeInTheDocument();
    expect(screen.getByText('Applies to employees without an individual schedule.')).toBeInTheDocument();
    expect(screen.getByText('40 hours/week')).toBeInTheDocument();
    expect(screen.getByText(/5 workdays/i)).toBeInTheDocument();
    expect(screen.getByText(/2 rest days/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit schedule/i })).toBeInTheDocument();

    // Verify weekday labels and statuses
    expect(screen.getAllByText('Mon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fri').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sun').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Workday').length).toBe(5);
    expect(screen.getAllByText('Rest day').length).toBe(2);
  });

  it('allows entering edit mode in Standard Working Hours and displays form actions', async () => {
    const user = userEvent.setup();
    renderComponent();

    const editBtn = screen.getByRole('button', { name: /edit schedule/i });
    await user.click(editBtn);

    expect(screen.getByRole('button', { name: /save schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByText(/standard \(40h mon-fri\)/i)).toBeInTheDocument();
  });

  it('renders Section 2: Employee Work Schedules with search, count, and Add Employee Schedule button', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 2, name: /^employee work schedules$/i })).toBeInTheDocument();
    expect(screen.getByText('Set different working hours for individual employees.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
    expect(screen.getByText('1 custom schedule')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add employee schedule/i })).toBeInTheDocument();

    // Verify table headings
    expect(screen.getByRole('columnheader', { name: /employee/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /weekly total/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /difference/i })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: /actions/i }).length).toBe(2);

    // Verify existing override for Arjun Patel
    expect(screen.getByText('Arjun Patel')).toBeInTheDocument();
    expect(screen.getByText('45 hrs')).toBeInTheDocument();
    expect(screen.getByText('+5h')).toBeInTheDocument();
  });

  it('renders empty state for Employee Work Schedules when there are genuinely no individual schedules', () => {
    currentOverridesMock = [];
    renderComponent();

    expect(screen.getByText('0 custom schedules')).toBeInTheDocument();
    expect(screen.getByText('No individual schedules yet')).toBeInTheDocument();
    expect(screen.getByText('Everyone follows the standard working hours.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add employee schedule/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('opens Add Employee Schedule modal on click', async () => {
    const user = userEvent.setup();
    renderComponent();

    const addBtn = screen.getByRole('button', { name: /add employee schedule/i });
    await user.click(addBtn);

    expect(screen.getByRole('heading', { level: 3, name: /add employee schedule/i })).toBeInTheDocument();
    expect(screen.getByText('Set different working hours for an individual employee.')).toBeInTheDocument();
    expect(screen.getByText(/select employee/i)).toBeInTheDocument();
  });

  it('renders Section 3: Company Holidays with year navigator, Import Holidays, and Add Holiday buttons', () => {
    renderComponent();

    expect(screen.getByRole('heading', { level: 2, name: /^company holidays$/i })).toBeInTheDocument();
    expect(screen.getByText('Company holidays excluded from scheduled working hours.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next year/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import holidays/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add holiday/i })).toBeInTheDocument();

    // Verify table headers
    expect(screen.getByRole('columnheader', { name: /^holiday$/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^status$/i })).toBeInTheDocument();

    // Verify holidays listed
    expect(screen.getByText('Republic Day')).toBeInTheDocument();
    expect(screen.getByText('Independence Day')).toBeInTheDocument();
  });

  it('submits updated standard working hours when Save Schedule is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const editBtn = screen.getByRole('button', { name: /^edit schedule$/i });
    await user.click(editBtn);

    const saveBtn = screen.getByRole('button', { name: /save schedule/i });
    await user.click(saveBtn);

    expect(mockUpdateOrg).toHaveBeenCalledTimes(1);
  });

  it('navigates previous and next years for company holidays', async () => {
    const user = userEvent.setup();
    renderComponent();

    const currentYear = new Date().getFullYear();
    expect(screen.getByText(String(currentYear))).toBeInTheDocument();

    const prevYearBtn = screen.getByRole('button', { name: /previous year/i });
    await user.click(prevYearBtn);
    expect(screen.getByText(String(currentYear - 1))).toBeInTheDocument();

    const nextYearBtn = screen.getByRole('button', { name: /next year/i });
    await user.click(nextYearBtn);
    expect(screen.getByText(String(currentYear))).toBeInTheDocument();
  });

  it('opens Add Holiday modal and submits new holiday', async () => {
    const user = userEvent.setup();
    renderComponent();

    const addHolidayBtn = screen.getByRole('button', { name: /add holiday/i });
    await user.click(addHolidayBtn);

    expect(screen.getByRole('heading', { level: 3, name: /^add holiday$/i })).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(/e\.g\. independence day/i);
    await user.type(nameInput, 'Gandhi Jayanti');

    const saveBtn = screen.getByRole('button', { name: /save holiday/i });
    await user.click(saveBtn);

    expect(mockCreateHoliday).toHaveBeenCalledTimes(1);
  });

  it('opens confirmation modal and removes employee schedule', async () => {
    const user = userEvent.setup();
    renderComponent();

    const removeBtn = screen.getByTitle('Remove employee schedule');
    await user.click(removeBtn);

    expect(screen.getByRole('heading', { level: 3, name: /remove employee schedule\?/i })).toBeInTheDocument();
    expect(screen.getByText(/their schedule will immediately revert to the standard working hours/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^remove schedule$/i });
    await user.click(confirmBtn);

    expect(mockDeleteOverride).toHaveBeenCalledWith('emp-1');
  });

  it('triggers global refresh when top Refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    const refreshButton = screen.getByRole('button', { name: /^refresh$/i });
    await user.click(refreshButton);

    expect(mockRefetchOrg).toHaveBeenCalledTimes(1);
    expect(mockRefetchOverrides).toHaveBeenCalledTimes(1);
    expect(mockRefetchEmp).toHaveBeenCalledTimes(1);
    expect(mockRefetchHolidays).toHaveBeenCalledTimes(1);
  });
});
