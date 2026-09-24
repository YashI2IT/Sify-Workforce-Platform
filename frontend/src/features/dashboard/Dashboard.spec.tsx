import { render, screen, waitFor } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { getThisMonday, getTodayString } from '../../utils/date';

vi.mock('../../lib/apiClient', () => ({
  apiClient: vi.fn(),
}));

vi.mock('../../hooks/useCurrentEmployee', () => ({
  useCurrentEmployee: vi.fn(),
}));

import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

describe('Dashboard Component', () => {
  const todayStr = getTodayString();
  const thisMonday = getThisMonday();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message with employee name and role badge for Employee', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { 
        id: 'emp1', 
        name: 'Alice Johnson', 
        role: 'EMPLOYEE', 
        roles: ['EMPLOYEE'],
        employeeCode: 'EMP-001'
      },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url.includes('/projects')) return Promise.resolve([{ id: 'p1', name: 'Alpha Project' }]);
      if (url.includes('/my-timesheets')) return Promise.resolve([
        { id: 'ts1', startDate: thisMonday, status: 'SUBMITTED', totalHours: 35 }
      ]);
      if (url.includes('/time-entries')) return Promise.resolve([
        { id: 'te1', date: todayStr, hours: 8, projectId: 'p1', note: 'Sprint planning' }
      ]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText('EMPLOYEE')).toBeInTheDocument();
      expect(screen.getByText('Log Time')).toBeInTheDocument();
    });

    // Check stats and cards
    expect(screen.getByText('Recent Time Entries')).toBeInTheDocument();
    expect(screen.getByText('Recent Timesheets')).toBeInTheDocument();
    expect(screen.getByText(/Weekly Velocity/)).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders pending approvals for Manager role', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { 
        id: 'mgr1', 
        name: 'Bob Manager', 
        role: 'MANAGER', 
        roles: ['MANAGER'],
        employeeCode: 'MGR-001'
      },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url.includes('/approvals')) return Promise.resolve([
        { id: 'app1' }, { id: 'app2' }, { id: 'app3' }
      ]);
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
      expect(screen.getByText('MANAGER')).toBeInTheDocument();
      expect(screen.getAllByText('Pending Approvals').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Awaiting your review')).toBeInTheDocument();
    });
  });

  it('renders organization overview for Admin role', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { 
        id: 'adm1', 
        name: 'Carol Admin', 
        role: 'ADMIN', 
        roles: ['ADMIN'],
        employeeCode: 'ADM-001'
      },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/organizations/current') return Promise.resolve({
        id: 'org1',
        name: 'Sify Tech',
        organizationType: 'TECHNOLOGY',
      });
      if (url.includes('/employees?limit=1')) return Promise.resolve({
        meta: { total: 42 }
      });
      if (url.includes('/teams?limit=1')) return Promise.resolve({
        meta: { total: 8 }
      });
      return Promise.resolve(null);
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Carol/)).toBeInTheDocument();
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
      expect(screen.getByText('Sify Tech')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('renders all 5 architectural sections of the Final Admin Dashboard', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: { 
        id: 'adm-007', 
        name: 'Alex Administrator', 
        role: 'ADMIN', 
        roles: ['ADMIN'],
        employeeCode: 'ADM-007'
      },
      isLoading: false,
    });

    (apiClient as any).mockImplementation((url: string) => {
      if (url === '/organizations/current') {
        return Promise.resolve({
          id: 'org-sify',
          name: 'Sify Enterprise Cloud',
          organizationType: 'TECHNOLOGY',
        });
      }
      if (url.includes('/employees')) {
        return Promise.resolve({
          data: [
            { id: 'e1', name: 'Alice', isActive: true, teamId: 't1' },
            { id: 'e2', name: 'Bob', isActive: true, teamId: 't1' },
            { id: 'e3', name: 'Charlie', isActive: false, teamId: null },
          ],
          meta: { total: 3 }
        });
      }
      if (url.includes('/teams')) {
        return Promise.resolve({
          data: [
            { id: 't1', name: 'Core Eng', managerId: 'e1' },
            { id: 't2', name: 'DevOps Squad', managerId: null },
          ],
          meta: { total: 2 }
        });
      }
      if (url === '/projects') {
        return Promise.resolve([
          { id: 'p1', name: 'Quantum Core', status: 'ACTIVE', isActive: true },
          { id: 'p2', name: 'Cloud Migration', status: 'IN_PROGRESS', isActive: true },
          { id: 'p3', name: 'Legacy Archiving', status: 'COMPLETED', isActive: false },
        ]);
      }
      if (url.includes('/employee-invitations')) {
        return Promise.resolve([
          { id: 'inv1', email: 'newhire@sify.com', status: 'PENDING' },
          { id: 'inv2', email: 'contractor@sify.com', status: 'PENDING' },
        ]);
      }
      if (url.includes('/timesheets/approvals')) {
        return Promise.resolve([
          { id: 'ts-app-1', status: 'SUBMITTED' },
        ]);
      }
      if (url.includes('/tasks')) {
        return Promise.resolve([
          { id: 'task-overdue', title: 'Security review', dueDate: '2020-01-01T00:00:00Z', status: 'IN_PROGRESS', isActive: true },
          { id: 'task-future', title: 'Deploy update', dueDate: '2030-01-01T00:00:00Z', status: 'IN_PROGRESS', isActive: true },
        ]);
      }
      return Promise.resolve([]);
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // 1. Header
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sify Enterprise Cloud')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
      expect(screen.getByText('Invite Employee')).toBeInTheDocument();
      expect(screen.getByText('Create Team')).toBeInTheDocument();
      expect(screen.getByText('Create Project')).toBeInTheDocument();
    });

    // 2. Organization Snapshot
    expect(screen.getByText('Organization Snapshot')).toBeInTheDocument();
    expect(screen.getAllByText('Active Employees').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Active Teams')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('Pending Actions')).toBeInTheDocument();

    // 3. Needs Attention
    expect(screen.getByText('Needs Attention')).toBeInTheDocument();
    expect(screen.getByText('Pending Invitations')).toBeInTheDocument();
    expect(screen.getByText('Teams Without Manager')).toBeInTheDocument();
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('Overdue Project Work')).toBeInTheDocument();

    // 4. Workforce & Project Health
    expect(screen.getByText('Workforce Status')).toBeInTheDocument();
    expect(screen.getByText('Project Status')).toBeInTheDocument();

    // 5. Recent Activity
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Organization activity will appear here once system activity tracking is enabled.')).toBeInTheDocument();
  });

  it('displays friendly message when no employee is selected', async () => {
    (useCurrentEmployee as any).mockReturnValue({
      employee: null,
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('No User Profile Selected')).toBeInTheDocument();
  });
});

