import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '../../../test-utils';
import { ResourceAllocation } from './ResourceAllocation';
import * as apiSlice from '../../../store/apiSlice';

vi.mock('../../../store/apiSlice', async () => {
  const actual = await vi.importActual<any>('../../../store/apiSlice');
  return {
    ...actual,
    useGetResourceAllocationReportQuery: vi.fn(),
  };
});

describe('ResourceAllocation Component', () => {
  const mockData = [
    {
      employeeId: 'emp1',
      employeeName: 'John Doe',
      role: 'EMPLOYEE',
      availableCapacity: 40,
      plannedDemand: 30,
      remainingCapacity: 10,
      isOverAllocated: false,
      utilizationPercentage: 75,
      projectDemand: [
        { projectId: 'p1', projectName: 'Project Alpha', demand: 20 },
        { projectId: 'p2', projectName: 'Project Beta', demand: 10 }
      ]
    },
    {
      employeeId: 'emp2',
      employeeName: 'Jane Smith',
      role: 'EMPLOYEE',
      availableCapacity: 40,
      plannedDemand: 50,
      remainingCapacity: -10,
      isOverAllocated: true,
      utilizationPercentage: 125,
      projectDemand: [
        { projectId: 'p1', projectName: 'Project Alpha', demand: 50 }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiSlice.useGetResourceAllocationReportQuery as any).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders loading state initially', () => {
    (apiSlice.useGetResourceAllocationReportQuery as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<ResourceAllocation />);
    expect(screen.getByText('Resource Allocation')).toBeInTheDocument();
  });

  it('renders capacity data correctly', async () => {
    render(<ResourceAllocation />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Check utilization percentages
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('125%')).toBeInTheDocument();

    // Check over-allocated label for Jane
    expect(screen.getByText('Over-allocated')).toBeInTheDocument();
    
    // Check projects
    expect(screen.getAllByText('Project Alpha').length).toBeGreaterThan(0);
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('handles empty state', () => {
    (apiSlice.useGetResourceAllocationReportQuery as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<ResourceAllocation />);
    expect(screen.getByText('No capacity or resource allocation data found for the selected period.')).toBeInTheDocument();
  });
});
