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
import { ToastProvider } from '../../../context/ToastContext';

// Current employee state for mocking different roles
let mockCurrentRole: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' = 'ADMIN';

vi.mock('../../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({
    employee: {
      id: 'emp-1',
      name: 'Yash Bhosale',
      email: 'yash@sify.com',
      role: mockCurrentRole,
      roles: [mockCurrentRole],
      employeeCode: 'SIFY-001',
    },
    loading: false,
  }),
}));

vi.mock('../../../store/apiSlice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../store/apiSlice')>();
  return {
    ...actual,
    useGetMyPreferencesQuery: () => ({
      data: { theme: 'light' },
    }),
    useGetCurrentOrganizationQuery: () => ({
      data: { id: 'org-1', name: 'Sify Technologies' },
    }),
    useGetMyNotificationsQuery: () => ({
      data: [],
    }),
    useMarkNotificationAsReadMutation: () => [vi.fn().mockReturnValue({ unwrap: vi.fn() })],
    useMarkAllNotificationsAsReadMutation: () => [vi.fn().mockReturnValue({ unwrap: vi.fn() }), { isLoading: false }],
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

const renderLayout = (initialRoute = '/dashboard') => {
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

describe('Sidebar and Header Refactor — Sify Workforce Platform', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCurrentRole = 'ADMIN';
  });

  describe('Section 3: Role-Specific Sidebar Navigations', () => {
    it('renders exact Admin navigation menu items, groupings, and labels', () => {
      mockCurrentRole = 'ADMIN';
      renderLayout('/dashboard');

      // Top item
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();

      // No separate ORGANIZATION group heading
      expect(screen.queryByText('ORGANIZATION')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^settings$/i })).not.toBeInTheDocument();

      // PEOPLE & TEAMS group
      expect(screen.getByText('PEOPLE & TEAMS')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^employees$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^teams$/i })).toBeInTheDocument();

      // PROJECTS & REPORTS group
      expect(screen.getByText('PROJECTS & REPORTS')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^projects$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^reports$/i })).toBeInTheDocument();

      // TIME & APPROVALS group removed for ADMIN
      expect(screen.queryByText('TIME & APPROVALS')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^my timesheets$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^timesheet approvals$/i })).not.toBeInTheDocument();

      // COMPANY group - contains Organization, Work Calendar, Activity History
      expect(screen.getByText('COMPANY')).toBeInTheDocument();
      const companyToggle = screen.getByRole('button', { name: /company/i });
      const organizationLink = screen.getByRole('link', { name: /^organization$/i });
      const workCalendarLink = screen.getByRole('link', { name: /^work calendar$/i });
      const activityHistoryLink = screen.getByRole('link', { name: /^activity history$/i });

      expect(organizationLink).toBeInTheDocument();
      expect(workCalendarLink).toBeInTheDocument();
      expect(activityHistoryLink).toBeInTheDocument();

      // Verify exact order within COMPANY
      expect(companyToggle.compareDocumentPosition(organizationLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(organizationLink.compareDocumentPosition(workCalendarLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(workCalendarLink.compareDocumentPosition(activityHistoryLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Replaced old section headings and labels
      expect(screen.queryByText('WORKFORCE')).not.toBeInTheDocument();
      expect(screen.queryByText('TIMESHEETS')).not.toBeInTheDocument();
      expect(screen.queryByText('SYSTEM')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /pending approvals/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^company information$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /audit logs/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /working times/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /public holidays/i })).not.toBeInTheDocument();

      // Admin must NOT see manager-only "Team Timesheets" or "Timesheet Settings"
      expect(screen.queryByRole('link', { name: /team timesheets/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /timesheet settings/i })).not.toBeInTheDocument();
    });

    it('renders exact Manager navigation menu items, groupings, and labels', () => {
      mockCurrentRole = 'MANAGER';
      renderLayout('/dashboard');

      // Top item
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();

      // My Work
      expect(screen.getByText('My Work')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my projects/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /time entries/i })).toBeInTheDocument();

      // Timesheets
      expect(screen.getByText('Timesheets')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my timesheets/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /team timesheets/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pending approvals/i })).toBeInTheDocument();

      // Management
      expect(screen.getByText('Management')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /teams/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /^projects$/i })).toBeInTheDocument();

      // Reports
      expect(screen.getAllByText('Reports').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByRole('link', { name: /^reports$/i })).toBeInTheDocument();

      // Settings section and Timesheet Settings must NOT be visible to Manager
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /timesheet settings/i })).not.toBeInTheDocument();

      // Manager must NOT see admin-only items like Activity History or Organization
      expect(screen.queryByText('COMPANY')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /activity history/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^organization$|^company information$/i })).not.toBeInTheDocument();
    });

    it('renders exact Employee navigation menu items, groupings, and labels', () => {
      mockCurrentRole = 'EMPLOYEE';
      renderLayout('/dashboard');

      // Top item
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();

      // My Work
      expect(screen.getByText('My Work')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my projects/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /time entries/i })).toBeInTheDocument();

      // Timesheets
      expect(screen.getByText('Timesheets')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /my timesheets/i })).toBeInTheDocument();

      // Reports section and link must NOT be in the Employee sidebar
      expect(screen.queryByText('Reports')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /^reports$/i })).not.toBeInTheDocument();

      // Employee must NOT see manager or admin approvals/management
      expect(screen.queryByRole('link', { name: /pending approvals/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /team timesheets/i })).not.toBeInTheDocument();
      expect(screen.queryByText('Management')).not.toBeInTheDocument();
      expect(screen.queryByText('COMPANY')).not.toBeInTheDocument();
    });
  });

  describe('Sidebar Collapse and Expand Feature', () => {
    it('collapses and expands sidebar on toggle button click', async () => {
      const user = userEvent.setup();
      renderLayout('/dashboard');

      // Find desktop collapse toggle button
      const collapseButtons = screen.getAllByRole('button', { name: /collapse sidebar/i });
      expect(collapseButtons.length).toBeGreaterThan(0);

      // Click to collapse
      await user.click(collapseButtons[0]);

      // Should now show expand button
      const expandButtons = screen.getAllByRole('button', { name: /expand sidebar/i });
      expect(expandButtons.length).toBeGreaterThan(0);

      // In collapsed mode, navigation links retain aria-labels and title tooltips
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('title', 'Dashboard');

      // Click to expand again
      await user.click(expandButtons[0]);
      expect(screen.getAllByRole('button', { name: /collapse sidebar/i }).length).toBeGreaterThan(0);
    });

    it('toggles sidebar with Ctrl+B keyboard shortcut', async () => {
      const user = userEvent.setup();
      renderLayout('/dashboard');

      expect(screen.getAllByRole('button', { name: /collapse sidebar/i }).length).toBeGreaterThan(0);

      // Press Ctrl+B
      await user.keyboard('{Control>}b{/Control}');

      expect(screen.getAllByRole('button', { name: /expand sidebar/i }).length).toBeGreaterThan(0);
      expect(localStorage.getItem('sify_sidebar_collapsed')).toBe('true');

      // Press Ctrl+B again
      await user.keyboard('{Control>}b{/Control}');
      expect(screen.getAllByRole('button', { name: /collapse sidebar/i }).length).toBeGreaterThan(0);
      expect(localStorage.getItem('sify_sidebar_collapsed')).toBe('false');
    });

    it('toggles collapsible navigation sections in expanded mode', async () => {
      const user = userEvent.setup();
      renderLayout('/dashboard');

      // Click on "COMPANY" section button
      const companySectionToggle = screen.getByRole('button', { name: /company/i });
      await user.click(companySectionToggle);

      // Company items inside (including Organization and Work Calendar) are collapsed
      expect(screen.queryByRole('link', { name: /^organization$|^company information$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /work calendar/i })).not.toBeInTheDocument();

      // Click again to re-expand
      await user.click(companySectionToggle);
      expect(screen.getByRole('link', { name: /^organization$|^company information$/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /work calendar/i })).toBeInTheDocument();
    });

    it('applies smooth width transition classes and preserves persistent link layout', async () => {
      const user = userEvent.setup();
      renderLayout('/dashboard');

      const aside = screen.getByRole('complementary', { name: /sidebar navigation/i });
      expect(aside.className).toContain('duration-[250ms]');
      expect(aside.className).toContain('lg:w-56');
      expect(aside.className).toContain('motion-reduce:transition-none');

      // Check dashboard link has persistent icon box and label
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink.querySelector('.w-12')).toBeInTheDocument();

      // Collapse sidebar
      const collapseButton = screen.getAllByRole('button', { name: /collapse sidebar/i })[0];
      await user.click(collapseButton);

      // Width becomes 72px
      expect(aside.className).toContain('lg:w-[72px]');

      // Link remains mounted in DOM with title
      expect(dashboardLink).toBeInTheDocument();
      expect(dashboardLink).toHaveAttribute('title', 'Dashboard');

      // Rapid toggles test
      const expandButton = screen.getAllByRole('button', { name: /expand sidebar/i })[0];
      await user.click(expandButton);
      expect(aside.className).toContain('lg:w-56');
    });
  });

  describe('Header Quick Jump Search Feature', () => {
    it('opens quick jump command palette and filters pages', async () => {
      const user = userEvent.setup();
      renderLayout('/dashboard');

      const searchTrigger = screen.getByRole('button', { name: /search pages/i });
      await user.click(searchTrigger);

      // Search dialog should be open
      const searchDialog = screen.getByRole('dialog', { name: /quick search navigation/i });
      expect(searchDialog).toBeInTheDocument();

      const searchInput = screen.getByPlaceholderText(/search projects, tasks, people|search pages or jump to/i);
      expect(searchInput).toBeInTheDocument();

      // Type "calendar" finds Work Calendar
      await user.type(searchInput, 'calendar');
      expect(within(searchDialog).getByText('Work Calendar')).toBeInTheDocument();

      // Admin does not have My Timesheets in search
      await user.clear(searchInput);
      await user.type(searchInput, 'timesheets');
      expect(within(searchDialog).queryByText('My Timesheets')).not.toBeInTheDocument();

      // Press Escape closes it
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog', { name: /quick search navigation/i })).not.toBeInTheDocument();
    });
  });

  describe('Active Navigation and Breadcrumb Hierarchy', () => {
    it('highlights active item and shows correct breadcrumbs on /reports', () => {
      renderLayout('/reports');

      const reportsLink = screen.getByRole('link', { name: /^reports$/i });
      expect(reportsLink).toHaveClass('bg-white');
      expect(reportsLink).toHaveClass('text-[#0B1738]');

      const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
      expect(within(breadcrumbNav).getByRole('listitem', { current: 'page' })).toHaveTextContent('Reports');
    });

    it('renders back button in header on subpages and hides it on dashboard', () => {
      const { unmount } = renderLayout('/reports');
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
      unmount();

      renderLayout('/dashboard');
      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
    });
  });
});
