import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  determineLandingDestination,
  isRouteAllowedForRole,
  getEmployeeRoles,
  authStorage,
} from '../../../lib/authUtils';

describe('Role-Based Landing & Route Authorization (authUtils)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('determineLandingDestination', () => {
    it('sends pending invitation user to /invite/:token', () => {
      const destination = determineLandingDestination({
        employee: { id: 'emp-1', role: 'EMPLOYEE' },
        onboardingRequired: false,
        isInitialSetup: false,
        pendingInvitationToken: 'inv-token-123',
      });
      expect(destination).toBe('/invite/inv-token-123');
    });

    it('sends user without employee or with onboardingRequired to /onboarding', () => {
      const dest1 = determineLandingDestination({
        employee: null,
        onboardingRequired: true,
      });
      expect(dest1).toBe('/onboarding');

      const dest2 = determineLandingDestination({
        employee: null,
        onboardingRequired: false,
      });
      expect(dest2).toBe('/onboarding');

      const dest3 = determineLandingDestination({
        employee: { id: 'emp-1', role: 'EMPLOYEE' },
        onboardingRequired: true,
      });
      expect(dest3).toBe('/onboarding');
    });

    it('sends admin requiring initial setup to /setup', () => {
      const destination = determineLandingDestination({
        employee: { id: 'admin-1', role: 'ADMIN', roles: ['ADMIN'] },
        onboardingRequired: false,
        isInitialSetup: true,
      });
      expect(destination).toBe('/setup');
    });

    it('sends EMPLOYEE normal login to /dashboard', () => {
      const destination = determineLandingDestination({
        employee: { id: 'emp-1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] },
        onboardingRequired: false,
        isInitialSetup: false,
      });
      expect(destination).toBe('/dashboard');
    });

    it('sends MANAGER normal login to /dashboard', () => {
      const destination = determineLandingDestination({
        employee: { id: 'mgr-1', role: 'MANAGER', roles: ['MANAGER'] },
        onboardingRequired: false,
        isInitialSetup: false,
      });
      expect(destination).toBe('/dashboard');
    });

    it('sends ADMIN normal login (completed setup) to /dashboard', () => {
      const destination = determineLandingDestination({
        employee: { id: 'admin-1', role: 'ADMIN', roles: ['ADMIN'] },
        onboardingRequired: false,
        isInitialSetup: false,
      });
      expect(destination).toBe('/dashboard');
    });
  });

  describe('isRouteAllowedForRole', () => {
    const adminEmployee = { id: 'admin-1', role: 'ADMIN', roles: ['ADMIN'] };
    const managerEmployee = { id: 'mgr-1', role: 'MANAGER', roles: ['MANAGER'] };
    const staffEmployee = { id: 'staff-1', role: 'EMPLOYEE', roles: ['EMPLOYEE'] };

    it('allows dashboard for all roles, and reports for Admin & Manager', () => {
      expect(isRouteAllowedForRole('/dashboard', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/dashboard', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/dashboard', staffEmployee)).toBe(true);

      expect(isRouteAllowedForRole('/reports', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/reports', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/reports', staffEmployee)).toBe(false);
    });

    it('prevents ADMIN from landing on /time-entries, /timesheets, or /approvals', () => {
      expect(isRouteAllowedForRole('/time-entries', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/time-entries/123', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/timesheets', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/timesheets/123', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/approvals', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/approvals/timesheets/123', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/submission-approvals', adminEmployee)).toBe(false);
      expect(isRouteAllowedForRole('/team-timesheets', adminEmployee)).toBe(false);

      // But allowed for Employee and Manager where appropriate
      expect(isRouteAllowedForRole('/time-entries', staffEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/time-entries', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/timesheets', staffEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/timesheets', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/approvals', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/team-timesheets', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/submission-approvals', managerEmployee)).toBe(true);
    });

    it('prevents EMPLOYEE from accessing ADMIN-only or management routes', () => {
      const restrictedForEmployee = [
        '/organization',
        '/organization/settings',
        '/preferences',
        '/admin/audit-logs',
        '/admin/working-times',
        '/admin/public-holidays',
        '/employees',
        '/teams',
        '/admin/projects',
        '/approvals',
        '/submission-approvals',
        '/settings/timesheets',
        '/setup',
      ];
      for (const route of restrictedForEmployee) {
        expect(isRouteAllowedForRole(route, staffEmployee)).toBe(false);
      }
    });

    it('prevents MANAGER from accessing ADMIN-only organization or system routes', () => {
      const adminOnlyRoutes = [
        '/organization',
        '/organization/settings',
        '/organization/overview',
        '/preferences',
        '/admin/audit-logs',
        '/admin/working-times',
        '/admin/public-holidays',
        '/settings/timesheets',
        '/setup',
      ];
      for (const route of adminOnlyRoutes) {
        expect(isRouteAllowedForRole(route, managerEmployee)).toBe(false);
      }

      // But MANAGER can access management & approval routes
      expect(isRouteAllowedForRole('/employees', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/teams', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/approvals', managerEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/submission-approvals', managerEmployee)).toBe(true);
    });

    it('allows ADMIN to access organization, system, and management routes', () => {
      expect(isRouteAllowedForRole('/organization', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/organization/settings', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/admin/audit-logs', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/admin/working-times', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/admin/public-holidays', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/settings/timesheets', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/employees', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/teams', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/admin/projects', adminEmployee)).toBe(true);
      expect(isRouteAllowedForRole('/setup', adminEmployee)).toBe(true);
    });
  });

  describe('authStorage.clear cross-user cleanup', () => {
    it('clears all session and local storage tokens, org ID, and cached keys', () => {
      localStorage.setItem('access_token', 'token-1');
      localStorage.setItem('refresh_token', 'token-2');
      localStorage.setItem('org_id', 'org-1');
      localStorage.setItem('cached_org_name', 'Org 1');
      localStorage.setItem('last_project_id', 'proj-1');
      localStorage.setItem('last_task_id', 'task-1');
      localStorage.setItem('last_activity_id', 'act-1');
      sessionStorage.setItem('pending_invitation_token', 'inv-1');
      sessionStorage.setItem('dev_employee_id', 'emp-1');
      sessionStorage.setItem('dev_org_id', 'org-1');
      sessionStorage.setItem('dev_roles', '["ADMIN"]');

      authStorage.clear();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('org_id')).toBeNull();
      expect(localStorage.getItem('cached_org_name')).toBeNull();
      expect(localStorage.getItem('last_project_id')).toBeNull();
      expect(localStorage.getItem('last_task_id')).toBeNull();
      expect(localStorage.getItem('last_activity_id')).toBeNull();
      expect(sessionStorage.getItem('pending_invitation_token')).toBeNull();
      expect(sessionStorage.getItem('dev_employee_id')).toBeNull();
      expect(sessionStorage.getItem('dev_org_id')).toBeNull();
      expect(sessionStorage.getItem('dev_roles')).toBeNull();
    });
  });

  describe('getEmployeeRoles', () => {
    it('extracts roles array if present', () => {
      expect(getEmployeeRoles({ roles: ['admin', 'manager'] })).toEqual(['ADMIN', 'MANAGER']);
    });

    it('extracts role string if roles array not present', () => {
      expect(getEmployeeRoles({ role: 'employee' })).toEqual(['EMPLOYEE']);
    });

    it('returns empty array if no employee or roles', () => {
      expect(getEmployeeRoles(null)).toEqual([]);
      expect(getEmployeeRoles({})).toEqual([]);
    });
  });
});
