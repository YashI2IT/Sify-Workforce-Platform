import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { DevUserSelector } from '../dev/DevUserSelector';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { env } from '../../config/env';
import { CheckSquare, Users, UsersRound, Menu, X, ChevronRight, UserCircle2,
  Building, PieChart, BarChart3, TrendingUp, Clock4,
  LayoutDashboard, Briefcase, Clock, CalendarDays, LogOut
} from 'lucide-react';

export const AppLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { employee } = useCurrentEmployee();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('refresh_token');
      if (token) {
        await authService.logout(token);
      }
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
    { name: 'My Projects', path: '/projects', icon: Briefcase, roles: ['EMPLOYEE'] },
    { name: 'Time Entries', path: '/time-entries', icon: Clock, roles: ['EMPLOYEE'] },
    { name: 'My Timesheets', path: '/timesheets', icon: CalendarDays, roles: ['EMPLOYEE'] },
    
    { name: 'Approvals', path: '/approvals', icon: CheckSquare, roles: ['MANAGER'] },
    
    { name: 'Organization', path: '/organization', icon: Building, roles: ['ADMIN'] },
    { name: 'Employees', path: '/employees', icon: Users, roles: ['ADMIN'] },
    { name: 'Teams', path: '/teams', icon: UsersRound, roles: ['ADMIN'] },
    { name: 'All Projects', path: '/admin/projects', icon: Briefcase, roles: ['ADMIN'] },
  ];

  const reportItems = [
    { name: 'Employee Summary', path: '/reports/employee-summary', icon: PieChart, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
    { name: 'Manager Dashboard', path: '/reports/manager-dashboard', icon: BarChart3, roles: ['MANAGER'] },
    { name: 'Team Utilization', path: '/reports/team-utilization', icon: TrendingUp, roles: ['MANAGER'] },
    { name: 'Project Hours', path: '/reports/project-hours', icon: Clock4, roles: ['ADMIN'] },
    { name: 'Project Analysis', path: '/reports/project-analysis', icon: PieChart, roles: ['ADMIN'] },
  ];

  const currentNav = [...navItems, ...reportItems].find(item => 
    location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
  );

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r flex flex-col transition-transform duration-200 ease-in-out ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              SW
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">Sify Workforce</span>
          </div>
          <button
            onClick={closeMobileNav}
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dev Mode Selector */}
        {env.VITE_DEV_AUTH_BYPASS && <DevUserSelector />}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Main Navigation */}
          {navItems.filter(item => !employee?.roles || item.roles.some(r => employee.roles.includes(r))).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileNav}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}

          {/* Reports */}
          {reportItems.filter(item => !employee?.roles || item.roles.some(r => employee.roles.includes(r))).length > 0 && (
            <>
              <p className="px-3 pt-6 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Reports</p>
              {reportItems.filter(item => !employee?.roles || item.roles.some(r => employee.roles.includes(r))).map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={closeMobileNav}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t flex-shrink-0">
          {!env.VITE_DEV_AUTH_BYPASS && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}
          {env.VITE_DEV_AUTH_BYPASS && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/60 rounded border border-amber-100 text-xs text-amber-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="truncate">Active Context: {employee?.name || 'Dev User'}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b px-4 sm:px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-1.5 -ml-1 rounded-md hover:bg-gray-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="text-gray-400 font-medium">Workforce</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-800">{currentNav?.name || 'Platform'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {employee && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border rounded-full text-xs text-gray-700">
                <UserCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium hidden sm:inline">{employee.name}</span>
                <span className="text-gray-400 hidden lg:inline">({employee.employeeCode})</span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Outlet */}
        <main className="flex-1 overflow-auto bg-gray-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

