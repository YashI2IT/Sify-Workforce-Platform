export const authStorage = {
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  getOrgId: () => localStorage.getItem('org_id'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },
  setOrgId: (orgId: string) => {
    localStorage.setItem('org_id', orgId);
  },
  clear: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('org_id');
    localStorage.removeItem('cached_org_name');
    localStorage.removeItem('last_project_id');
    localStorage.removeItem('last_task_id');
    localStorage.removeItem('last_activity_id');
    try {
      sessionStorage.removeItem('pending_invitation_token');
      sessionStorage.removeItem('dev_employee_id');
      sessionStorage.removeItem('dev_org_id');
      sessionStorage.removeItem('dev_roles');
    } catch {
      // Ignore sessionStorage exceptions if restricted
    }
  }
};

/**
 * Normalizes roles from an employee object into an array of uppercase role strings.
 */
export function getEmployeeRoles(employee: any): string[] {
  if (!employee) return [];
  if (Array.isArray(employee.roles) && employee.roles.length > 0) {
    return employee.roles.map((r: any) => String(r).toUpperCase());
  }
  if (employee.role) {
    return [String(employee.role).toUpperCase()];
  }
  return [];
}

/**
 * Determines the authoritative post-login landing destination based on
 * the newly authenticated employee's status and role.
 *
 * Requirements:
 * 1. Pending invitations retain their invitation flow (/invite/:token).
 * 2. Onboarding-required users go to /onboarding.
 * 3. Administrator requiring initial organization setup goes to /setup.
 * 4. Normal successful login for ADMIN, MANAGER, and EMPLOYEE lands on /dashboard.
 */
export function determineLandingDestination({
  employee,
  onboardingRequired,
  isInitialSetup,
  pendingInvitationToken,
}: {
  employee?: any | null;
  onboardingRequired?: boolean;
  isInitialSetup?: boolean;
  pendingInvitationToken?: string | null;
}): string {
  if (pendingInvitationToken) {
    return `/invite/${pendingInvitationToken}`;
  }
  if (onboardingRequired || !employee) {
    return '/onboarding';
  }
  if (isInitialSetup) {
    return '/setup';
  }
  // Normal successful login for ADMIN, MANAGER, and EMPLOYEE must land on /dashboard
  return '/dashboard';
}

/**
 * Verifies whether a given protected path is accessible to the current employee role.
 * Used by ProtectedRoute to ensure an employee's old page (e.g. /time-entries)
 * is never rendered for an ADMIN or unauthorized role after an account switch.
 */
export function isRouteAllowedForRole(pathname: string, employee: any): boolean {
  if (!employee) return false;
  const roles = getEmployeeRoles(employee);
  const isAdmin = roles.includes('ADMIN');
  const isManager = roles.includes('MANAGER');
  const isEmployee = roles.includes('EMPLOYEE');

  // Strip query/hash and ensure leading slash
  const cleanPath = (pathname || '/').split('?')[0].split('#')[0];

  // Common routes accessible to all authenticated roles
  if (cleanPath === '/dashboard') {
    return true;
  }

  // Reports route is accessible to ADMIN and MANAGER roles
  if (cleanPath.startsWith('/reports')) {
    return isAdmin || isManager;
  }

  // Admin-only routes
  if (
    cleanPath.startsWith('/organization') ||
    cleanPath === '/preferences' ||
    cleanPath === '/admin/audit-logs' ||
    cleanPath === '/admin/working-times' ||
    cleanPath === '/admin/public-holidays' ||
    cleanPath.startsWith('/admin/work-calendar') ||
    cleanPath === '/settings/timesheets'
  ) {
    return isAdmin;
  }

  // Setup is only accessible for ADMIN during initial setup
  if (cleanPath === '/setup') {
    return isAdmin;
  }

  // Admin & Manager management routes
  if (
    cleanPath.startsWith('/employees') ||
    cleanPath.startsWith('/teams') ||
    cleanPath.startsWith('/admin/projects') ||
    cleanPath === '/projects/onboarding'
  ) {
    return isAdmin || isManager;
  }

  // Timesheet approvals are for Manager only (Admin must not access approvals)
  if (
    cleanPath.startsWith('/approvals') ||
    cleanPath === '/submission-approvals' ||
    cleanPath.startsWith('/team-timesheets')
  ) {
    return !isAdmin && isManager;
  }

  // Personal timesheets are for Employee and Manager only (Admin must not access personal timesheets)
  if (cleanPath === '/timesheets' || cleanPath.startsWith('/timesheets/')) {
    return !isAdmin && (isEmployee || isManager);
  }

  // Time entries is only for Employee and Manager (Admin must not land on /time-entries)
  if (cleanPath === '/time-entries' || cleanPath.startsWith('/time-entries/')) {
    return !isAdmin && (isEmployee || isManager);
  }

  // My Projects is for Employee and Manager (Admin uses /admin/projects)
  if (cleanPath === '/projects' || (cleanPath.startsWith('/projects/') && cleanPath !== '/projects/onboarding')) {
    return !isAdmin && (isEmployee || isManager);
  }

  return true;
}

/**
 * Validates and sanitizes a returnTo path for safe redirection.
 * Only allows safe internal relative paths (e.g. /projects/123).
 * Rejects external URLs, protocol-relative paths (//evil.com), and dangerous schemes.
 */
export function sanitizeReturnTo(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') {
    return '/dashboard';
  }

  const trimmed = path.trim();

  // Must begin with a single slash and not double slash
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/dashboard';
  }

  // Reject backslashes which some browsers normalize to forward slashes
  if (trimmed.includes('\\')) {
    return '/dashboard';
  }

  // Reject colon before query/hash to prevent pseudo-schemes
  const pathWithoutQuery = trimmed.split('?')[0].split('#')[0];
  if (pathWithoutQuery.includes(':')) {
    return '/dashboard';
  }

  return trimmed;
}
