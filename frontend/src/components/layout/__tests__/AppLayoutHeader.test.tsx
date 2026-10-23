import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AppLayout } from '../AppLayout';
import authReducer from '../../../store/slices/authSlice';
import { apiSlice } from '../../../store/apiSlice';

// Mock useCurrentEmployee hook
const mockEmployee = {
  id: 'emp-1',
  name: 'Yash Bhosale',
  email: 'yash@example.com',
  role: 'ADMIN',
  roles: ['ADMIN'],
  employeeCode: 'SIFY-001',
};

vi.mock('../../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: mockEmployee,
    loading: false,
  }),
}));

// Mock apiSlice query hooks called in AppLayout and NotificationsMenu
vi.mock('../../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../store/apiSlice')>();
  return {
    ...actual,
    useGetMyPreferencesQuery: () => ({
      data: { theme: 'light' },
    }),
    useGetMyNotificationsQuery: () => ({
      data: [
        {
          id: 'notif-1',
          title: 'Test Notification',
          message: 'You have a new task assigned',
          isRead: false,
          type: 'TASK_ASSIGNED',
          createdAt: new Date().toISOString(),
        },
      ],
    }),
    useMarkNotificationAsReadMutation: () => [vi.fn().mockReturnValue({ unwrap: vi.fn() })],
    useMarkAllNotificationsAsReadMutation: () => [vi.fn().mockReturnValue({ unwrap: vi.fn() }), { isLoading: false }],
  };
});

import { ToastProvider } from '../../../context/ToastContext';

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiSlice.middleware),
  });

const renderWithProviders = (initialRoute = '/dashboard') => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AppLayout />
        </MemoryRouter>
      </ToastProvider>
    </Provider>
  );
};

describe('Redesigned Sify Workforce Global Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Area A: brand logo image linking to dashboard', () => {
    renderWithProviders('/dashboard');

    // Brand link to dashboard
    const brandLinks = screen.getAllByRole('link', { name: /sify workforce platform home/i });
    expect(brandLinks.length).toBeGreaterThan(0);

    // Check official logo image
    const logoImgs = screen.getAllByAltText('Sify Workforce');
    expect(logoImgs.length).toBeGreaterThan(0);
    expect(logoImgs[0]).toHaveAttribute('src', '/sify Workforce Logo on Transparent Canvas.png');

    // Check hamburger button for mobile view
    const menuButton = screen.getByRole('button', { name: /open navigation sidebar/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('renders Area B: dynamic breadcrumb hierarchy with semantic markup', () => {
    renderWithProviders('/dashboard');

    const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumbNav).toBeInTheDocument();

    // On /dashboard, renders clean Dashboard title without fake Platform prefix or back button
    expect(screen.queryByText('Platform')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
    expect(screen.getByRole('listitem', { current: 'page' })).toHaveTextContent('Dashboard');
  });

  it('renders Area B: derives breadcrumbs dynamically from route (e.g. /employees)', () => {
    renderWithProviders('/employees');

    const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(breadcrumbNav).getByText('People & Teams')).toBeInTheDocument();
    expect(within(breadcrumbNav).getByRole('listitem', { current: 'page' })).toHaveTextContent('Employees');
  });

  it('renders Area C: compact circular notification button with Lucide bell icon and unread indicator', () => {
    renderWithProviders('/dashboard');

    const notifBtn = screen.getByRole('button', { name: /notifications/i });
    expect(notifBtn).toBeInTheDocument();
    expect(notifBtn).toHaveAttribute('aria-haspopup', 'true');
    expect(notifBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders Area D: profile pill control with user initials and name', () => {
    renderWithProviders('/dashboard');

    // Initials for "Yash Bhosale" -> "YB"
    expect(screen.getByText('YB')).toBeInTheDocument();
    // Full name "Yash Bhosale"
    expect(screen.getByText('Yash Bhosale')).toBeInTheDocument();

    const profileBtn = screen.getByRole('button', { name: /user menu for yash bhosale/i });
    expect(profileBtn).toBeInTheDocument();
    expect(profileBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens accessible profile dropdown on click with Profile Settings and Sign Out (no Preferences)', async () => {
    const user = userEvent.setup();
    renderWithProviders('/dashboard');

    const profileBtn = screen.getByRole('button', { name: /user menu for yash bhosale/i });
    await user.click(profileBtn);

    expect(profileBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /profile settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /preferences/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();

    // Pressing Escape closes the dropdown
    await user.keyboard('{Escape}');
    expect(profileBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders breadcrumbs correctly across different routes', () => {
    // Test on /admin/work-calendar
    const { unmount } = renderWithProviders('/admin/work-calendar');
    const nav1 = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(nav1).getByText('Company')).toBeInTheDocument();
    expect(within(nav1).getByRole('listitem', { current: 'page' })).toHaveTextContent('Work Calendar');
    unmount();

    // Test on /organization/settings
    renderWithProviders('/organization/settings');
    const nav2 = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(nav2).getByText('Company')).toBeInTheDocument();
    expect(within(nav2).getByRole('listitem', { current: 'page' })).toHaveTextContent('Settings');
  });
});
