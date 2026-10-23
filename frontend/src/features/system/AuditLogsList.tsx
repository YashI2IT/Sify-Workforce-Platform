import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  useGetAuditLogsQuery,
  useGetAuditLogFilterOptionsQuery,
  useGetOrganizationSettingsQuery,
  useGetEmployeesDirectoryQuery,
  useGetProjectsQuery,
  useGetTeamsQuery,
} from '../../store/apiSlice';
import {
  Search,
  Activity,
  User,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUp,
  ArrowDownUp,
  Download,
  ShieldCheck,
  FolderGit2,
  CheckSquare,
  Building,
  Mail,
  Filter,
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { authStorage } from '../../lib/authUtils';
import {
  formatAuditAction,
  getActionBadgeStyle,
  formatConfiguredDateTime,
  parseEventChanges,
} from './auditLogUtils';

export interface AuditLogItem {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  action: string;
  readableAction: string;
  resourceType: string;
  resourceId: string | null;
  resourceName?: string | null;
  details: any;
  detailsSummary: string;
  createdAt: string;
}

export const AuditLogsList: React.FC = () => {
  // 1. Pagination & Sorting State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Entity lookups for human-readable names (preventing hard-to-remember raw UUIDs)
  const { data: directoryData } = useGetEmployeesDirectoryQuery();
  const { data: projectsData } = useGetProjectsQuery(undefined);
  const { data: teamsData } = useGetTeamsQuery({ limit: 100 });

  const employeeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(directoryData)
      ? directoryData
      : directoryData?.data || [];
    for (const emp of list) {
      if (emp?.id && emp?.name) map.set(emp.id, emp.name);
    }
    return map;
  }, [directoryData]);

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(projectsData)
      ? projectsData
      : projectsData?.data || [];
    for (const p of list) {
      if (p?.id && p?.name) map.set(p.id, p.name);
    }
    return map;
  }, [projectsData]);

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    const list = Array.isArray(teamsData)
      ? teamsData
      : teamsData?.data || [];
    for (const t of list) {
      if (t?.id && t?.name) map.set(t.id, t.name);
    }
    return map;
  }, [teamsData]);

  const entityLookup = useMemo(
    () => ({
      getEmployeeName: (id: string) => employeeNameMap.get(id),
      getProjectName: (id: string) => projectNameMap.get(id),
      getTeamName: (id: string) => teamNameMap.get(id),
    }),
    [employeeNameMap, projectNameMap, teamNameMap],
  );

  // 2. Search & Filter State
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // 3. Modals & UI State
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCopiedId, setIsCopiedId] = useState<string | null>(null);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  const { showToast } = useToast();

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page to 1 whenever any filter, search, or sortOrder changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actionFilter, resourceFilter, fromDate, toDate, sortOrder, limit]);

  // Scroll to top on page change
  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  // Query Organization Settings for Timezone & Date Format
  const { data: orgSettings } = useGetOrganizationSettingsQuery();
  const configuredTimeZone = orgSettings?.timeZone || 'Asia/Kolkata';
  const configuredDateFormat = orgSettings?.dateFormat || 'DD/MM/YYYY';

  // Query Backend Filter Options
  const { data: filterOptionsRes } = useGetAuditLogFilterOptionsQuery();

  // Query Server-Side Paginated Audit Logs
  const {
    data: logsRes,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGetAuditLogsQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    action: actionFilter !== 'ALL' ? actionFilter : undefined,
    resourceType: resourceFilter !== 'ALL' ? resourceFilter : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    sortOrder,
  });

  const logs: AuditLogItem[] = useMemo(() => logsRes?.data || [], [logsRes]);
  const meta = logsRes?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  // Action dropdown choices from backend metadata
  const actionOptions = useMemo(() => {
    const defaultOption = { value: 'ALL', label: 'All Actions' };
    if (!filterOptionsRes?.actions) return [defaultOption];
    return [defaultOption, ...filterOptionsRes.actions];
  }, [filterOptionsRes]);

  // Resource dropdown choices from backend metadata
  const resourceOptions = useMemo(() => {
    const defaultOption = { value: 'ALL', label: 'All Resources' };
    if (!filterOptionsRes?.resourceTypes) return [defaultOption];
    return [defaultOption, ...filterOptionsRes.resourceTypes];
  }, [filterOptionsRes]);

  // Check if any filter is active
  const hasActiveFilters =
    debouncedSearch !== '' ||
    actionFilter !== 'ALL' ||
    resourceFilter !== 'ALL' ||
    fromDate !== '' ||
    toDate !== '';

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setActionFilter('ALL');
    setResourceFilter('ALL');
    setFromDate('');
    setToDate('');
  };

  const handleRefresh = () => {
    refetch();
    showToast('Activity history refreshed', 'info');
  };

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setIsCopiedId(id);
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setIsCopiedId(null), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleCopyJson = (details: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setIsCopiedJson(true);
      showToast('Event JSON copied to clipboard', 'success');
      setTimeout(() => setIsCopiedJson(false), 2000);
    } catch {
      showToast('Failed to copy JSON', 'error');
    }
  };

  const handleDownloadSingleEventJson = (log: AuditLogItem) => {
    try {
      const jsonContent = JSON.stringify(log, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_event_${log.id}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Downloaded event JSON', 'success');
    } catch {
      showToast('Failed to download event JSON', 'error');
    }
  };

  // Perform CSV or JSON export through backend streaming endpoint
  const handleDownloadExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      params.set('format', format);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (resourceFilter !== 'ALL') params.set('resourceType', resourceFilter);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      params.set('sortOrder', sortOrder);
      params.set('limit', '5000');

      const res = await fetch(`/api/v1/audit-logs/export?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed with status: ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      let filename = `sify_audit_logs_${new Date().toISOString().slice(0, 10)}.${format}`;
      if (disposition && disposition.includes('filename="')) {
        const match = disposition.match(/filename="([^"]+)"/);
        if (match) filename = match[1];
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Export complete (${format.toUpperCase()})`, 'success');
      setShowExportModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate audit export', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const formatId = (id: string | null) => {
    if (!id) return null;
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 6)}`;
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'Project':
        return <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />;
      case 'Task':
        return <CheckSquare className="w-3.5 h-3.5 text-slate-500" />;
      case 'Employee':
        return <User className="w-3.5 h-3.5 text-slate-500" />;
      case 'Team':
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
      case 'Timesheet':
      case 'TimeEntry':
      case 'TimesheetSubmission':
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
      case 'Organization':
      case 'OrganizationSettings':
        return <Building className="w-3.5 h-3.5 text-slate-500" />;
      case 'EmployeeInvitation':
        return <Mail className="w-3.5 h-3.5 text-slate-500" />;
      case 'PublicHoliday':
        return <Calendar className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getActorInitials = (actorName?: string, actorEmail?: string) => {
    const name = actorName || actorEmail || 'SY';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('');
  };

  // Render Pagination Controls Bar (used both Top and Bottom)
  const renderPaginationControls = (isTop: boolean) => (
    <div
      className={`px-5 py-3.5 flex items-center justify-between flex-wrap gap-3 ${
        isTop ? 'border-b border-slate-200/80 bg-[#F7F8FA]' : 'border-t border-slate-200/80 bg-[#F7F8FA]'
      }`}
    >
      <div className="text-[12.5px] sm:text-[13px] font-medium text-slate-600 font-sans">
        Showing <span className="font-semibold text-slate-900">Page {meta.page}</span> of{' '}
        <span className="font-semibold text-slate-900">{meta.totalPages}</span> ·{' '}
        <span className="font-medium text-slate-600">{meta.limit} records per page</span> ·{' '}
        <span className="font-semibold text-slate-900">{meta.total}</span> matching events
      </div>

      <div className="flex items-center gap-2">
        {!isTop && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-xs text-slate-500 font-medium">Per page:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}

        {!isTop && (
          <button
            type="button"
            onClick={() => {
              const container = document.getElementById('main-scroll-container');
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
            title="Back to top"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Top</span>
          </button>
        )}

        <button
          type="button"
          disabled={page <= 1 || isFetching}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          disabled={page >= meta.totalPages || isFetching}
          onClick={() => setPage((p) => p + 1)}
          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* 1. Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] sm:text-[30px] leading-[36px] font-bold text-[#0B1738] tracking-tight">
            Activity History
          </h1>
          <p className="text-[13px] sm:text-[14px] leading-[21px] text-slate-500 font-medium mt-1">
            Review important actions and changes across your organization.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Refresh Action */}
          <button
            onClick={handleRefresh}
            disabled={isFetching || isLoading}
            className="inline-flex items-center justify-center gap-2 h-9 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh activity logs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${isFetching ? 'animate-spin text-slate-900' : ''}`}
            />
            <span>Refresh</span>
          </button>

          {/* Export Action */}
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-[#0B1738] hover:bg-[#12204a] text-white rounded-[10px] text-[13px] font-semibold shadow-xs transition-all active:scale-[0.98]"
            title="Export filtered audit logs"
          >
            <Download className="w-3.5 h-3.5 text-[#C8DB00]" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Search & Filters Toolbar */}
      <div className="bg-[#F7F8FA] border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 transition-shadow duration-200 space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search person, action, resource, or ID…"
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#0B1738]/10 focus:border-[#0B1738] outline-none transition-all shadow-2xs"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="md:col-span-3">
            <Select
              value={actionFilter}
              onChange={setActionFilter}
              options={actionOptions}
              className="w-full"
              placeholder="Filter by Action"
            />
          </div>

          {/* Resource Filter */}
          <div className="md:col-span-3">
            <Select
              value={resourceFilter}
              onChange={setResourceFilter}
              options={resourceOptions}
              className="w-full"
              placeholder="Filter by Resource"
            />
          </div>

          {/* Sort Order Toggle */}
          <div className="md:col-span-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
              title="Toggle sort order"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
            </button>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Date Range:
            </span>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-500 font-medium">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-500 font-medium">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs"
              />
            </div>
          </div>

          {/* Active Filter Badges & Reset Button */}
          <div className="flex items-center gap-2 flex-wrap">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-200/60 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                Clear all filters
              </button>
            )}

            <span className="text-xs font-semibold text-slate-600 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs shrink-0">
              {meta.total} Matching Events
            </span>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Active:
            </span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                Query: &ldquo;{debouncedSearch}&rdquo;
                <button
                  onClick={() => {
                    setSearchInput('');
                    setDebouncedSearch('');
                  }}
                  className="hover:text-slate-950 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {actionFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                Action: {formatAuditAction(actionFilter)}
                <button onClick={() => setActionFilter('ALL')} className="hover:text-slate-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {resourceFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                Resource: {resourceFilter}
                <button onClick={() => setResourceFilter('ALL')} className="hover:text-slate-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {fromDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                From: {fromDate}
                <button onClick={() => setFromDate('')} className="hover:text-slate-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {toDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-slate-800 border border-slate-200 shadow-2xs">
                To: {toDate}
                <button onClick={() => setToDate('')} className="hover:text-slate-950 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Audit Trail Card with DUAL PAGINATION (Top and Bottom) */}
      <div className="bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300">
        {/* Section Heading Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-[#0B1738] tracking-tight">
              Activity History
            </h2>
            <p className="text-[12px] text-slate-500 font-medium">
              Immutable operational and administrative event records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/80">
              Timezone: <span className="font-bold text-slate-800">{configuredTimeZone}</span>
            </span>
          </div>
        </div>

        {/* TOP PAGINATION CONTROLS */}
        {renderPaginationControls(true)}

        {/* Table Body */}
        {isLoading && !logs.length ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium font-sans">
              Loading activity history…
            </span>
          </div>
        ) : error ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              Failed to load activity history
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
              There was a problem retrieving audit records. Please try refreshing or adjust filters.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-1.5 bg-[#0B1738] hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="px-4 py-3 text-[12px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-[12px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80">
                    Person
                  </th>
                  <th className="px-4 py-3 text-[12px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80">
                    What Happened
                  </th>
                  <th className="px-4 py-3 text-[12px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80">
                    Related Item
                  </th>
                  <th className="px-4 py-3 text-[12px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80">
                    Details
                  </th>
                  <th className="px-4 py-3 text-[12px] sm:text-[13px] font-medium text-slate-500 uppercase tracking-wider text-right border-b border-slate-200/80">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y divide-slate-100 transition-opacity duration-200 ${
                  isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'
                }`}
              >
                {logs.map((log) => {
                  const dt = formatConfiguredDateTime(
                    log.createdAt,
                    configuredTimeZone,
                    configuredDateFormat,
                  );
                  const initials = getActorInitials(log.actorName, log.actorEmail || undefined);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/70 transition-colors duration-150 group"
                    >
                      {/* 1. Date & Time */}
                      <td className="px-4 py-3.5 text-[14px] text-slate-800 border-b border-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[13.5px] font-semibold text-slate-900 block font-sans">
                              {dt.dateStr}
                            </span>
                            <span className="text-[11.5px] text-slate-500 font-medium font-sans">
                              {dt.timeStr}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Person (Actor) */}
                      <td className="px-4 py-3.5 text-[14px] text-slate-800 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#0B1738] text-white font-bold text-[10px] flex items-center justify-center font-sans shrink-0 shadow-2xs">
                            {initials || <User className="w-3 h-3 text-white" />}
                          </div>
                          <div className="truncate max-w-[180px]">
                            <div
                              className="text-[13.5px] font-semibold text-slate-900 font-sans truncate"
                              title={log.actorName}
                            >
                              {log.actorName}
                            </div>
                            {log.actorEmail ? (
                              <div
                                className="text-[11.5px] text-slate-500 font-sans truncate"
                                title={log.actorEmail}
                              >
                                {log.actorEmail}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 font-sans">
                                {log.actorId ? 'Deactivated Account' : 'System Service'}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. What Happened */}
                      <td className="px-4 py-3.5 text-[14px] text-slate-800 border-b border-slate-100">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border font-sans ${getActionBadgeStyle(
                              log.action,
                            )}`}
                          >
                            {log.readableAction || formatAuditAction(log.action)}
                          </span>
                          <span
                            className="text-[10.5px] text-slate-400 font-mono"
                            title={`Event Code: ${log.action}`}
                          >
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* 4. Related Item */}
                      <td className="px-4 py-3.5 text-[14px] text-slate-800 border-b border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-slate-800 font-sans flex items-center gap-1.5">
                            {getResourceIcon(log.resourceType)}
                            {log.resourceType}
                          </span>
                          {log.resourceId ? (
                            <span
                              className="text-[11.5px] text-slate-500 font-mono truncate max-w-[160px] mt-0.5"
                              title={log.resourceId}
                            >
                              {formatId(log.resourceId)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-sans italic mt-0.5">
                              Organization-level
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Details */}
                      <td className="px-4 py-3.5 text-[14px] text-slate-800 border-b border-slate-100">
                        <div className="flex items-center gap-2 max-w-[340px]">
                          {log.details && Object.keys(log.details).length > 0 && (
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className="text-[12.5px] text-slate-600 font-sans truncate"
                            title={log.detailsSummary}
                          >
                            {log.detailsSummary || 'No details recorded'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Action (Inspect) */}
                      <td className="px-4 py-3.5 text-right border-b border-slate-100 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all active:scale-[0.97] cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!logs.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400 text-sm font-sans">
                      {hasActiveFilters ? (
                        <div className="space-y-2.5 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                            <Filter className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-slate-800 text-sm">
                            No matching events found
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Try adjusting your search query, clearing filters, or broadening the date range.
                          </p>
                          <button
                            onClick={handleResetFilters}
                            className="mt-1 px-4 py-1.5 bg-[#0B1738] text-white rounded-full text-xs font-semibold shadow-2xs hover:bg-slate-800 cursor-pointer"
                          >
                            Clear all filters
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2.5 py-6">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                            <ShieldCheck className="w-6 h-6 text-slate-500" />
                          </div>
                          <p className="font-semibold text-slate-800 text-sm">No Activity Logged Yet</p>
                          <p className="text-xs text-slate-500 max-w-sm">
                            As actions and updates take place across your organization, an immutable history will be recorded here.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* BOTTOM PAGINATION CONTROLS */}
        {renderPaginationControls(false)}
      </div>

      {/* 4. REBUILT INSPECT MODAL (Activity Details) */}
      {selectedLog &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-2xl border border-slate-200/80 flex flex-col overflow-hidden max-h-[92vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
                <div>
                  <h2 className="text-[18px] font-bold text-[#0B1738] font-sans tracking-tight">
                    Activity Details
                  </h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Review event details and recorded changes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-6 space-y-5">
                {/* 1. Event Summary Card */}
                <div className="bg-[#F7F8FA] border border-slate-200/80 rounded-[14px] p-4.5 space-y-3.5">
                  <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Event Summary
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* What Happened */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        What Happened
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getActionBadgeStyle(
                          selectedLog.action,
                        )}`}
                      >
                        {selectedLog.readableAction || formatAuditAction(selectedLog.action)}
                      </span>
                    </div>

                    {/* Who Performed Action */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Performed By
                      </span>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {selectedLog.actorName}
                      </div>
                      {selectedLog.actorEmail && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {selectedLog.actorEmail}
                        </div>
                      )}
                    </div>

                    {/* When It Happened */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Timestamp ({configuredTimeZone})
                      </span>
                      <div className="text-xs font-bold text-slate-900">
                        {
                          formatConfiguredDateTime(
                            selectedLog.createdAt,
                            configuredTimeZone,
                            configuredDateFormat,
                          ).full
                        }
                      </div>
                      <div className="text-[10.5px] text-slate-400 font-mono mt-0.5">
                        UTC: {new Date(selectedLog.createdAt).toISOString()}
                      </div>
                    </div>

                    {/* Target Item */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Affected Item
                      </span>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {getResourceIcon(selectedLog.resourceType)}
                        {(() => {
                          const name =
                            selectedLog.resourceName ||
                            (selectedLog.resourceType === 'Project' && selectedLog.resourceId
                              ? projectNameMap.get(selectedLog.resourceId)
                              : selectedLog.resourceType === 'Employee' && selectedLog.resourceId
                              ? employeeNameMap.get(selectedLog.resourceId)
                              : selectedLog.resourceType === 'Team' && selectedLog.resourceId
                              ? teamNameMap.get(selectedLog.resourceId)
                              : null);
                          return (
                            <span>
                              {selectedLog.resourceType}
                              {name ? `: ${name}` : ''}
                            </span>
                          );
                        })()}
                      </div>
                      {selectedLog.resourceId && (
                        <div className="text-[10.5px] text-slate-500 font-mono truncate mt-0.5">
                          ID: {selectedLog.resourceId}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Changes Made Card */}
                <div className="bg-[#F7F8FA] border border-slate-200/80 rounded-[14px] p-4.5 space-y-3">
                  <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
                    Changes Made
                  </span>

                  {(() => {
                    const parsed = parseEventChanges(selectedLog.details, entityLookup);

                    if (parsed.type === 'diff' && parsed.diffRows) {
                      return (
                        <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200/70 text-slate-500 font-semibold">
                              <tr>
                                <th className="px-3.5 py-2">Field</th>
                                <th className="px-3.5 py-2">Previous Value</th>
                                <th className="px-3.5 py-2">New Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parsed.diffRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-3.5 py-2 font-semibold text-slate-900">
                                    {row.field}
                                  </td>
                                  <td className="px-3.5 py-2 text-rose-700 bg-rose-50/40 font-mono text-[11px]">
                                    {row.from}
                                  </td>
                                  <td className="px-3.5 py-2 text-emerald-700 bg-emerald-50/40 font-mono text-[11px]">
                                    {row.to}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    }

                    if (parsed.type === 'fields' && parsed.fieldList) {
                      return (
                        <div className="bg-white rounded-xl border border-slate-200/70 p-3.5 space-y-2 shadow-2xs">
                          <span className="text-xs text-slate-600 block">
                            The following fields were modified during this update:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {parsed.fieldList.map((f, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/70"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-400 italic pt-1">
                            Previous and new values were not recorded for this event.
                          </p>
                        </div>
                      );
                    }

                    if (parsed.type === 'attributes' && parsed.attributeRows) {
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {parsed.attributeRows.map((attr, idx) => (
                            <div
                              key={idx}
                              className="bg-white rounded-xl border border-slate-200/70 p-3 shadow-2xs"
                            >
                              <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                                {attr.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 break-words">
                                {attr.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }

                    return (
                      <div className="p-4 bg-white rounded-xl border border-slate-200/70 text-center shadow-2xs">
                        <p className="text-xs text-slate-500 font-medium">
                          {parsed.emptyMessage || 'No additional change details were recorded for this event.'}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* 3. Technical Details Card */}
                <div className="bg-[#F7F8FA] border border-slate-200/80 rounded-[14px] p-4.5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
                      Technical Details & JSON Payload
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyJson(selectedLog.details)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      >
                        {isCopiedJson ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{isCopiedJson ? 'Copied' : 'Copy JSON'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadSingleEventJson(selectedLog)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download JSON</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Event ID:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-slate-800 text-[11px] truncate max-w-[160px]">
                          {selectedLog.id}
                        </span>
                        <button
                          onClick={() => handleCopyText(selectedLog.id, 'event-id')}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Copy Event ID"
                        >
                          {isCopiedId === 'event-id' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Event Code:</span>
                      <span className="font-mono font-semibold text-slate-800 text-[11px]">
                        {selectedLog.action}
                      </span>
                    </div>

                    {selectedLog.resourceId && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/70 flex items-center justify-between sm:col-span-2">
                        <span className="text-slate-500 font-medium">Resource ID:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-slate-800 text-[11px] truncate max-w-[280px]">
                            {selectedLog.resourceId}
                          </span>
                          <button
                            onClick={() => handleCopyText(selectedLog.resourceId!, 'resource-id')}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy Resource ID"
                          >
                            {isCopiedId === 'resource-id' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Raw JSON Code Block */}
                  <div className="bg-[#0B1738] text-slate-200 rounded-xl p-3.5 overflow-x-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs font-mono border border-slate-800 max-h-52 leading-relaxed">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/60 rounded-b-[20px]">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 bg-[#0B1738] hover:bg-slate-800 text-white text-[13px] font-bold rounded-full shadow-xs transition-all active:scale-[0.97] cursor-pointer font-sans"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 5. EXPORT MODAL */}
      {showExportModal &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md border border-slate-200/80 overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-[#F7F8FA]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0B1738] text-white flex items-center justify-center shadow-xs">
                    <Download className="w-4 h-4 text-[#C8DB00]" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#0B1738]">Export Activity History</h3>
                    <p className="text-xs text-slate-500">Download filtered records safely</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-[#F7F8FA] p-3.5 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
                  <span className="font-semibold text-slate-800 block">Export Scope & Current Filters:</span>
                  <p>
                    • Matching records: <span className="font-bold text-slate-900">{meta.total}</span> events
                  </p>
                  {debouncedSearch && <p>• Search query: &ldquo;{debouncedSearch}&rdquo;</p>}
                  {actionFilter !== 'ALL' && <p>• Action: {formatAuditAction(actionFilter)}</p>}
                  {resourceFilter !== 'ALL' && <p>• Resource: {resourceFilter}</p>}
                  {fromDate && <p>• From: {fromDate}</p>}
                  {toDate && <p>• To: {toDate}</p>}
                  <p className="text-[11px] text-slate-400 pt-1">
                    Export batches are bounded to 5,000 events to ensure security and prevent memory exhaustion.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Choose Export Format
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => handleDownloadExport('csv')}
                      className="flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#0B1738] rounded-xl text-center transition-all group cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        CSV
                      </div>
                      <span className="text-xs font-bold text-slate-800">Spreadsheet (CSV)</span>
                      <span className="text-[11px] text-slate-400">Excel, Sheets, CSV tools</span>
                    </button>

                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => handleDownloadExport('json')}
                      className="flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-[#0B1738] rounded-xl text-center transition-all group cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
                        JSON
                      </div>
                      <span className="text-xs font-bold text-slate-800">Raw Data (JSON)</span>
                      <span className="text-[11px] text-slate-400">Developer & compliance</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end bg-slate-50/60">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
