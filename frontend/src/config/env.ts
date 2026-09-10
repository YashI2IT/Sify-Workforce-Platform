export const env = {
  VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  VITE_USER_MANAGEMENT_URL: import.meta.env.VITE_USER_MANAGEMENT_URL || 'http://localhost:3001/api',
  VITE_AUTH_APP_ID: import.meta.env.VITE_AUTH_APP_ID || 'Workforce',
  VITE_AUTH_ORG_ID: import.meta.env.VITE_AUTH_ORG_ID || 'ORG01',
  VITE_DEV_EMPLOYEE_ID: import.meta.env.VITE_DEV_EMPLOYEE_ID || '8093122c-a2b8-4c12-9c3f-42721a364a51', // Development fallback
};
