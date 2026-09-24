/**
 * useCurrentEmployee
 *
 * Single abstraction for current employee identity.
 *
 * In development mode (VITE_DEV_AUTH_BYPASS=true):
 *   Returns the developer-selected employee from DevUserContext.
 *
 * In production:
 *   Returns identity resolved from the company UMS token.
 *   PENDING: company Keycloak/JWT contract is not yet available.
 */
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

export interface CurrentEmployee {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  employeeCode: string;
  teamId: string | null;
  roles: string[];
  role: string;
}

export function useCurrentEmployee(): { employee: CurrentEmployee | null; isLoading: boolean; error: string | null } {
  const employeeData = useSelector((state: RootState) => state.auth.employee);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const employee = useMemo(() => {
    if (!employeeData) return null;
    
    // Normalize role string into roles array for the frontend if not already present
    const roles = Array.isArray(employeeData.roles) 
      ? employeeData.roles 
      : (employeeData.role ? [employeeData.role] : []);
      
    return { ...employeeData, roles };
  }, [employeeData]);

  // If we are authenticated but have no employee data yet, we might be loading/bootstrapping
  const isLoading = isAuthenticated && !employee;

  return { employee, isLoading, error: null };
}
