import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GlobalSearchPalette } from '../GlobalSearchPalette';
import authReducer from '../../../store/slices/authSlice';
import { apiSlice } from '../../../store/apiSlice';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockServerSearchResults: any = {
  projects: [],
  tasks: [],
  employees: [],
  teams: [],
  timesheets: [],
  totalMatches: 0,
};
let mockIsServerLoading = false;
let mockIsServerError = false;
let mockServerError: any = null;
const mockTriggerSearch = vi.fn();

// Mock useLazySearchQuery
vi.mock('../../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../store/apiSlice')>();
  return {
    ...actual,
    useLazySearchQuery: () => [
      mockTriggerSearch,
      {
        data: mockServerSearchResults,
        isLoading: mockIsServerLoading,
        isError: mockIsServerError,
        error: mockServerError,
      },
    ],
  };
});

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });

const renderPalette = (props: {
  isOpen: boolean;
  onClose: () => void;
  employee?: any;
}) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <GlobalSearchPalette {...props} />
      </MemoryRouter>
    </Provider>
  );
};

describe('GlobalSearchPalette Enterprise Command Palette', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockIsServerLoading = false;
    mockIsServerError = false;
    mockServerError = null;
    mockServerSearchResults = {
      projects: [],
      tasks: [],
      employees: [],
      teams: [],
      timesheets: [],
      totalMatches: 0,
    };
  });

  describe('Modal Lifecycle & Accessibility', () => {
    it('does not render when isOpen is false', () => {
      renderPalette({ isOpen: false, onClose });
      expect(screen.queryByRole('dialog', { name: /quick search navigation/i })).not.toBeInTheDocument();
    });

    it('renders with autofocus input and shortcut hints when isOpen is true', () => {
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const dialog = screen.getByRole('dialog', { name: /quick search navigation/i });
      expect(dialog).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      expect(input).toBeInTheDocument();
      expect(screen.getByText('ESC')).toBeInTheDocument();
      expect(screen.getByText(/sify enterprise search/i)).toBeInTheDocument();
    });

    it('closes on Escape key press', async () => {
      const user = userEvent.setup();
      renderPalette({ isOpen: true, onClose });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, '{Escape}');

      expect(onClose).toHaveBeenCalled();
    });

    it('closes on outside backdrop click', async () => {
      const user = userEvent.setup();
      renderPalette({ isOpen: true, onClose });

      const backdrop = screen.getByRole('dialog', { name: /quick search navigation/i });
      await user.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Initial State (Empty Query)', () => {
    it('renders Suggested Destinations and Quick Actions for Admin', () => {
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      expect(screen.getByText('Suggested Destinations')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });

    it('displays saved Recent Destinations from localStorage in initial state', () => {
      const savedRecents = [
        {
          id: 'proj-1',
          category: 'projects',
          categoryLabel: 'Recent Destinations',
          title: 'Cloud Migration Platform',
          subtitle: 'PRJ-MIG • ACTIVE',
          url: '/projects/proj-1',
        },
      ];
      localStorage.setItem('sify_recent_searches', JSON.stringify(savedRecents));

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      expect(screen.getByText('Recent Destinations')).toBeInTheDocument();
      expect(screen.getByText('Cloud Migration Platform')).toBeInTheDocument();
    });

    it('allows clearing recent searches', async () => {
      const user = userEvent.setup();
      const savedRecents = [
        {
          id: 'proj-1',
          category: 'recents',
          categoryLabel: 'Recent Destinations',
          title: 'Cloud Migration Platform',
          subtitle: 'PRJ-MIG • ACTIVE',
          url: '/projects/proj-1',
        },
      ];
      localStorage.setItem('sify_recent_searches', JSON.stringify(savedRecents));

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      expect(screen.getByText('Cloud Migration Platform')).toBeInTheDocument();
      const clearBtn = screen.getByText('clear');
      await user.click(clearBtn);

      expect(screen.queryByText('Cloud Migration Platform')).not.toBeInTheDocument();
      expect(localStorage.getItem('sify_recent_searches')).toBeNull();
    });

    it('gracefully handles and sanitizes legacy or corrupted localStorage entries with plain object icon', () => {
      // Simulates legacy entries where icon was serialized as {} or an object
      const corruptedRecents = [
        {
          id: 'corrupted-1',
          category: 'recents',
          categoryLabel: 'Recent Destinations',
          title: 'Legacy Saved Destination',
          subtitle: 'LEGACY-001',
          url: '/projects/legacy-1',
          icon: {}, // plain empty object from JSON serialization
        },
      ];
      localStorage.setItem('sify_recent_searches', JSON.stringify(corruptedRecents));

      expect(() => {
        renderPalette({
          isOpen: true,
          onClose,
          employee: { role: 'ADMIN', roles: ['ADMIN'] },
        });
      }).not.toThrow();

      expect(screen.getByText('Legacy Saved Destination')).toBeInTheDocument();
    });
  });

  describe('Role-Based Scoping of Navigation & Quick Actions', () => {
    it('Admin can find Work Calendar, Organization, and Activity History', async () => {
      const user = userEvent.setup();
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'calendar');

      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
      expect(screen.getByText(/working times, weekly schedules/i)).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'organization');
      expect(screen.getByText('Organization')).toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'audit');
      expect(screen.getByText('Activity History')).toBeInTheDocument();
    });

    it('Admin cannot search My Timesheets or Approvals', async () => {
      const user = userEvent.setup();
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'timesheets');
      expect(screen.queryByText('My Timesheets')).not.toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'approvals');
      expect(screen.queryByText('Pending Approvals')).not.toBeInTheDocument();
      expect(screen.queryByText('Timesheet Approvals')).not.toBeInTheDocument();
    });

    it('Employee cannot access Admin Work Calendar or Audit Logs', async () => {
      const user = userEvent.setup();
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'calendar');

      // Employee does not have Work Calendar page
      expect(screen.queryByText('Work Calendar')).not.toBeInTheDocument();

      await user.clear(input);
      await user.type(input, 'audit');
      expect(screen.queryByText('Activity History')).not.toBeInTheDocument();
    });

    it('Manager can search Team Timesheets and Approvals', async () => {
      const user = userEvent.setup();
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'MANAGER', roles: ['MANAGER'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'approvals');

      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    });
  });

  describe('Server Results & Exact Ticket ID Deep Linking', () => {
    it('renders server task result with ticket ID and deep-links directly to task', async () => {
      const user = userEvent.setup();
      mockServerSearchResults = {
        projects: [],
        tasks: [
          {
            id: 'task-42',
            type: 'task',
            title: 'Fix Authentication Token Refresh',
            subtitle: 'P101-1 • Sify Workforce • Yash Bhosale',
            badge: 'IN_PROGRESS',
            badgeVariant: 'warning',
            url: '/projects/proj-101?taskId=task-42',
          },
        ],
        employees: [],
        teams: [],
        timesheets: [],
        totalMatches: 1,
      };

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'P101-1');

      // Check task appears with ticket ID and badge
      expect(screen.getByText('Fix Authentication Token Refresh')).toBeInTheDocument();
      expect(screen.getByText(/P101-1 • Sify Workforce/i)).toBeInTheDocument();
      expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();

      // Click task
      const taskButton = screen.getByRole('option', { name: /Fix Authentication Token Refresh/i });
      await user.click(taskButton);

      expect(onClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-101?taskId=task-42');
    });

    it('renders projects, people, teams, and timesheets from server', async () => {
      const user = userEvent.setup();
      mockServerSearchResults = {
        projects: [
          {
            id: 'proj-1',
            type: 'project',
            title: 'Customer Portal 2.0',
            subtitle: 'PRJ-PORTAL • Client Alpha',
            badge: 'ACTIVE',
            badgeVariant: 'success',
            url: '/projects/proj-1',
          },
        ],
        tasks: [],
        employees: [
          {
            id: 'emp-2',
            type: 'employee',
            title: 'Anita Sharma',
            subtitle: 'anita@sify.com • Engineering',
            badge: 'MANAGER',
            badgeVariant: 'purple',
            url: '/employees',
          },
        ],
        teams: [
          {
            id: 'team-1',
            type: 'team',
            title: 'Core Backend Squad',
            subtitle: 'SQUAD-BE • 8 members',
            badge: 'Team',
            url: '/teams',
          },
        ],
        timesheets: [],
        totalMatches: 3,
      };

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'Alpha');

      expect(screen.getByText('Customer Portal 2.0')).toBeInTheDocument();
      expect(screen.getByText('Anita Sharma')).toBeInTheDocument();
      expect(screen.getByText('Core Backend Squad')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation (ArrowUp, ArrowDown, Enter)', () => {
    it('navigates items with arrow keys and selects with Enter', async () => {
      const user = userEvent.setup();
      mockServerSearchResults = {
        projects: [
          {
            id: 'proj-1',
            type: 'project',
            title: 'Project Alpha',
            subtitle: 'PRJ-A',
            url: '/projects/proj-1',
          },
          {
            id: 'proj-2',
            type: 'project',
            title: 'Project Beta',
            subtitle: 'PRJ-B',
            url: '/projects/proj-2',
          },
        ],
        tasks: [],
        employees: [],
        teams: [],
        timesheets: [],
        totalMatches: 2,
      };

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'Project');

      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThanOrEqual(2);

      // Initially first item is selected
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      // Press ArrowDown to select second item
      await user.keyboard('{ArrowDown}');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');

      // Press Enter to navigate to second item
      await user.keyboard('{Enter}');
      expect(onClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-2');
    });
  });

  describe('Empty, Loading, and Error States', () => {
    it('shows loading spinner when server search is in progress', () => {
      mockIsServerLoading = true;
      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows informative empty state when query returns no results', async () => {
      const user = userEvent.setup();
      mockServerSearchResults = {
        projects: [],
        tasks: [],
        employees: [],
        teams: [],
        timesheets: [],
        totalMatches: 0,
      };

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      const input = screen.getByPlaceholderText(/search projects, tasks, people/i);
      await user.type(input, 'xyznonexistent123');

      await waitFor(() => {
        expect(screen.getByText(/No results found for/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Try searching by project key, task ticket ID/i)).toBeInTheDocument();
    });

    it('shows error state with retry button when server call fails', () => {
      mockIsServerError = true;
      mockServerError = 'Network connection lost';

      renderPalette({
        isOpen: true,
        onClose,
        employee: { role: 'ADMIN', roles: ['ADMIN'] },
      });

      expect(screen.getByText('Unable to query business records')).toBeInTheDocument();
      expect(screen.getByText('Network connection lost')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /retry search/i });
      expect(retryBtn).toBeInTheDocument();
    });
  });
});
