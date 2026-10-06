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
  Settings
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
        { name: 'Organization', path: '/organization', icon: Building },
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
        { name: 'Pending Approvals', path: '/approvals', icon: CheckSquare, roles: ['MANAGER'] },
      ]
    },
    {
      title: 'Reports',
      items: [
        { name: 'Reports', path: '/reports', icon: TrendingUp, roles: ['EMPLOYEE', 'MANAGER'] },
      ]
    },
    {
      title: 'Settings',
      items: [
        { name: 'Timesheet Settings', path: '/settings/timesheets', icon: Clock, roles: ['MANAGER'] },
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
    if (itemPath === '/organization') {
      return currentPath === '/organization' || currentPath === '/organization/overview';
    }
    if (itemPath === '/organization/settings') {
      return currentPath === '/organization/settings' || currentPath === '/organization/profile';
    }

    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  const currentGroup = visibleGroups.find(g => g.items.some(item => isItemActive(item.path)));
  const currentNav = currentGroup?.items.find(item => isItemActive(item.path));

  const getSectionTitle = () => {
    if (!currentGroup?.title) {
      return 'Platform';
    }
    const t = currentGroup.title.trim();
    if (t === t.toUpperCase()) {
      return t.charAt(0) + t.slice(1).toLowerCase();
    }
    return t;
  };
  const sectionTitle = getSectionTitle();

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
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#F9FBFC] border-r border-slate-200/60 flex flex-col transition-transform duration-200 ease-in-out shadow-xs ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-[68px] flex items-center justify-between px-6 border-b border-slate-200/80 shrink-0 bg-transparent">
          <Link to="/dashboard" className="flex items-center gap-3.5 group">
            <div className="w-[38px] h-[38px] rounded-[14px] bg-[#12161F] text-white flex items-center justify-center shadow-xs relative transition-transform group-hover:scale-105">
              <span className="font-sans tracking-[0.15em] font-bold text-white text-[11px] ml-0.5">SW</span>
              <span className="absolute -top-0.5 -right-0.5 w-[11px] h-[11px] rounded-full bg-[#4ade80] border-[2.5px] border-[#F9FBFC]" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-[#12161F] tracking-tight font-sans block leading-none mb-1">
                Sify Workforce
              </span>
              <span className="text-[9px] font-sans text-[#8ba2be] tracking-[0.15em] uppercase font-bold block leading-none">
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
        <nav className="flex-1 px-3.5 py-3 space-y-2.5 overflow-y-auto sidebar-scrollbar">
          {visibleGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-1">
              {group.title && (
                <div className="px-3 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-[#8ba2be] uppercase tracking-wider font-sans">
                    {group.title}
                  </p>
                </div>
              )}
              <div className="space-y-1 mt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isItemActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileNav}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[14.5px] transition-all duration-300 ease-out font-sans ${
                        isActive
                          ? 'bg-[#12161F] shadow-sm text-white font-medium'
                          : 'text-[#1e3a5f] hover:bg-slate-100/70 hover:text-[#12161F] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Icon className={`w-[20px] h-[20px] shrink-0 transition-colors duration-300 ${
                          isActive ? 'text-white' : 'text-[#1e3a5f] group-hover:text-[#12161F]'
                        }`} strokeWidth={1.75} />
                        <span className="truncate tracking-tight">{item.name}</span>
                      </div>
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
        <header className="h-[68px] bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden text-[#1e3a5f] hover:bg-slate-100 p-1.5 -ml-1 rounded-xl cursor-pointer transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
            <div className="flex items-center gap-2.5 text-[13.5px]">
              <span className="text-[#8ba2be] font-medium font-sans">{sectionTitle}</span>
              {currentNav?.name && currentNav.name.toLowerCase() !== sectionTitle.toLowerCase() && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" strokeWidth={2.5} />
                  <span className="font-bold text-[#12161F] font-sans">{currentNav.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationsMenu />
            
            {employee && (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 px-1.5 py-1.5 sm:px-2.5 sm:py-2 bg-white hover:bg-slate-50 border border-[#e2e8f0] rounded-full transition-colors cursor-pointer"
                >
                  <div className="w-[26px] h-[26px] rounded-full bg-[#12161F] text-white font-sans font-bold text-[10px] flex items-center justify-center tracking-wider">
                    {getInitials(employee.name)}
                  </div>
                  <span className="font-bold text-[#12161F] font-sans pr-1.5 text-[13.5px] hidden sm:inline leading-none pt-0.5">{employee.name.split(' ')[0]}</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-dropdown">
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

                    <div className="border-t border-slate-100">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2.5 px-4 py-3 w-full text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Scrollable Page Outlet with Smooth Transition */}
        <main className="flex-1 overflow-hidden bg-slate-50/50 relative">
          <div id="main-scroll-container" key={location.pathname} className="animate-pageTransition absolute inset-0 overflow-auto">
            <Outlet />
          </div>
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
