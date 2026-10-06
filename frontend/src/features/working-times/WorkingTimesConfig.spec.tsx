import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { WorkingTimesConfig } from './WorkingTimesConfig';
import { MemoryRouter } from 'react-router-dom';

const mockUseGetOrgWorkingTimeQuery = vi.fn();
const mockUseUpdateOrgWorkingTimeMutation = vi.fn();
const mockUseGetWorkingTimeOverridesQuery = vi.fn();
const mockUseUpsertEmployeeWorkingTimeMutation = vi.fn();
const mockUseDeleteEmployeeWorkingTimeMutation = vi.fn();
const mockUseGetEmployeesQuery = vi.fn();

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
    useGetOrgWorkingTimeQuery: () => mockUseGetOrgWorkingTimeQuery(),
    useUpdateOrgWorkingTimeMutation: () => mockUseUpdateOrgWorkingTimeMutation(),
    useGetWorkingTimeOverridesQuery: () => mockUseGetWorkingTimeOverridesQuery(),
    useUpsertEmployeeWorkingTimeMutation: () => mockUseUpsertEmployeeWorkingTimeMutation(),
    useDeleteEmployeeWorkingTimeMutation: () => mockUseDeleteEmployeeWorkingTimeMutation(),
    useGetEmployeesQuery: () => mockUseGetEmployeesQuery(),
  };
});

describe('WorkingTimesConfig', () => {
  const updateOrgMock = vi.fn();
  const upsertOverrideMock = vi.fn();
  const deleteOverrideMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetOrgWorkingTimeQuery.mockReturnValue({
      data: {
        monday: 8,
        tuesday: 8,
        wednesday: 8,
        thursday: 8,
        friday: 8,
        saturday: 0,
        sunday: 0,
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    updateOrgMock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUseUpdateOrgWorkingTimeMutation.mockReturnValue([updateOrgMock, { isLoading: false }]);

    mockUseGetWorkingTimeOverridesQuery.mockReturnValue({
      data: [
        {
          id: 'override-1',
          employeeId: 'emp-1',
          monday: 6,
          tuesday: 6,
          wednesday: 6,
          thursday: 6,
          friday: 6,
          saturday: 0,
          sunday: 0,
        },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    upsertOverrideMock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUseUpsertEmployeeWorkingTimeMutation.mockReturnValue([upsertOverrideMock, { isLoading: false }]);

    deleteOverrideMock.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockUseDeleteEmployeeWorkingTimeMutation.mockReturnValue([deleteOverrideMock, { isLoading: false }]);

    mockUseGetEmployeesQuery.mockReturnValue({
      data: [
        { id: 'emp-1', name: 'Aarav Sharma', email: 'aarav@sify.com', employeeCode: 'EMP001' },
        { id: 'emp-2', name: 'Neha Patel', email: 'neha@sify.com', employeeCode: 'EMP002' },
      ],
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <WorkingTimesConfig />
      </MemoryRouter>
    );
  };

  it('renders page header, org default baseline, and weekly hours badge', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Working Times Configuration/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Organization Default Schedule/i })).toBeInTheDocument();
    expect(screen.getByText(/40 hrs \/ week/i)).toBeInTheDocument();
    expect(screen.getByText(/5 Workdays • 2 Off/i)).toBeInTheDocument();
  });

  it('allows entering edit mode on organization default schedule and saving', async () => {
    renderComponent();

    const editBtn = screen.getByRole('button', { name: /Edit Baseline/i });
    fireEvent.click(editBtn);

    expect(screen.getByText(/Quick Presets:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Baseline/i })).toBeInTheDocument();

    // Click standard preset button
    const standardPresetBtn = screen.getByRole('button', { name: /Standard \(40h Mon-Fri\)/i });
    fireEvent.click(standardPresetBtn);

    // Save baseline
    const saveBtn = screen.getByRole('button', { name: /Save Baseline/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateOrgMock).toHaveBeenCalledWith({
        monday: 8,
        tuesday: 8,
        wednesday: 8,
        thursday: 8,
        friday: 8,
        saturday: 0,
        sunday: 0,
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        'Organization baseline schedule updated successfully',
        'success'
      );
    });
  });

  it('renders employee overrides with employee names, hours, and variance', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Employee Overrides/i })).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('aarav@sify.com')).toBeInTheDocument();
    expect(screen.getByText('30h')).toBeInTheDocument();
    expect(screen.getByText('-10h')).toBeInTheDocument();
  });

  it('filters overrides by employee name or email', () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/Filter overrides…/i);
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });

    expect(screen.queryByText('Aarav Sharma')).not.toBeInTheDocument();
    expect(screen.getByText(/No employee overrides match/i)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Aarav' } });
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
  });

  it('allows opening Add Override modal and saves', async () => {
    renderComponent();

    const addBtn = screen.getByRole('button', { name: /Add Override/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: /Add Employee Override/i })).toBeInTheDocument();

    // Click Part-time preset
    const partTimePreset = screen.getByRole('button', { name: /Part-time \(20h\)/i });
    fireEvent.click(partTimePreset);

    // Expect modal to show updated target
    expect(screen.getByText(/20 hrs \/ week/i)).toBeInTheDocument();
  });

  it('allows deleting an employee override after confirmation', async () => {
    renderComponent();

    const deleteBtn = screen.getByTitle('Delete Override');
    fireEvent.click(deleteBtn);

    expect(screen.getByText(/Remove Working Time Override\?/i)).toBeInTheDocument();
    const confirmDeleteBtn = screen.getByRole('button', { name: /Remove Override/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(deleteOverrideMock).toHaveBeenCalledWith('emp-1');
      expect(mockShowToast).toHaveBeenCalledWith(
        'Override removed. Employee reverted to organization baseline.',
        'success'
      );
    });
  });
});
