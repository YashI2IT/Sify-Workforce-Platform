import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MyTimeEntries } from './MyTimeEntries';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

const mockEntries = [
  {
    id: 'te-1',
    projectId: 'p-1',
    taskId: 't-1',
    activityId: 'a-1',
    date: getTodayStr(),
    hours: 8,
    remarks: 'Backend schema design and API endpoints',
  },
];

const mockProjects = [
  {
    id: 'p-1',
    name: 'Enterprise Cloud Migration',
    code: 'PRJ-MIG',
    isActive: true,
  },
];

describe('MyTimeEntries Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient.mockImplementation((url: string) => {
      if (url.includes('/time-entries')) {
        return Promise.resolve(mockEntries);
      }
      if (url.includes('/projects/p-1/tasks')) {
        return Promise.resolve([{ id: 't-1', name: 'API Design', isActive: true }]);
      }
      if (url.includes('/projects/p-1/activities')) {
        return Promise.resolve([{ id: 'a-1', name: 'Coding', isActive: true }]);
      }
      if (url.includes('/projects')) {
        return Promise.resolve(mockProjects);
      }
      return Promise.resolve([]);
    });
  });

  it('renders time entries page with calendar and recent log table', async () => {
    render(
      <MemoryRouter>
        <MyTimeEntries />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Enterprise Cloud Migration/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getAllByText('8h').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Backend schema design and API endpoints/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Add Time for/i).length).toBeGreaterThanOrEqual(1);
  });
});
