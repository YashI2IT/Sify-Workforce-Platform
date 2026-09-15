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
  }
};

/**
 * IMPORTANT IDENTITY PLACEHOLDER
 * 
 * Returns the currently authenticated employee ID.
 * Since the User -> Employee mapping contract is currently unknown,
 * this safely blocks execution until the contract is defined.
 */
export function getCurrentEmployeeId(): string {
  // We cannot resolve the employee ID from the JWT or company response yet.
  // The system must block here instead of guessing.
  throw new Error('employee identity mapping unavailable');
}
