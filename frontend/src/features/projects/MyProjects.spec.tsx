import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MyProjects } from './MyProjects';

const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: { id: 'emp-1', name: 'John Employee' },
    isLoading: false,
  }),
}));

const mockProjects = [
  {
    id: 'proj-1',
    name: 'Enterprise Cloud Migration',
    code: 'PRJ-MIG',
    status: 'ACTIVE',
    isActive: true,
  },
  {
    id: 'proj-2',
    name: 'Legacy Archive',
    code: 'PRJ-ARC',
    status: 'COMPLETED',
    isActive: false,
  },
];

describe('MyProjects Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockResolvedValue(mockProjects);
  });

  it('renders assigned projects and status badges', async () => {
    render(
      <MemoryRouter>
        <MyProjects />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading your project workspaces...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Enterprise Cloud Migration')).toBeDefined();
    });

    expect(screen.getByText('PRJ-MIG')).toBeDefined();
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByText('Legacy Archive')).toBeDefined();
    expect(screen.getByText('PRJ-ARC')).toBeDefined();
  });
});
