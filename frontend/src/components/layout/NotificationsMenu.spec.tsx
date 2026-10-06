import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsMenu } from './NotificationsMenu';

const mockApiClient = vi.fn();
vi.mock('../../lib/apiClient', () => ({
  apiClient: (...args: any[]) => mockApiClient(...args),
}));

vi.mock('../../lib/authUtils', () => ({
  authStorage: {
    getAccessToken: () => 'fake-test-token',
    getRefreshToken: () => 'fake-refresh-token',
    getOrgId: () => 'fake-org-id',
    setTokens: vi.fn(),
    setOrgId: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('NotificationsMenu Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notifications bell, opens dropdown, and handles mark all read', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        title: 'New Comment on Task',
        message: 'Alex commented on task: PRJ-ONB-Q4-1',
        type: 'COMMENT_ADDED',
        isRead: false,
        createdAt: '2026-09-30T10:00:00Z',
      },
      {
        id: 'notif-2',
        title: 'Task Status Changed',
        message: 'Task PRJ-PORTAL-V2-1 status changed to IN_PROGRESS',
        type: 'TASK_STATUS_CHANGED',
        isRead: false,
        createdAt: '2026-09-30T11:00:00Z',
      },
    ];

    mockApiClient.mockImplementation((url: string, options?: any) => {
      if (url === '/notifications' && (!options || options.method === 'GET')) {
        return Promise.resolve(mockNotifications);
      }
      if (url === '/notifications/mark-all-read' && options?.method === 'PATCH') {
        return Promise.resolve({ success: true });
      }
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <NotificationsMenu />
      </MemoryRouter>
    );

    // Click the bell icon button to open the menu
    const bellBtn = screen.getByRole('button', { name: /Notifications/i });
    expect(bellBtn).toBeDefined();
    fireEvent.click(bellBtn);

    // Check that dropdown opened and displays notifications
    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeDefined();
      expect(screen.getByText('Alex commented on task: PRJ-ONB-Q4-1')).toBeDefined();
      expect(screen.getByText('Task PRJ-PORTAL-V2-1 status changed to IN_PROGRESS')).toBeDefined();
    });

    // Check "Mark all read" button is present and click it once
    const markAllBtn = screen.getByRole('button', { name: /Mark all read/i });
    expect(markAllBtn).toBeDefined();

    fireEvent.click(markAllBtn);

    // Verify mark all read was dispatched to backend
    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        '/notifications/mark-all-read',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });
});
