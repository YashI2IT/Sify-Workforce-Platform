import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NotificationsMenu, formatNotificationDate } from '../NotificationsMenu';
import { UserProfileMenu } from '../UserProfileMenu';
import authReducer from '../../../store/slices/authSlice';
import { apiSlice } from '../../../store/apiSlice';

// Helper to mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock notification mutations
const mockMarkAsRead = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
const mockMarkAllRead = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });

interface MockNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  destination?: string;
}

let mockNotificationState: {
  data: MockNotification[];
  isLoading: boolean;
  isError: boolean;
} = {
  data: [
    {
      id: 'notif-1',
      title: 'Timesheet Approved',
      message: 'Your timesheet for Week 42 has been approved by your manager.',
      type: 'TIMESHEET_APPROVED',
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedEntityType: 'TIMESHEET',
      relatedEntityId: 'ts-101',
    },
    {
      id: 'notif-2',
      title: 'Task Assigned',
      message: 'You have been assigned to Jira migration.',
      type: 'TASK_ASSIGNED',
      isRead: true,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
      relatedEntityType: 'TASK',
      relatedEntityId: 'proj-1:task-5',
    },
  ],
  isLoading: false,
  isError: false,
};

vi.mock('../../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../store/apiSlice')>();
  return {
    ...actual,
    useGetMyNotificationsQuery: () => mockNotificationState,
    useMarkNotificationAsReadMutation: () => [mockMarkAsRead],
    useMarkAllNotificationsAsReadMutation: () => [mockMarkAllRead, { isLoading: false }],
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

describe('Header Dropdowns — Sify Workforce Platform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationState = {
      data: [
        {
          id: 'notif-1',
          title: 'Timesheet Approved',
          message: 'Your timesheet for Week 42 has been approved by your manager.',
          type: 'TIMESHEET_APPROVED',
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: 'ts-101',
        },
        {
          id: 'notif-2',
          title: 'Task Assigned',
          message: 'You have been assigned to Jira migration.',
          type: 'TASK_ASSIGNED',
          isRead: true,
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-1:task-5',
        },
      ],
      isLoading: false,
      isError: false,
    };
  });

  describe('formatNotificationDate utility', () => {
    it('formats recent times accurately', () => {
      const now = new Date().toISOString();
      expect(formatNotificationDate(now)).toBe('Just now');

      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(formatNotificationDate(tenMinutesAgo)).toBe('10m ago');

      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      expect(formatNotificationDate(twoHoursAgo)).toBe('2h ago');

      const yesterday = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
      expect(formatNotificationDate(yesterday)).toBe('Yesterday');
    });

    it('returns empty string for invalid dates', () => {
      expect(formatNotificationDate('')).toBe('');
      expect(formatNotificationDate(undefined)).toBe('');
      expect(formatNotificationDate('invalid-date')).toBe('');
    });
  });

  describe('NotificationsMenu Component', () => {
    const renderNotifications = () => {
      const store = createTestStore();
      return render(
        <Provider store={store}>
          <MemoryRouter>
            <NotificationsMenu />
          </MemoryRouter>
        </Provider>
      );
    };

    it('displays unread notification badge on circular trigger button', () => {
      renderNotifications();
      const triggerBtn = screen.getByRole('button', { name: /notifications, 1 unread/i });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toHaveAttribute('aria-haspopup', 'true');
      expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens floating panel displaying header, unread count, and mark all read button', async () => {
      const user = userEvent.setup();
      renderNotifications();

      const triggerBtn = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerBtn);

      expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('dialog', { name: /notifications panel/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // unread count badge
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument();
    });

    it('renders notification items with title, description, and relative date', async () => {
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));

      expect(screen.getByText('Timesheet Approved')).toBeInTheDocument();
      expect(screen.getByText(/Your timesheet for Week 42 has been approved/i)).toBeInTheDocument();
      expect(screen.getByText('Task Assigned')).toBeInTheDocument();
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('handles Mark All Read click properly', async () => {
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      const markAllBtn = screen.getByRole('button', { name: /mark all read/i });
      await user.click(markAllBtn);

      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });

    it('marks notification as read and navigates when clicked', async () => {
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      const unreadItem = screen.getByText('Timesheet Approved');
      await user.click(unreadItem);

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
      expect(mockNavigate).toHaveBeenCalledWith('/timesheets/ts-101');
    });

    it('navigates to exact project and task when clicking a task notification, and skips markAsRead if already read', async () => {
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      const taskItem = screen.getByText('Task Assigned');
      await user.click(taskItem);

      // notif-2 was already isRead: true
      expect(mockMarkAsRead).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-1?taskId=task-5');
    });

    it('navigates to project page when clicking project notification', async () => {
      mockNotificationState = {
        data: [
          {
            id: 'notif-proj',
            title: 'Assigned to Project',
            message: 'You have been assigned to Core Banking.',
            type: 'PROJECT_ASSIGNED',
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedEntityType: 'PROJECT',
            relatedEntityId: 'proj-88',
          },
        ],
        isLoading: false,
        isError: false,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      await user.click(screen.getByText('Assigned to Project'));

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-proj');
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-88');
    });

    it('navigates to submission approvals with ID when clicking submission notification', async () => {
      mockNotificationState = {
        data: [
          {
            id: 'notif-sub',
            title: 'Time Entry Submitted',
            message: 'John Doe submitted time entries for approval.',
            type: 'TIMESHEET_SUBMITTED',
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedEntityType: 'TIMESHEET_SUBMISSION',
            relatedEntityId: 'sub-999',
          },
        ],
        isLoading: false,
        isError: false,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      await user.click(screen.getByText('Time Entry Submitted'));

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-sub');
      expect(mockNavigate).toHaveBeenCalledWith('/submission-approvals?submissionId=sub-999');
    });

    it('navigates to manager review for standard timesheet submission', async () => {
      mockNotificationState = {
        data: [
          {
            id: 'notif-ts-review',
            title: 'Timesheet Submitted',
            message: 'Alice submitted weekly timesheet.',
            type: 'TIMESHEET_SUBMITTED',
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedEntityType: 'TIMESHEET',
            relatedEntityId: 'ts-777',
          },
        ],
        isLoading: false,
        isError: false,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      await user.click(screen.getByText('Timesheet Submitted'));

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-ts-review');
      expect(mockNavigate).toHaveBeenCalledWith('/approvals/timesheets/ts-777');
    });

    it('sanitizes untrusted external destinations and navigates to safe internal entity route', async () => {
      mockNotificationState = {
        data: [
          {
            id: 'notif-malicious',
            title: 'Comment Mention',
            message: 'You were mentioned in a comment.',
            type: 'COMMENT_MENTION',
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedEntityType: 'TASK',
            relatedEntityId: 'proj-safe:task-safe',
            destination: 'https://malicious.site/phish',
          },
        ],
        isLoading: false,
        isError: false,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      await user.click(screen.getByText('Comment Mention'));

      expect(mockMarkAsRead).toHaveBeenCalledWith('notif-malicious');
      // Must NOT navigate to https://malicious.site/phish
      expect(mockNavigate).toHaveBeenCalledWith('/projects/proj-safe?taskId=task-safe');
    });

    it('closes on Escape key press', async () => {
      const user = userEvent.setup();
      renderNotifications();

      const triggerBtn = screen.getByRole('button', { name: /notifications/i });
      await user.click(triggerBtn);
      expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');
      expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('displays empty state when there are no notifications', async () => {
      mockNotificationState = {
        data: [],
        isLoading: false,
        isError: false,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up for now!")).toBeInTheDocument();
      expect(screen.getByText('All caught up')).toBeInTheDocument();
    });

    it('displays loading skeleton state when isLoading is true', async () => {
      mockNotificationState = {
        data: [],
        isLoading: true,
        isError: false,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByLabelText(/notifications panel/i).querySelector('[aria-busy="true"]')).toBeInTheDocument();
    });

    it('displays error state when isError is true', async () => {
      mockNotificationState = {
        data: [],
        isLoading: false,
        isError: true,
      };
      const user = userEvent.setup();
      renderNotifications();

      await user.click(screen.getByRole('button', { name: /notifications/i }));
      expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
    });
  });

  describe('UserProfileMenu Component', () => {
    const mockEmployee = {
      id: 'emp-101',
      name: 'Yash Vardhan',
      email: 'yash@sify.com',
      role: 'ADMIN',
      roles: ['ADMIN'],
      employeeCode: 'SIFY-8821',
    };
    const mockOnOpenProfileModal = vi.fn();
    const mockOnLogout = vi.fn();

    const renderProfile = (employee: any = mockEmployee) => {
      return render(
        <MemoryRouter>
          <UserProfileMenu
            employee={employee}
            onOpenProfileModal={mockOnOpenProfileModal}
            onLogout={mockOnLogout}
          />
        </MemoryRouter>
      );
    };

    it('renders user initials circle and display name on trigger pill', () => {
      renderProfile();
      expect(screen.getByText('YV')).toBeInTheDocument();
      expect(screen.getByText('Yash Vardhan')).toBeInTheDocument();

      const triggerBtn = screen.getByRole('button', { name: /user menu for yash vardhan/i });
      expect(triggerBtn).toBeInTheDocument();
      expect(triggerBtn).toHaveAttribute('aria-haspopup', 'true');
      expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens identity section with full name, email, role badge, and employee code', async () => {
      const user = userEvent.setup();
      renderProfile();

      await user.click(screen.getByRole('button', { name: /user menu/i }));

      expect(screen.getAllByText('Yash Vardhan').length).toBeGreaterThan(0);
      expect(screen.getByText('yash@sify.com')).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getByText('SIFY-8821')).toBeInTheDocument();
    });

    it('triggers profile modal on Profile Settings click', async () => {
      const user = userEvent.setup();
      renderProfile();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      const settingsBtn = screen.getByRole('button', { name: /profile settings/i });
      await user.click(settingsBtn);

      expect(mockOnOpenProfileModal).toHaveBeenCalledTimes(1);
    });

    it('does not contain Preferences action in profile menu', async () => {
      const user = userEvent.setup();
      renderProfile();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      expect(screen.queryByRole('link', { name: /preferences/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/preferences/i)).not.toBeInTheDocument();
    });

    it('triggers logout on Sign Out click', async () => {
      const user = userEvent.setup();
      renderProfile();

      await user.click(screen.getByRole('button', { name: /user menu/i }));
      const signOutBtn = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutBtn);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape key press', async () => {
      const user = userEvent.setup();
      renderProfile();

      const triggerBtn = screen.getByRole('button', { name: /user menu/i });
      await user.click(triggerBtn);
      expect(triggerBtn).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');
      expect(triggerBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('gracefully handles missing/null employee with safe fallbacks', () => {
      renderProfile(null);
      expect(screen.getByText('SW')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });
});
