import { useDevUser } from '../../context/DevUserContext';
import { env } from '../../config/env';

/**
 * DevUserSelector
 *
 * Displayed in the sidebar only when VITE_DEV_AUTH_BYPASS=true.
 * Allows the developer to select a real employee from the database
 * so all API calls are scoped to that employee's real data.
 *
 * NOT present in production builds (env flag must be explicitly enabled).
 */
export function DevUserSelector() {
  if (!env.VITE_DEV_AUTH_BYPASS) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { currentEmployee, allEmployees, currentRoles, setCurrentEmployeeId, setCurrentRoles, isLoading, error } = useDevUser();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const employee = allEmployees.find(emp => emp.id === selectedId);
    if (employee) {
      // Store org ID in session storage so apiClient can include it in headers
      sessionStorage.setItem('dev_employee_id', employee.id);
      sessionStorage.setItem('dev_org_id', employee.organizationId);
      setCurrentEmployeeId(employee.id);
      // Reload to refresh all data for the new employee context
      window.location.reload();
    }
  };

  return (
    <div className="mx-3 my-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Dev Mode</p>
      </div>

      {isLoading ? (
        <p className="text-xs text-amber-600">Loading employees...</p>
      ) : error ? (
        <div className="space-y-1">
          <p className="text-xs text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-xs bg-white border border-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : allEmployees.length === 0 ? (
        <p className="text-xs text-amber-600">No employees in DB</p>
      ) : (
        <>
          <p className="text-xs text-amber-600 mb-1">Current user:</p>
          <select
            value={currentEmployee?.id || ''}
            onChange={handleChange}
            className="w-full text-xs border border-amber-300 bg-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            <option value="">— Select Employee —</option>
            {allEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.employeeCode})
              </option>
            ))}
          </select>
          {currentEmployee && (
            <>
              <p className="text-xs text-amber-600 mt-1 truncate" title={currentEmployee.email}>
                {currentEmployee.email}
              </p>
              
              <p className="text-xs text-amber-600 mt-3 mb-1">Active Role:</p>
              <select
                value={currentRoles[0]}
                onChange={(e) => setCurrentRoles([e.target.value])}
                className="w-full text-xs border border-amber-300 bg-white rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </>
          )}
        </>
      )}
    </div>
  );
}
