import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Compass, 
  Briefcase, 
  CheckSquare, 
  Users, 
  UsersRound, 
  CalendarDays, 
  Clock, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  History, 
  ShieldAlert, 
  Building, 
  PieChart, 
  LayoutDashboard, 
  CornerDownLeft,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useLazySearchQuery, type GlobalSearchResultItem } from '../../store/apiSlice';

export interface GlobalSearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    roles?: string[];
  } | null;
}

export interface NavigationPageItem {
  id: string;
  name: string;
  path: string;
  groupTitle: string;
  description?: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

export interface QuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

export interface FlattenedSearchResultItem {
  id: string;
  category: 'pages' | 'projects' | 'tasks' | 'employees' | 'teams' | 'timesheets' | 'actions' | 'recents';
  categoryLabel: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'info' | 'purple' | 'danger';
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const isValidReactComponent = (c: any): boolean => {
  if (!c) return false;
  if (typeof c === 'function') return true;
  if (typeof c === 'object' && ('$$typeof' in c || 'render' in c)) return true;
  return false;
};

const getCategoryIcon = (category: FlattenedSearchResultItem['category']): React.ComponentType<{ className?: string }> => {
  switch (category) {
    case 'projects': return Briefcase;
    case 'tasks': return CheckSquare;
    case 'employees': return Users;
    case 'teams': return UsersRound;
    case 'timesheets': return CalendarDays;
    case 'actions': return Sparkles;
    case 'recents': return History;
    case 'pages':
    default: return Compass;
  }
};

const resolveIcon = (item: FlattenedSearchResultItem): React.ComponentType<{ className?: string }> => {
  if (isValidReactComponent(item.icon)) {
    return item.icon!;
  }
  return getCategoryIcon(item.category);
};

const RECENT_SEARCHES_STORAGE_KEY = 'sify_recent_searches';

export const GlobalSearchPalette: React.FC<GlobalSearchPaletteProps> = ({
  isOpen,
  onClose,
  employee,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const [triggerSearch, { data: serverResults, isLoading: isServerLoading, isError: isServerError, error: serverError }] = useLazySearchQuery();

  // Role checks
  const roles = employee?.roles || (employee?.role ? [employee.role] : ['EMPLOYEE']);
  const isAdmin = roles.includes('ADMIN');

  // Load recent searches from localStorage with strict sanitization against stale/corrupted objects
  const [recentSearches, setRecentSearches] = useState<FlattenedSearchResultItem[]>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const saved = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item: any) => item && typeof item === 'object' && item.url)
        .map((item: any) => ({
          id: String(item.id || item.url),
          category: 'recents' as const,
          categoryLabel: 'Recent Destinations',
          title: String(item.title || ''),
          subtitle: item.subtitle ? String(item.subtitle) : undefined,
          badge: item.badge ? String(item.badge) : undefined,
          badgeVariant: item.badgeVariant || 'default',
          url: String(item.url),
        }));
    } catch {
      return [];
    }
  });

  const saveRecentSearch = useCallback((item: FlattenedSearchResultItem) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      setRecentSearches(prev => {
        const filtered = prev.filter(r => r.url !== item.url);
        // Explicitly construct clean serializable record without icon function/object
        const cleanItem: FlattenedSearchResultItem = {
          id: item.id,
          category: 'recents',
          categoryLabel: 'Recent Destinations',
          title: item.title,
          subtitle: item.subtitle,
          badge: item.badge,
          badgeVariant: item.badgeVariant,
          url: item.url,
        };
        const updated = [cleanItem, ...filtered].slice(0, 5);
        window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
      setRecentSearches([]);
    } catch {
      // Ignore
    }
  };

  // Keyboard shortcut listener (Ctrl+K and Cmd+K)
  useEffect(() => {
    if (isOpen) {
      // Small timeout to guarantee DOM node is rendered and ready for focus
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setQuery('');
      setDebouncedQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounce query input for server requests (250ms)
  useEffect(() => {
    const trimmed = query.trim();
    const handler = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 220);

    return () => clearTimeout(handler);
  }, [query]);

  // Execute server search when debounced query updates
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      triggerSearch({ q: debouncedQuery, limit: 6 }, true);
    }
  }, [debouncedQuery, triggerSearch]);

  // Catalog of all accessible navigation pages with semantic search keywords and aliases
  const allNavigationPages: NavigationPageItem[] = useMemo(() => [
    {
      id: 'page-dashboard',
      name: 'Dashboard',
      path: '/dashboard',
      groupTitle: 'General',
      description: 'System overview and active workspaces',
      keywords: ['home', 'overview', 'metrics', 'stats', 'widgets', 'kpi'],
      icon: LayoutDashboard,
    },
    {
      id: 'page-my-projects',
      name: 'My Projects',
      path: '/projects',
      groupTitle: 'My Work',
      description: 'Assigned client projects and internal work streams',
      keywords: ['projects', 'work', 'tasks', 'assignments', 'milestones', 'boards'],
      icon: Briefcase,
      roles: ['EMPLOYEE', 'MANAGER'],
    },
    {
      id: 'page-admin-projects',
      name: 'Projects',
      path: '/admin/projects',
      groupTitle: isAdmin ? 'PROJECTS & REPORTS' : 'Management',
      description: 'Project management and client allocation',
      keywords: ['all projects', 'admin projects', 'clients', 'budget', 'portfolio', 'deadlines', 'board'],
      icon: Briefcase,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'page-time-entries',
      name: 'Time Entries',
      path: '/time-entries',
      groupTitle: 'My Work',
      description: 'Daily activity logging and work hour tracking',
      keywords: ['log time', 'track hours', 'worklog', 'daily hours', 'timesheet entry', 'clock'],
      icon: Clock,
      roles: ['EMPLOYEE', 'MANAGER'],
    },
    {
      id: 'page-my-timesheets',
      name: 'My Timesheets',
      path: '/timesheets',
      groupTitle: 'Timesheets',
      description: 'Submit and track weekly timesheets',
      keywords: ['timesheet', 'weekly hours', 'submit timesheet', 'attendance', 'payroll'],
      icon: CalendarDays,
      roles: ['EMPLOYEE', 'MANAGER'],
    },
    {
      id: 'page-team-timesheets',
      name: 'Team Timesheets',
      path: '/team-timesheets',
      groupTitle: 'Timesheets',
      description: 'View and audit weekly hours for all team members',
      keywords: ['team hours', 'staff timesheets', 'attendance audit', 'workload', 'utilization'],
      icon: UserCheck,
      roles: ['MANAGER'],
    },
    {
      id: 'page-approvals',
      name: 'Pending Approvals',
      path: '/approvals',
      groupTitle: 'Timesheets',
      description: 'Review and approve employee timesheets',
      keywords: ['approvals', 'pending reviews', 'approve timesheets', 'manager approvals', 'reject'],
      icon: CheckSquare,
      roles: ['MANAGER'],
    },
    {
      id: 'page-submission-approvals',
      name: 'Submission Approvals',
      path: '/submission-approvals',
      groupTitle: 'Approvals',
      description: 'Granular line-item approvals for daily time submissions',
      keywords: ['submissions', 'daily approvals', 'review entries', 'item approval'],
      icon: CheckSquare,
      roles: ['MANAGER'],
    },
    {
      id: 'page-employees',
      name: 'Employees',
      path: '/employees',
      groupTitle: isAdmin ? 'PEOPLE & TEAMS' : 'Management',
      description: 'Employee directory, profiles, roles, and departmental assignments',
      keywords: ['staff', 'team members', 'colleagues', 'directory', 'people', 'users', 'workers'],
      icon: Users,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'page-teams',
      name: 'Teams',
      path: '/teams',
      groupTitle: isAdmin ? 'PEOPLE & TEAMS' : 'Management',
      description: 'Functional teams, squads, management hierarchy, and leads',
      keywords: ['departments', 'squads', 'groups', 'managers', 'units', 'divisions'],
      icon: UsersRound,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'page-organization',
      name: 'Organization',
      path: '/organization',
      groupTitle: 'COMPANY',
      description: 'Enterprise organization profile, registration details, and structure',
      keywords: ['company', 'organization', 'profile', 'business info', 'enterprise', 'headquarters'],
      icon: Building,
      roles: ['ADMIN'],
    },
    {
      id: 'page-organization-settings',
      name: 'Organization Settings',
      path: '/organization/settings',
      groupTitle: 'COMPANY',
      description: 'Global preferences, timezone configuration, themes, and portal settings',
      keywords: ['settings', 'preferences', 'configuration', 'admin options', 'working parameters'],
      icon: Building,
      roles: ['ADMIN'],
    },
    {
      id: 'page-work-calendar',
      name: 'Work Calendar',
      path: '/admin/work-calendar',
      groupTitle: 'COMPANY',
      description: 'Working times, weekly schedules, shift hours, and official public holidays',
      keywords: ['calendar', 'working times', 'public holidays', 'working hours', 'shifts', 'leave schedule', 'overtime'],
      icon: CalendarDays,
      roles: ['ADMIN'],
    },
    {
      id: 'page-audit-logs',
      name: 'Activity History',
      path: '/admin/audit-logs',
      groupTitle: 'COMPANY',
      description: 'System audit logs, administrative actions, and compliance history',
      keywords: ['audit logs', 'activity history', 'security logs', 'compliance', 'system events'],
      icon: ShieldAlert,
      roles: ['ADMIN'],
    },
    {
      id: 'page-reports',
      name: 'Reports & Analytics',
      path: '/reports',
      groupTitle: isAdmin ? 'PROJECTS & REPORTS' : 'Reports',
      description: 'Resource utilization, project hours breakdown, and executive reports',
      keywords: ['analytics', 'charts', 'utilization', 'billable hours', 'resource allocation', 'graphs', 'export'],
      icon: PieChart,
    },
  ], [isAdmin]);

  // Filter accessible navigation pages based on user role
  const accessiblePages = useMemo(() => {
    return allNavigationPages.filter(p => {
      if (!p.roles) return true;
      return p.roles.some(r => roles.includes(r));
    });
  }, [allNavigationPages, roles]);

  // Filter pages matching the search query
  const matchingPages = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    return accessiblePages.filter(p => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.groupTitle.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.path.toLowerCase().includes(q) ||
        p.keywords.some(k => k.toLowerCase().includes(q))
      );
    });
  }, [accessiblePages, query]);

  // Contextual Quick Actions based on user's authorized role
  const allQuickActions: QuickActionItem[] = useMemo(() => [
    {
      id: 'action-dashboard',
      title: 'Go to Dashboard',
      subtitle: 'Workspace overview and metrics',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'action-log-time',
      title: 'Log Work Hours',
      subtitle: 'Open time tracker for today',
      url: '/time-entries',
      icon: Clock,
      roles: ['EMPLOYEE', 'MANAGER'],
    },
    {
      id: 'action-my-timesheets',
      title: 'View My Timesheets',
      subtitle: 'Review weekly submission history',
      url: '/timesheets',
      icon: CalendarDays,
      roles: ['EMPLOYEE', 'MANAGER'],
    },
    {
      id: 'action-approvals',
      title: 'Review Timesheet Approvals',
      subtitle: 'Process pending team submissions',
      url: '/approvals',
      icon: CheckSquare,
      roles: ['MANAGER'],
    },
    {
      id: 'action-create-project',
      title: 'Create New Project',
      subtitle: 'Launch project onboarding workspace',
      url: '/admin/projects/onboarding',
      icon: Briefcase,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'action-manage-employees',
      title: 'Manage Employees',
      subtitle: 'Workforce directory and onboarding',
      url: '/employees',
      icon: Users,
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      id: 'action-work-calendar',
      title: 'Configure Work Calendar',
      subtitle: 'Working hours, schedules, and holidays',
      url: '/admin/work-calendar',
      icon: CalendarDays,
      roles: ['ADMIN'],
    },
    {
      id: 'action-audit-logs',
      title: 'Inspect Activity History',
      subtitle: 'Audit logs and administrative events',
      url: '/admin/audit-logs',
      icon: ShieldAlert,
      roles: ['ADMIN'],
    },
  ], []);

  const accessibleQuickActions = useMemo(() => {
    return allQuickActions.filter(a => {
      if (!a.roles) return true;
      return a.roles.some(r => roles.includes(r));
    });
  }, [allQuickActions, roles]);

  const matchingQuickActions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return accessibleQuickActions.filter(a => 
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q)
    );
  }, [accessibleQuickActions, query]);

  // Convert server result items to our flattened item model with Lucide icons
  const mapServerItem = useCallback((
    item: GlobalSearchResultItem,
    category: 'projects' | 'tasks' | 'employees' | 'teams' | 'timesheets',
    categoryLabel: string,
    Icon: React.ComponentType<{ className?: string }>
  ): FlattenedSearchResultItem => ({
    id: item.id,
    category,
    categoryLabel,
    title: item.title,
    subtitle: item.subtitle,
    badge: item.badge,
    badgeVariant: item.badgeVariant || 'default',
    url: item.url,
    icon: Icon,
  }), []);

  // Consolidate and flatten all visible result items into an ordered list for smooth arrow-key navigation
  const flattenedResults = useMemo<FlattenedSearchResultItem[]>(() => {
    const q = query.trim();

    // 1. Initial State: query is empty -> show Recents (if any), Suggested Pages, Quick Actions
    if (!q) {
      const initialItems: FlattenedSearchResultItem[] = [];

      // Add recent items
      if (recentSearches.length > 0) {
        initialItems.push(...recentSearches);
      }

      // Add top accessible pages
      accessiblePages.slice(0, 4).forEach(p => {
        initialItems.push({
          id: p.id,
          category: 'pages',
          categoryLabel: 'Suggested Destinations',
          title: p.name,
          subtitle: p.description || p.path,
          badge: p.groupTitle,
          badgeVariant: 'default',
          url: p.path,
          icon: p.icon,
        });
      });

      // Add quick actions
      accessibleQuickActions.slice(0, 3).forEach(a => {
        initialItems.push({
          id: a.id,
          category: 'actions',
          categoryLabel: 'Quick Actions',
          title: a.title,
          subtitle: a.subtitle,
          url: a.url,
          icon: a.icon,
        });
      });

      return initialItems;
    }

    // 2. Active Search State: query is non-empty
    const results: FlattenedSearchResultItem[] = [];

    // Prioritize Tasks (especially exact ticket ID matches like P123-1)
    if (serverResults?.tasks && serverResults.tasks.length > 0) {
      serverResults.tasks.forEach(task => {
        results.push(mapServerItem(task, 'tasks', 'Tasks', CheckSquare));
      });
    }

    // Projects
    if (serverResults?.projects && serverResults.projects.length > 0) {
      serverResults.projects.forEach(project => {
        results.push(mapServerItem(project, 'projects', 'Projects', Briefcase));
      });
    }

    // Employees / People
    if (serverResults?.employees && serverResults.employees.length > 0) {
      serverResults.employees.forEach(emp => {
        results.push(mapServerItem(emp, 'employees', 'People', Users));
      });
    }

    // Teams
    if (serverResults?.teams && serverResults.teams.length > 0) {
      serverResults.teams.forEach(team => {
        results.push(mapServerItem(team, 'teams', 'Teams', UsersRound));
      });
    }

    // Navigation Pages
    if (matchingPages.length > 0) {
      matchingPages.forEach(p => {
        results.push({
          id: p.id,
          category: 'pages',
          categoryLabel: 'Pages & Views',
          title: p.name,
          subtitle: p.description || p.path,
          badge: p.groupTitle,
          badgeVariant: 'default',
          url: p.path,
          icon: p.icon,
        });
      });
    }

    // Timesheets / Approvals
    if (serverResults?.timesheets && serverResults.timesheets.length > 0) {
      serverResults.timesheets.forEach(ts => {
        results.push(mapServerItem(ts, 'timesheets', 'Timesheets & Approvals', CalendarDays));
      });
    }

    // Quick Actions
    if (matchingQuickActions.length > 0) {
      matchingQuickActions.forEach(a => {
        results.push({
          id: a.id,
          category: 'actions',
          categoryLabel: 'Quick Actions',
          title: a.title,
          subtitle: a.subtitle,
          url: a.url,
          icon: a.icon,
        });
      });
    }

    return results;
  }, [
    query, 
    recentSearches, 
    accessiblePages, 
    accessibleQuickActions, 
    serverResults, 
    matchingPages, 
    matchingQuickActions, 
    mapServerItem
  ]);

  // Keep selected index within valid range
  useEffect(() => {
    if (selectedIndex >= flattenedResults.length) {
      setSelectedIndex(Math.max(0, flattenedResults.length - 1));
    }
  }, [flattenedResults.length, selectedIndex]);

  // Automatically scroll selected item into view smoothly
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Navigate to item destination
  const handleSelect = useCallback((item: FlattenedSearchResultItem) => {
    saveRecentSearch(item);
    onClose();
    navigate(item.url);
  }, [navigate, onClose, saveRecentSearch]);

  // Unified keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (flattenedResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % flattenedResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flattenedResults.length) % flattenedResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = flattenedResults[selectedIndex];
      if (current) {
        handleSelect(current);
      }
    }
  };

  // Badge pill styling helper
  const renderBadge = (badge?: string, variant: FlattenedSearchResultItem['badgeVariant'] = 'default') => {
    if (!badge) return null;

    let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200/80';
    if (variant === 'success') {
      colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200/90';
    } else if (variant === 'warning') {
      colorStyles = 'bg-amber-50 text-amber-700 border-amber-200/90';
    } else if (variant === 'info') {
      colorStyles = 'bg-sky-50 text-sky-700 border-sky-200/90';
    } else if (variant === 'purple') {
      colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200/90';
    } else if (variant === 'danger') {
      colorStyles = 'bg-rose-50 text-rose-700 border-rose-200/90';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide rounded-md border font-sans uppercase shrink-0 ${colorStyles}`}>
        {badge}
      </span>
    );
  };

  if (!isOpen) return null;

  // Group flattened results by categoryLabel for rendering category headers
  let currentGroupLabel = '';

  const isDebouncing = query.trim() !== debouncedQuery && query.trim().length > 0;
  const isLoading = isServerLoading || isDebouncing;
  const hasNoResults = query.trim().length > 0 && !isLoading && flattenedResults.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick search navigation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 sm:px-4 bg-[#0B1738]/35 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[480px] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-2.5 sm:py-3 border-b border-slate-100 gap-2.5 bg-white relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={2} />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, people..."
            className="flex-1 bg-transparent text-[13.5px] sm:text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none font-sans font-medium"
            autoFocus
            aria-autocomplete="list"
            aria-controls="global-search-results"
          />

          {/* Loading Indicator or Clear / Shortcut Hint */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#0B1738] animate-spin shrink-0" />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setDebouncedQuery('');
                  inputRef.current?.focus();
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Clear input"
                aria-label="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <kbd className="hidden sm:inline-flex items-center text-[10px] font-sans font-bold bg-slate-100 text-slate-500 border border-slate-200/80 rounded px-1.5 py-0.5 shadow-2xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Body */}
        <div 
          ref={listRef}
          id="global-search-results"
          role="listbox"
          className="flex-1 overflow-y-auto p-1.5 sm:p-2 divide-y divide-slate-100/60 font-sans"
        >
          {/* Error State */}
          {isServerError && (
            <div className="py-6 px-4 text-center">
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-2">
                <AlertCircle className="w-4.5 h-4.5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">Unable to query business records</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                {typeof serverError === 'string' ? serverError : 'An unexpected error occurred while communicating with the server.'}
              </p>
              <button
                type="button"
                onClick={() => triggerSearch({ q: debouncedQuery, limit: 6 }, true)}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#0B1738] bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry Search
              </button>
            </div>
          )}

          {/* No Results State */}
          {hasNoResults && (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                <Search className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h3 className="text-[13px] font-semibold text-slate-900">
                No results found for &ldquo;{query}&rdquo;
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Try searching by project key, task ticket ID (e.g. <span className="font-semibold text-slate-700">P123-1</span>), employee name, or navigation page.
              </p>
            </div>
          )}

          {/* Results List */}
          {flattenedResults.length > 0 && (
            <div className="space-y-0.5">
              {flattenedResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                const Icon = resolveIcon(item);
                const showCategoryHeader = item.categoryLabel !== currentGroupLabel;
                if (showCategoryHeader) {
                  currentGroupLabel = item.categoryLabel;
                }

                return (
                  <React.Fragment key={`${item.category}-${item.id}-${index}`}>
                    {showCategoryHeader && (
                      <div className="flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                        <span>{item.categoryLabel}</span>
                        {item.category === 'recents' && (
                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-[10px] lowercase text-slate-400 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                          >
                            clear
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      ref={(el) => {
                        if (el) itemRefs.current.set(index, el);
                        else itemRefs.current.delete(index);
                      }}
                      role="option"
                      aria-selected={isSelected}
                      type="button"
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer group ${
                        isSelected 
                          ? 'bg-slate-100/90 ring-1 ring-[#0B1738]/15 shadow-2xs' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                        {/* Icon Box */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#0B1738] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-[#0B1738]/10 group-hover:text-[#0B1738]'
                        }`}>
                          {isValidReactComponent(Icon) ? (
                            <Icon className="w-3.5 h-3.5" />
                          ) : (
                            <Compass className="w-3.5 h-3.5" />
                          )}
                        </div>

                        {/* Title and Subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-[13px] font-semibold truncate ${
                              isSelected ? 'text-[#0B1738]' : 'text-slate-900'
                            }`}>
                              {item.title}
                            </p>
                            {renderBadge(item.badge, item.badgeVariant)}
                          </div>
                          {item.subtitle && (
                            <p className="text-[11px] text-slate-400 truncate font-sans font-normal mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right-hand side action / jump hint */}
                      <div className="flex items-center gap-1 shrink-0 text-slate-400">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0B1738] bg-white px-1.5 py-0.5 rounded border border-slate-200/90 shadow-2xs">
                            Jump <CornerDownLeft className="w-2.5 h-2.5 text-[#0B1738]" />
                          </span>
                        ) : (
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                        )}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Jira-style Footer */}
        <div className="px-4 py-2 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-sans select-none shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-white border border-slate-200/80 rounded text-slate-600 shadow-2xs">↑↓</kbd>
              <span className="text-slate-400 ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-white border border-slate-200/80 rounded text-slate-600 shadow-2xs">↵</kbd>
              <span className="text-slate-400 ml-0.5">select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9.5px] font-semibold bg-white border border-slate-200/80 rounded text-slate-600 shadow-2xs">esc</kbd>
              <span className="text-slate-400 ml-0.5">close</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 text-[10.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8DB00]"></span>
            <span>Sify Enterprise Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
