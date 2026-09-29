import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { apiSlice, useGetMyPreferencesQuery } from '../../store/apiSlice';
import { authService } from '../../services/authService';
import { authStorage } from '../../lib/authUtils';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { env } from '../../config/env';
import { 
  CheckSquare, 
  Users, 
  UsersRound, 
  Menu, 
  X, 
  ChevronRight,
  Building,
  SlidersHorizontal,
  ShieldAlert,
  User,
  PieChart, 
  TrendingUp, 
  LayoutDashboard, 
  Briefcase, 
  Clock, 
  CalendarDays, 
  LogOut,
  Settings,
  ClipboardCheck
} from 'lucide-react';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileModal } from './ProfileModal';

export const AppLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { employee } = useCurrentEmployee();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { data: preferences } = useGetMyPreferencesQuery();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  useEffect(() => {
    const applyTheme = (theme: string) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // system
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    if (preferences?.theme) {
      applyTheme(preferences.theme);
    }
    
    // Listen for system theme changes if set to system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (preferences?.theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences?.theme]);

  const handleLogout = async () => {
    try {
      const token = authStorage.getRefreshToken();
      if (token) {
        await authService.logout(token).catch(() => {});
      }
    } finally {
      authStorage.clear();
      dispatch(apiSlice.util.resetApiState());
      dispatch(logout());
      navigate('/login', { replace: true });
    }
  };

  const isAdmin = Boolean(employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN');

  // Final Admin sidebar navigation structure
  const adminNavigationGroups = [
    {
      title: null,
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'ORGANIZATION',
      items: [
        { name: 'Overview', path: '/organization/overview', icon: Building },
        { name: 'Settings', path: '/organization/settings', icon: SlidersHorizontal },
      ]
    },
    {
      title: 'WORKFORCE',
      items: [
        { name: 'Employees', path: '/employees', icon: Users },
        { name: 'Teams', path: '/teams', icon: UsersRound },
        { name: 'Projects', path: '/admin/projects', icon: Briefcase },
        { name: 'Reports', path: '/reports', icon: PieChart },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Working Times', path: '/admin/working-times', icon: Clock },
        { name: 'Public Holidays', path: '/admin/public-holidays', icon: CalendarDays },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldAlert },
        { name: 'Preferences', path: '/preferences', icon: Settings },
      ]
    }
  ];

  // Preserved standard navigation for non-admin roles (Employee, Manager)
  const standardNavigationGroups = [
    {
      title: null,
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER'] }
      ]
    },
    {
      title: 'My Work',
      items: [
        { name: 'My Projects', path: '/projects', icon: Briefcase, roles: ['EMPLOYEE', 'MANAGER'] },
        { name: 'Time Entries', path: '/time-entries', icon: Clock, roles: ['EMPLOYEE', 'MANAGER'] },
        { name: 'My Timesheets', path: '/timesheets', icon: CalendarDays, roles: ['EMPLOYEE', 'MANAGER'] },
      ]
    },
    {
      title: 'Management',
      items: [
        { name: 'Employees', path: '/employees', icon: Users, roles: ['MANAGER'] },
        { name: 'Teams', path: '/teams', icon: UsersRound, roles: ['MANAGER'] },
        { name: 'Projects', path: '/admin/projects', icon: Briefcase, roles: ['MANAGER'] },
      ]
    },
    {
      title: 'Approvals',
      items: [
        { name: 'Timesheet Approvals', path: '/approvals', icon: CheckSquare, roles: ['MANAGER'] },
        { name: 'Entry Approvals', path: '/submission-approvals', icon: ClipboardCheck, roles: ['MANAGER', 'ADMIN'] },
      ]
    },
    {
      title: 'Reports',
      items: [
        { name: 'REPORTS & ANALYTICS', path: '/reports', icon: TrendingUp, roles: ['EMPLOYEE', 'MANAGER'] },
      ]
    },
    {
      title: 'Settings',
      items: [
        { name: 'Timesheet Settings', path: '/settings/timesheets', icon: Clock, roles: ['MANAGER'] },
        { name: 'Preferences', path: '/preferences', icon: Settings, roles: ['EMPLOYEE', 'MANAGER'] },
      ]
    }
  ];

  const hasRole = (roles?: string[]) => !roles || !employee?.roles || roles.some(r => employee.roles.includes(r));

  const visibleGroups = isAdmin
    ? adminNavigationGroups
    : standardNavigationGroups.map(group => ({
        ...group,
        items: group.items.filter(item => hasRole(item.roles))
      })).filter(group => group.items.length > 0);

  const isItemActive = (itemPath: string) => {
    const currentPath = location.pathname;
    if (itemPath === '/dashboard') {
      return currentPath === '/dashboard';
    }

    // Projects active check: keeps Projects highlighted for nested project workspace routes
    if (itemPath === '/admin/projects') {
      return currentPath.startsWith('/admin/projects');
    }
    if (itemPath === '/projects') {
      return currentPath.startsWith('/projects');
    }

    // Reports active check: only /reports root highlights for everything. Sub-reports rely on exact match below.
    if (itemPath === '/reports') {
      return currentPath.startsWith('/reports');
    }

    // Organization active checks
    if (itemPath === '/organization/overview') {
      return currentPath === '/organization' || currentPath === '/organization/overview';
    }
    if (itemPath === '/organization/settings') {
      return currentPath === '/organization/settings' || currentPath === '/admin/working-times' || currentPath === '/admin/public-holidays';
    }

    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  const currentNav = visibleGroups.flatMap(g => g.items).find(item => isItemActive(item.path));

  const closeMobileNav = () => setMobileNavOpen(false);

  const getInitials = (name?: string) => {
    if (!name) return 'SW';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex h-screen bg-[#f6f7f8] overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      {/* Enterprise Executive Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white/60 backdrop-blur-xl border-r border-slate-200/60 flex flex-col transition-transform duration-200 ease-in-out shadow-xs ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/60 shrink-0 bg-transparent">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-xs shadow-xs border border-slate-800 shrink-0 relative transition-transform group-hover:scale-105">
              <span className="font-mono tracking-wider font-extrabold text-white text-xs">SW</span>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-slate-950 tracking-tight font-display block leading-tight">
                Sify Workforce
              </span>
              <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase font-semibold block mt-0.5">
                Enterprise OS
              </span>
            </div>
          </Link>
          <button
            onClick={closeMobileNav}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3.5 space-y-4 overflow-y-auto">
          {visibleGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              {group.title && (
                <div className="px-3 pt-2 pb-1 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    {group.title}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileNav}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-white shadow-sm border border-slate-200/60 text-slate-900 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${
                          isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                        }`} />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 shadow-xs" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        {env.VITE_DEV_AUTH_BYPASS && (
          <div className="p-3.5 border-t border-slate-200/80 shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/60 rounded-xl border border-amber-200/70 text-xs text-amber-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate font-medium text-[11px]">Active Context: {employee?.name || 'Dev User'}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-sm sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-800 p-1.5 -ml-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <span className="text-slate-400 font-medium">Workforce</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="font-bold text-slate-900 font-display">{currentNav?.name || 'Platform'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsMenu />
            
            {employee && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 px-2 py-1 sm:px-3 sm:py-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full text-xs text-slate-700 shadow-xs transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-950 text-white font-mono font-bold text-[10px] sm:text-xs flex items-center justify-center">
                    {getInitials(employee.name)}
                  </div>
                  <span className="font-semibold text-slate-900 hidden sm:inline">{employee.name.split(' ')[0]}</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-sm font-bold text-slate-900 truncate">{employee.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200/70 text-slate-700">
                          {employee.role || employee.roles?.[0] || 'EMPLOYEE'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 truncate">
                          {employee.employeeCode}
                        </span>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          setProfileModalOpen(true);
                        }}
                        className="flex items-center gap-2.5 px-4 py-2 w-full text-left text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        Profile Settings
                      </button>
                      <Link
                        to="/preferences"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        Preferences
                      </Link>
                    </div>

                    <div className="py-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2.5 px-4 py-2 w-full text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Outlet */}
        <main className="flex-1 overflow-auto bg-slate-50/50">
          <Outlet />
        </main>
      </div>
      
      {employee && (
        <ProfileModal 
          isOpen={profileModalOpen} 
          onClose={() => setProfileModalOpen(false)} 
        />
      )}
    </div>
  );
};
