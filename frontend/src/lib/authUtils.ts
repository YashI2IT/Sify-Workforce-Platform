import { env } from '../config/env';

/**
 * IMPORTANT IDENTITY PLACEHOLDER
 * 
 * Because the actual User Management Service identity mapping is not yet confirmed,
 * this function isolates the current employee identity.
 * 
 * Replace this once the company auth contract is confirmed and backend mapping is available.
 */
export function getCurrentEmployeeId(): string {
  // TODO: Replace with actual mapping from authenticated JWT/backend once confirmed
  return env.VITE_DEV_EMPLOYEE_ID; // Placeholder driven by config
}
