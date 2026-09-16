/**
 * DEV USER CONTEXT
 *
 * Provides a development-mode employee identity selector.
 * ONLY active when VITE_DEV_AUTH_BYPASS=true.
 *
 * This is NOT production authentication.
 * The company User Management Service / Keycloak integration
 * will replace this in the final project phase.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiClient } from '../lib/apiClient';

export interface DevEmployee {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  organizationId: string;
  teamId: string | null;
  isActive: boolean;
}

interface DevUserContextValue {
  currentEmployee: DevEmployee | null;
  allEmployees: DevEmployee[];
  currentRoles: string[];
  setCurrentEmployeeId: (id: string) => void;
  setCurrentRoles: (roles: string[]) => void;
  isLoading: boolean;
  error: string;
}

const DevUserContext = createContext<DevUserContextValue | null>(null);

export function DevUserProvider({ children }: { children: ReactNode }) {
  const [allEmployees, setAllEmployees] = useState<DevEmployee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>(() => {
    return sessionStorage.getItem('dev_employee_id') || '';
  });
  const [currentRoles, setCurrentRolesState] = useState<string[]>(() => {
    const r = sessionStorage.getItem('dev_roles');
    return r ? r.split(',') : ['EMPLOYEE'];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      // Fetch all employees via the dev-only bootstrap endpoint
      // This endpoint is only available when the backend is in dev mode
      const data = await apiClient('/dev/employees');
      const employees = Array.isArray(data) ? data : (data?.data ?? []);
      setAllEmployees(employees);

      // Auto-select first employee if none selected
      if (!currentEmployeeId && employees.length > 0) {
        const first = employees[0];
        setCurrentEmployeeId(first.id);
        sessionStorage.setItem('dev_employee_id', first.id);
        sessionStorage.setItem('dev_org_id', first.organizationId);
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('Backend unavailable — start the API server on port 3000.');
      } else {
        setError(err.message || 'Failed to load employees for dev selector');
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleSetEmployee = (id: string) => {
    setCurrentEmployeeId(id);
    sessionStorage.setItem('dev_employee_id', id);
    const emp = allEmployees.find(e => e.id === id);
    if (emp) {
      sessionStorage.setItem('dev_org_id', emp.organizationId);
    }
  };

  const handleSetRoles = (roles: string[]) => {
    setCurrentRolesState(roles);
    sessionStorage.setItem('dev_roles', roles.join(','));
    window.location.reload();
  };

  const currentEmployee = allEmployees.find(e => e.id === currentEmployeeId) ?? null;

  return (
    <DevUserContext.Provider value={{ currentEmployee, allEmployees, currentRoles, setCurrentEmployeeId: handleSetEmployee, setCurrentRoles: handleSetRoles, isLoading, error }}>
      {children}
    </DevUserContext.Provider>
  );
}

export function useDevUser(): DevUserContextValue {
  const ctx = useContext(DevUserContext);
  if (!ctx) throw new Error('useDevUser must be used within DevUserProvider');
  return ctx;
}
