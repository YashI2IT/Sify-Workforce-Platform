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
 * Validates and sanitizes a returnTo path for post-login navigation.
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
