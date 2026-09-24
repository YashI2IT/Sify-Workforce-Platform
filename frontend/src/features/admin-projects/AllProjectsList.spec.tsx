import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AllProjectsList } from './AllProjectsList';

const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const mockProjects = [
  {
    id: 'p1',
    organizationId: 'org1',
    name: 'Workforce Cloud Platform',
    code: 'PRJ-WCP',
    status: 'ACTIVE',
    isActive: true,
  },
  {
    id: 'p2',
    organizationId: 'org1',
    name: 'Legacy Migration',
    code: 'PRJ-LEG',
    status: 'COMPLETED',
    isActive: false,
  },
];

describe('AllProjectsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockResolvedValue(mockProjects);
  });

  it('renders executive command header and projects list', async () => {
    render(
      <MemoryRouter>
        <AllProjectsList />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading project initiatives...')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Workforce Cloud Platform')).toBeDefined();
    });

    expect(screen.getByText('PRJ-WCP')).toBeDefined();
    expect(screen.getByText('PRJ-LEG')).toBeDefined();
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByText('COMPLETED')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('Archived')).toBeDefined();
  });

  it('opens and closes create project modal', async () => {
    render(
      <MemoryRouter>
        <AllProjectsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workforce Cloud Platform')).toBeDefined();
    });

    const createButton = screen.getByText('Create Project');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Project')).toBeDefined();
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Create New Project')).toBeNull();
    });
  });

  it('filters projects by search query', async () => {
    render(
      <MemoryRouter>
        <AllProjectsList />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Workforce Cloud Platform')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Search projects by name or code...');
    fireEvent.change(searchInput, { target: { value: 'Legacy' } });

    expect(screen.queryByText('Workforce Cloud Platform')).toBeNull();
    expect(screen.getByText('Legacy Migration')).toBeDefined();
  });
});
