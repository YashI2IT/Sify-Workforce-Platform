import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { 
  apiSlice, 
  useGetMyPreferencesQuery 
} from '../../store/apiSlice';
import { authService } from '../../services/authService';
import { authStorage } from '../../lib/authUtils';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { env } from '../../config/env';
import { 
  CheckSquare, 
  Users, 
  UsersRound, 
  UserCheck,
  FolderKanban,
  Menu, 
  X, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  Search,
  Building,
  ShieldAlert,
  PieChart, 
  TrendingUp, 
  LayoutDashboard, 
  Briefcase, 
  Clock, 
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileModal } from './ProfileModal';
import { UserProfileMenu } from './UserProfileMenu';
import { GlobalSearchPalette } from './GlobalSearchPalette';

export const AppLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { employee } = useCurrentEmployee();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  
  // Sidebar collapsed state with localStorage persistence
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('sify_sidebar_collapsed') === 'true';
    }
    return false;
  });

  // Collapsible section states for expanded sidebar mode
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Quick jump search palette state
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: preferences } = useGetMyPreferencesQuery();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('sify_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Keyboard shortcut listeners (Ctrl+B for sidebar, Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);



  // Reset workspace scroll container position immediately on page navigation
  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      if (typeof container.scrollTo === 'function') {
        container.scrollTo({ top: 0, behavior: 'instant' });
      } else {
        container.scrollTop = 0;
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    const applyTheme = (theme: string) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // system
        if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
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
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (preferences?.theme === 'system') {
          applyTheme('system');
        }
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
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

  // Final Admin sidebar navigation structure (refined for clarity and familiar business language)
  const adminNavigationGroups = [
    {
      id: 'main',
      title: null,
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      id: 'people-teams',
      title: 'PEOPLE & TEAMS',
      items: [
        { name: 'Employees', path: '/employees', icon: Users },
        { name: 'Teams', path: '/teams', icon: UsersRound },
      ]
    },
    {
      id: 'projects-reports',
      title: 'PROJECTS & REPORTS',
      items: [
        { name: 'Projects', path: '/admin/projects', icon: Briefcase },
        { name: 'Reports', path: '/reports', icon: PieChart },
      ]
    },
    {
      id: 'company',
      title: 'COMPANY',
      items: [
        { name: 'Organization', path: '/organization', icon: Building },
        { name: 'Work Calendar', path: '/admin/work-calendar', icon: CalendarRange },
        { name: 'Activity History', path: '/admin/audit-logs', icon: ShieldAlert },
      ]
    }
  ];

  // Preserved standard navigation for non-admin roles (Employee, Manager)
  const standardNavigationGroups = [
    {
      id: 'main',
      title: null,
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER'] }
      ]
    },
    {
      id: 'my-work',
      title: 'My Work',
      items: [
        { name: 'My Projects', path: '/projects', icon: Briefcase, roles: ['EMPLOYEE', 'MANAGER'] },
        { name: 'Time Entries', path: '/time-entries', icon: Clock, roles: ['EMPLOYEE', 'MANAGER'] },
      ]
    },
    {
      id: 'timesheets',
      title: 'Timesheets',
      items: [
        { name: 'My Timesheets', path: '/timesheets', icon: CalendarDays, roles: ['EMPLOYEE', 'MANAGER'] },
        { name: 'Team Timesheets', path: '/team-timesheets', icon: UserCheck, roles: ['MANAGER'] },
        { name: 'Pending Approvals', path: '/approvals', icon: CheckSquare, roles: ['MANAGER'] },
      ]
    },
    {
      id: 'management',
      title: 'Management',
      items: [
        { name: 'Employees', path: '/employees', icon: Users, roles: ['MANAGER'] },
        { name: 'Teams', path: '/teams', icon: UsersRound, roles: ['MANAGER'] },
        { name: 'Projects', path: '/admin/projects', icon: FolderKanban, roles: ['MANAGER'] },
      ]
    },
    {
      id: 'reports',
      title: 'Reports',
      items: [
        { name: 'Reports', path: '/reports', icon: TrendingUp, roles: ['MANAGER'] },
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

    // Team Timesheets active check
    if (itemPath === '/team-timesheets') {
      return currentPath.startsWith('/team-timesheets');
    }

    // My Timesheets active check: match /timesheets and subpaths except /team-timesheets
    if (itemPath === '/timesheets') {
      return (currentPath === '/timesheets' || currentPath.startsWith('/timesheets/')) && !currentPath.startsWith('/team-timesheets');
    }

    // Approvals active check: matches /approvals and /approvals/timesheets/:id
    if (itemPath === '/approvals') {
      return currentPath.startsWith('/approvals');
    }

    // Projects active check: keeps Projects highlighted for nested project workspace routes
    if (itemPath === '/admin/projects') {
      return currentPath.startsWith('/admin/projects');
    }
    if (itemPath === '/projects') {
      return currentPath.startsWith('/projects') && !currentPath.startsWith('/admin/projects');
    }

    // Reports active check
    if (itemPath === '/reports') {
      return currentPath.startsWith('/reports');
    }

    // Organization active checks
    if (itemPath === '/organization') {
      return currentPath.startsWith('/organization');
    }

    // Work Calendar active check (matches /admin/work-calendar and legacy /admin/working-times, /admin/public-holidays)
    if (itemPath === '/admin/work-calendar') {
      return (
        currentPath.startsWith('/admin/work-calendar') ||
        currentPath.startsWith('/admin/working-times') ||
        currentPath.startsWith('/admin/public-holidays')
      );
    }

    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  const currentGroup = visibleGroups.find(g => g.items.some(item => isItemActive(item.path)));
  const currentNav = currentGroup?.items.find(item => isItemActive(item.path));

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  const getBreadcrumbs = () => {
    if (isDashboard) {
      return { parent: null, current: 'Dashboard' };
    }

    let current = currentNav?.name;
    if (location.pathname.startsWith('/organization/settings')) {
      current = 'Settings';
    } else if (location.pathname.startsWith('/organization/profile')) {
      current = 'Organization Profile';
    } else if (!current) {
      if (location.pathname.startsWith('/submission-approvals')) current = 'Submission Approvals';
      else if (location.pathname.startsWith('/approvals/timesheets')) current = 'Timesheet Review';
      else if (location.pathname.startsWith('/timesheets/')) current = 'Timesheet Details';
      else if (location.pathname.startsWith('/projects/')) current = 'Project Details';
      else if (location.pathname.startsWith('/organization/overview')) current = 'Organization Overview';
      else if (location.pathname.startsWith('/profile')) current = 'Profile';
      else current = 'Dashboard';
    }

    let parent: string | null = null;
    if (location.pathname.startsWith('/organization/settings') || location.pathname.startsWith('/organization/profile')) {
      parent = isAdmin ? 'Company' : 'Organization';
    } else if (currentGroup?.title) {
      const t = currentGroup.title.trim();
      parent = t === t.toUpperCase()
        ? t.split(' ').map(w => w === '&' ? '&' : w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
        : t;
    } else if (location.pathname.startsWith('/projects/')) {
      parent = 'Projects';
    } else if (location.pathname.startsWith('/approvals/timesheets') || location.pathname.startsWith('/submission-approvals')) {
      parent = 'Approvals';
    } else if (location.pathname.startsWith('/timesheets/')) {
      parent = 'Timesheets';
    } else if (location.pathname.startsWith('/profile')) {
      parent = 'Account';
    }

    if (parent && current && parent.toLowerCase() === current.toLowerCase()) {
      parent = null;
    }

    return { parent, current };
  };
  const breadcrumbs = getBreadcrumbs();

  const closeMobileNav = () => setMobileNavOpen(false);
  const isCollapsed = sidebarCollapsed && !mobileNavOpen;

  return (
    <div className="flex h-screen bg-white overflow-hidden font-sans">
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={closeMobileNav}
        />
      )}

      {/* Enterprise Executive Sidebar: full viewport height (h-screen) */}
      <aside
        style={{ backgroundColor: '#F7F8FA' }}
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-[#F7F8FA] border-r border-slate-200/80 flex flex-col shrink-0 transition-[width,transform] duration-[250ms] ease-in-out motion-reduce:transition-none select-none overflow-x-hidden font-sidebar will-change-[width] ${
          mobileNavOpen 
            ? 'translate-x-0 w-56' 
            : `-translate-x-full lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-56'}`
        }`}
        aria-label="Sidebar navigation"
      >
        {/* Sidebar Brand & Collapse/Expand Header (Height 68px matching workspace header) */}
        <div 
          style={{ backgroundColor: '#F7F8FA' }}
          className="shrink-0 h-[68px] bg-[#F7F8FA] flex items-center px-3.5 relative overflow-hidden transition-colors duration-200"
        >
          {/* Brand wordmark link (visible on expanded desktop or mobile drawer) */}
          <div
            className={`w-[136px] shrink-0 overflow-hidden whitespace-nowrap select-none ${
              isCollapsed
                ? 'opacity-0 -translate-x-2.5 pointer-events-none transition-[opacity,transform] duration-100 ease-out'
                : 'opacity-100 translate-x-0 transition-[opacity,transform] duration-200 delay-75 ease-out'
            }`}
            aria-hidden={isCollapsed ? 'true' : undefined}
          >
            <Link
              to="/dashboard"
              onClick={closeMobileNav}
              tabIndex={isCollapsed ? -1 : 0}
              className="flex items-center hover:opacity-90 transition-opacity select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1738]/20 rounded-sm"
              aria-label="Sify Workforce Platform Home"
            >
              <img
                src="/sify Workforce Logo on Transparent Canvas.png"
                alt="Sify Workforce"
                className="h-9 w-auto max-w-[136px] object-contain select-none"
                draggable={false}
              />
            </Link>
          </div>

          {/* Desktop Collapse / Expand Toggle Button: GPU-accelerated translation and arrow rotation */}
          <button
            type="button"
            onClick={toggleSidebar}
            style={{
              left: '20px',
              transform: `translateY(-50%) translateX(${isCollapsed ? '0px' : '158px'})`,
            }}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-slate-500 hover:text-[#0B1738] shadow-2xs hover:shadow-xs transition-[transform,colors,box-shadow,border-color] duration-[250ms] ease-in-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1738]/20 shrink-0 absolute top-1/2 z-10"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          >
            <ChevronLeft
              className={`w-4 h-4 text-slate-500 hover:text-[#0B1738] transition-transform duration-[250ms] ease-in-out ${
                isCollapsed ? 'rotate-180' : 'rotate-0'
              }`}
              strokeWidth={2}
            />
          </button>

          {/* Mobile Drawer Close Button */}
          {mobileNavOpen && (
            <button
              type="button"
              onClick={closeMobileNav}
              className="lg:hidden text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer ml-auto"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-x-hidden sidebar-scrollbar px-3 py-2.5 space-y-1 overflow-y-auto">
          {visibleGroups.map((group, groupIndex) => {
            const isGroupCollapsed = Boolean(collapsedSections[group.id]);
            const showGroupItems = isCollapsed || !isGroupCollapsed;

            return (
              <div key={group.id || groupIndex} className="space-y-1">
                {group.title && (
                  <div className="h-7 relative flex items-center my-0.5">
                    {/* Expanded Section Heading: stable absolute layout preventing vertical shifting */}
                    <div
                      className={`absolute inset-0 flex items-center whitespace-nowrap ${
                        isCollapsed
                          ? 'opacity-0 -translate-x-2.5 pointer-events-none transition-[opacity,transform] duration-100 ease-out'
                          : 'opacity-100 translate-x-0 transition-[opacity,transform] duration-200 delay-75 ease-out'
                      }`}
                      aria-hidden={isCollapsed ? 'true' : undefined}
                    >
                      <button
                        type="button"
                        tabIndex={isCollapsed ? -1 : 0}
                        onClick={() => toggleSection(group.id)}
                        className="flex items-center justify-between w-full px-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sidebar group cursor-pointer hover:text-slate-800 transition-colors"
                      >
                        <span className="truncate">{group.title}</span>
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0 transition-transform duration-200 ${
                            isGroupCollapsed ? '-rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Collapsed Divider between groups: same height container, zero layout jump */}
                    {groupIndex > 0 && (
                      <div
                        className={`w-full flex items-center justify-center ${
                          isCollapsed
                            ? 'opacity-100 transition-opacity duration-200 delay-75 ease-out'
                            : 'opacity-0 pointer-events-none transition-opacity duration-100 ease-out'
                        }`}
                        aria-hidden={!isCollapsed ? 'true' : undefined}
                      >
                        <div className="w-6 border-t border-slate-200/80" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                )}

                {/* Group Items */}
                {showGroupItems && (
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={closeMobileNav}
                          title={item.name}
                          aria-label={item.name}
                          className={`group relative flex items-center h-10 w-full rounded-[10px] text-[13px] transition-colors duration-150 font-sidebar select-none overflow-hidden ${
                            isActive
                              ? 'bg-white shadow-2xs border border-slate-200/90 text-[#0B1738] font-semibold'
                              : 'text-[#2C3E5D] hover:bg-slate-200/60 hover:text-[#0B1738] font-medium border border-transparent'
                          }`}
                        >
                          {/* Active Indicator Bar on left edge */}
                          {isActive && (
                            <span
                              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#0B1738]"
                              aria-hidden="true"
                            />
                          )}

                          {/* Fixed Center Icon Box (48px wide = w-12, exactly centered in 72px sidebar) */}
                          <div className="w-12 h-10 shrink-0 flex items-center justify-center">
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive ? 'text-[#0B1738]' : 'text-[#5E6C84] group-hover:text-[#0B1738]'
                              }`}
                              strokeWidth={isActive ? 2 : 1.75}
                            />
                          </div>

                          {/* Full width label container: asymmetric fade prevents letter clipping and text jumping */}
                          <div
                            className={`flex-1 min-w-0 pr-1.5 overflow-hidden whitespace-nowrap select-none pointer-events-none ${
                              isCollapsed
                                ? 'opacity-0 -translate-x-2.5 transition-[opacity,transform] duration-100 ease-out'
                                : 'opacity-100 translate-x-0 transition-[opacity,transform] duration-200 delay-75 ease-out'
                            }`}
                          >
                            <span className="truncate block text-[13px] tracking-[-0.01em]">
                              {item.name}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Dev bypass context badge (if enabled) */}
        {env.VITE_DEV_AUTH_BYPASS && (
          <div 
            style={{ backgroundColor: '#F7F8FA' }}
            className={`p-2 border-t border-slate-200/80 shrink-0 bg-[#F7F8FA] overflow-hidden transition-[opacity,max-height] duration-[250ms] ease-in-out ${
              isCollapsed ? 'opacity-0 max-h-0 pointer-events-none p-0 border-t-0' : 'opacity-100 max-h-16'
            }`}
          >
            <div className="flex items-center gap-2 px-2.5 py-1 bg-amber-50/70 rounded-lg border border-amber-200/60 text-[11px] text-amber-800 font-medium whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Active Context: {employee?.name || 'Dev User'}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Workspace & Main Scroll Container: full height, scrollbar starts at y = 0 */}
      <div
        id="main-scroll-container"
        className="flex-1 min-w-0 h-screen overflow-y-auto bg-white flex flex-col relative select-text"
      >
        {/* Global Enterprise SaaS Header: sticky top-0 inside scrolling workspace */}
        <header className="h-[68px] bg-white sticky top-0 z-30 flex items-center justify-between shrink-0 px-4 sm:px-6">
          {/* Mobile hamburger menu & brand fallback */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="text-[#0B1738] hover:bg-slate-200/60 p-1.5 -ml-1 rounded-lg cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B1738]/20"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
            <Link
              to="/dashboard"
              className="flex items-center hover:opacity-90 select-none"
              aria-label="Sify Workforce Platform Home"
            >
              <img
                src="/sify Workforce Logo on Transparent Canvas.png"
                alt="Sify Workforce"
                className="h-8 w-auto max-w-[130px] object-contain select-none"
                draggable={false}
              />
            </Link>
          </div>

          {/* Area B: Breadcrumb Navigation & Back Button */}
          <div className="flex-1 flex items-center min-w-0 gap-3">
            {/* Back button (hidden on root dashboard) */}
            {!isDashboard && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      navigate('/dashboard');
                    }
                  }}
                  aria-label="Go back"
                  title="Go back"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                </button>

                <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" aria-hidden="true" />
              </>
            )}

            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-2 text-[13.5px]">
                {breadcrumbs.parent && (
                  <>
                    <li className="text-slate-400 font-medium font-sans truncate hidden sm:inline">
                      {breadcrumbs.parent}
                    </li>
                    <li className="hidden sm:flex items-center" aria-hidden="true">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={2.25} />
                    </li>
                  </>
                )}
                <li className="font-semibold text-[#0B1738] font-sans truncate" aria-current="page">
                  {breadcrumbs.current}
                </li>
              </ol>
            </nav>
          </div>

          {/* Areas C & D: Search, Notifications and User Profile (Right) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Jira-style Quick Search command trigger */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 px-3 h-8 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs group focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20"
              title="Search application (Ctrl+K or ⌘K)"
              aria-label="Search pages"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <span className="text-[12.5px] font-medium text-slate-400 group-hover:text-slate-600">Search projects, tasks, people...</span>
              <kbd className="text-[10px] font-sans font-semibold bg-white text-slate-500 border border-slate-200/90 rounded px-1.5 py-0.5 shadow-2xs">Ctrl K</kbd>
            </button>

            {/* Area C: Notification dropdown button */}
            <NotificationsMenu />

            {/* Area D: User Profile pill control with menu */}
            <UserProfileMenu
              employee={employee}
              onOpenProfileModal={() => setProfileModalOpen(true)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 bg-white relative">
          <div key={location.pathname} className="animate-pageTransition">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Enterprise Jira-style Global Search Palette */}
      <GlobalSearchPalette
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        employee={employee}
      />

      {employee && (
        <ProfileModal 
          isOpen={profileModalOpen} 
          onClose={() => setProfileModalOpen(false)} 
        />
      )}
    </div>
  );
};
