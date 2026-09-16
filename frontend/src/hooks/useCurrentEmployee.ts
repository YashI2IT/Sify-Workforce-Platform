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
import { useDevUser } from '../context/DevUserContext';
import { env } from '../config/env';

export interface CurrentEmployee {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  employeeCode: string;
  teamId: string | null;
  roles: string[];
}

export function useCurrentEmployee(): { employee: CurrentEmployee | null; isLoading: boolean; error: string | null } {
  if (env.VITE_DEV_AUTH_BYPASS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { currentEmployee, currentRoles, isLoading, error } = useDevUser();
    
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const employee = useMemo(() => {
      return currentEmployee ? { ...currentEmployee, roles: currentRoles } : null;
    }, [currentEmployee, currentRoles]);

    return { employee, isLoading, error };
  }

  // PRODUCTION: PENDING company Keycloak/JWT integration
  // The employee identity will be decoded from the JWT and resolved
  // against the User Management Service once the contract is confirmed.
  // Do not guess the claims structure here.
  return { employee: null, isLoading: false, error: null };
}
