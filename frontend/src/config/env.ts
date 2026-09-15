export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  VITE_USER_MANAGEMENT_URL: import.meta.env.VITE_USER_MANAGEMENT_URL || 'http://localhost:3001/api',
  VITE_AUTH_APP_ID: import.meta.env.VITE_AUTH_APP_ID || 'project-management',

  /**
   * VITE_DEV_AUTH_BYPASS
   *
   * Development-only flag. Set to "true" in .env.local to bypass company
   * authentication during local development and demo phases.
   *
   * This MUST be false (or absent) in production deployments.
   * It will NEVER silently enable itself — it requires an explicit opt-in.
   *
   * PENDING COMPANY INTEGRATION: Remove this flag once Keycloak is wired up.
   */
  VITE_DEV_AUTH_BYPASS: import.meta.env.VITE_DEV_AUTH_BYPASS === 'true',
};
