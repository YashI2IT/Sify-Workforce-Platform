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
    timesheet: { status: 'APPROVED' },
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
    expect(screen.getAllByText(/\+ Add Time Entry/i).length).toBeGreaterThanOrEqual(1);
  });

  it('allows copying an approved historical entry into a new entry (DRAFT target)', async () => {
    const user = require('@testing-library/user-event').default.setup();
    render(
      <MemoryRouter>
        <MyTimeEntries />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Enterprise Cloud Migration/i).length).toBeGreaterThanOrEqual(1);
    });

    // The copy button is available even if the timesheet is APPROVED (since copy doesn't mutate the original)
    const copyButton = document.querySelector('button[title="Copy / Log Again"]') as HTMLButtonElement;
    expect(copyButton).toBeDefined();
    
    // Simulate clicking it
    await user.click(copyButton);

    // Should open the modal with the pre-filled data
    await waitFor(() => {
      expect(screen.getByText('Copy / Log Again')).toBeDefined();
    });

    // We expect the form to have been initialized with the source entry's hours
    const hoursInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(hoursInput.value).toBe('8');
  });
});
