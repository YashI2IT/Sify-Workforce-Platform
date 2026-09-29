import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

export function ReportsAndAnalytics() {
  const location = useLocation();
  const { employee } = useCurrentEmployee();
  
  if (location.pathname === '/reports' || location.pathname === '/reports/') {
    return <Navigate to="/reports/advanced-analytics" replace />;
  }

  const isManager = employee?.roles?.includes('MANAGER');

  const tabs = [
    { name: 'Advanced Analytics', path: '/reports/advanced-analytics', show: true },
    { name: 'Employee Summary', path: '/reports/employee-summary', show: isManager },
    { name: 'Team Utilization', path: '/reports/team-utilization', show: isManager },
    { name: 'Resource Allocation', path: '/reports/resource-allocation', show: isManager },
  ].filter(t => t.show);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 sm:px-8 pt-6">
          <h1 className="text-2xl font-bold text-slate-900 font-display">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Comprehensive insights, utilization metrics, and resource management.</p>
          
          <nav className="-mb-px flex space-x-6 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const isActive = location.pathname.startsWith(tab.path);
              return (
                <NavLink
                  key={tab.name}
                  to={tab.path}
                  className={() =>
                    `whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                      isActive
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`
                  }
                >
                  {tab.name}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
