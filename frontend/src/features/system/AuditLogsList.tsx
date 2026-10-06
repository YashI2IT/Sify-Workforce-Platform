import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGetAuditLogsQuery } from '../../store/apiSlice';
import {
  Search,
  Activity,
  User,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Database,
  RefreshCw,
  X,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  FolderGit2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';

export interface AuditLog {
  id: string;
  organizationId: string;
  actorId: string | null;
  actorName?: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: any;
  createdAt: string;
}

export const AuditLogsList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [page]);
  const [isCopied, setIsCopied] = useState(false);
  const limit = 50;

  const { data: logsRes, isLoading, error, refetch, isFetching } = useGetAuditLogsQuery({ page, limit });
  const { showToast } = useToast();

  const logs: AuditLog[] = useMemo(() => logsRes?.data || [], [logsRes]);
  const meta = logsRes?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  // Generate unique action options for the filter based on current data
  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action).filter(Boolean));
    return [
      { value: 'ALL', label: 'All Actions' },
      ...Array.from(actions)
        .sort()
        .map((a) => ({ value: a, label: a })),
    ];
  }, [logs]);

  // Generate unique resource type options for the filter
  const resourceOptions = useMemo(() => {
    const resources = new Set(logs.map((log) => log.resourceType).filter(Boolean));
    return [
      { value: 'ALL', label: 'All Resources' },
      ...Array.from(resources)
        .sort()
        .map((r) => ({ value: r, label: r })),
    ];
  }, [logs]);

  // Client-side filtering for search, action, and resource
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.resourceType.toLowerCase().includes(q) ||
        (log.actorName && log.actorName.toLowerCase().includes(q)) ||
        (log.actorEmail && log.actorEmail.toLowerCase().includes(q)) ||
        (log.actorId && log.actorId.toLowerCase().includes(q)) ||
        (log.resourceId && log.resourceId.toLowerCase().includes(q));

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchesResource = resourceFilter === 'ALL' || log.resourceType === resourceFilter;

      return matchesSearch && matchesAction && matchesResource;
    });
  }, [logs, search, actionFilter, resourceFilter]);

  const hasActiveFilters = search.trim() !== '' || actionFilter !== 'ALL' || resourceFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setResourceFilter('ALL');
  };

  const handleRefresh = () => {
    refetch();
    showToast('Audit trail logs refreshed', 'info');
  };

  const handleCopyPayload = (details: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      setIsCopied(true);
      showToast('Event payload JSON copied to clipboard', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast('Failed to copy payload', 'error');
    }
  };

  const formatId = (id: string | null) => {
    if (!id) return null;
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 6)}`;
  };

  const formatDetails = (details: any) => {
    if (!details) return <span className="text-xs text-slate-400 font-sans">No additional payload</span>;

    if (details.updatedFields && Array.isArray(details.updatedFields)) {
      return (
        <span className="text-xs text-slate-600 font-sans">
          Updated: <span className="font-semibold text-slate-800">{details.updatedFields.join(', ')}</span>
        </span>
      );
    }
    if (details.invitedEmail) {
      return (
        <span className="text-xs text-slate-600 font-sans">
          Invited: <span className="font-semibold text-slate-800">{details.invitedEmail}</span>
        </span>
      );
    }
    if (details.type && details.date) {
      return (
        <span className="text-xs text-slate-600 font-sans">
          {details.type} • {details.date}
        </span>
      );
    }
    if (details.type && details.weekStart) {
      return (
        <span className="text-xs text-slate-600 font-sans">
          {details.type} • Week of {details.weekStart}
        </span>
      );
    }
    if (details.timesheetId) {
      return (
        <span className="text-xs text-slate-600 font-sans">
          Timesheet: <span className="font-semibold text-slate-800">{formatId(details.timesheetId)}</span>
        </span>
      );
    }
    if (details.assignedEmployeeId) {
      return (
        <span className="text-xs text-slate-600 font-sans">
          Assigned: <span className="font-semibold text-slate-800">{formatId(details.assignedEmployeeId)}</span>
        </span>
      );
    }
    if (details.comment) {
      return (
        <span className="text-xs text-slate-600 font-sans truncate max-w-[240px]" title={details.comment}>
          Comment: &ldquo;{details.comment}&rdquo;
        </span>
      );
    }

    const jsonStr = JSON.stringify(details);
    if (jsonStr === '{}') return <span className="text-xs text-slate-400 font-sans">Empty payload</span>;
    return (
      <span className="text-xs text-slate-500 font-sans truncate max-w-[240px]" title={jsonStr}>
        {jsonStr.length > 45 ? `${jsonStr.substring(0, 42)}...` : jsonStr}
      </span>
    );
  };

  const getActionBadgeStyle = (action: string) => {
    const act = action.toUpperCase();
    if (
      act.includes('CREATE') ||
      act.includes('ACTIVATE') ||
      act.includes('ACCEPT') ||
      act.includes('APPROVE')
    ) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    }
    if (
      act.includes('DELETE') ||
      act.includes('REMOVE') ||
      act.includes('DECLINE') ||
      act.includes('REJECT') ||
      act.includes('REVOKE') ||
      act.includes('DEACTIVATE')
    ) {
      return 'bg-rose-50 text-rose-800 border-rose-200/80';
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY') || act.includes('RESET')) {
      return 'bg-blue-50 text-blue-800 border-blue-200/80';
    }
    if (act.includes('ASSIGN') || act.includes('SUBMIT') || act.includes('RESEND') || act.includes('INVITE')) {
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200/80';
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'Employee':
      case 'EmployeeInvitation':
      case 'User':
        return <User className="w-3.5 h-3.5 text-slate-500" />;
      case 'Project':
        return <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />;
      case 'Timesheet':
      case 'TimeEntry':
        return <Clock className="w-3.5 h-3.5 text-slate-500" />;
      case 'PublicHoliday':
        return <Calendar className="w-3.5 h-3.5 text-slate-500" />;
      case 'Team':
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
      default:
        return <Database className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getActorInitials = (log: AuditLog) => {
    const name = log.actorName || log.actorEmail || 'SY';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('');
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* 1. Header with Slide-up Animation */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
            System Audit Logs
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Immutable operational and administrative event history recorded across your organization.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Activity
          </span>

          <button
            onClick={handleRefresh}
            disabled={isFetching || isLoading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh audit logs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${isFetching ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh Audit Logs</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Controls Bar Card */}
      <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 transition-shadow duration-300 hover:shadow-md">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by actor, action, resource, or ID…"
              className="w-full pl-9 pr-8 py-2 bg-slate-50/70 border border-slate-200 rounded-full text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-950/10 focus:border-slate-900 outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Dropdowns and Reset */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-44 sm:w-52">
              <Select
                value={actionFilter}
                onChange={setActionFilter}
                options={actionOptions}
                className="w-full"
                placeholder="Filter by Action"
              />
            </div>

            <div className="w-40 sm:w-48">
              <Select
                value={resourceFilter}
                onChange={setResourceFilter}
                options={resourceOptions}
                className="w-full"
                placeholder="Filter by Resource"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 transition-colors font-sans cursor-pointer"
              >
                Reset Filters
              </button>
            )}

            <span className="text-xs font-semibold text-slate-600 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 font-sans shrink-0">
              {filteredLogs.length} Events
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Audit Trail Card */}
      <div className="animate-slideUpFade-d2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
        {/* Card Top Strip */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans tracking-tight">
                Audit Trail Activity
              </h2>
              <p className="text-[11px] text-slate-500 font-medium font-sans">
                Chronological record of actions captured by system interceptors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 font-sans">
              Page {meta.page} of {meta.totalPages || 1}
            </span>
          </div>
        </div>

        {/* Content Body */}
        {isLoading && !logs.length ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium font-sans">Loading audit trail records…</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-sans">Failed to load audit logs</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-sans">
              There was a problem retrieving the system audit history. Please try refreshing the data.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80">
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    Action
                  </th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    Target Resource
                  </th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    Event Summary
                  </th>
                  <th className="px-4 py-3 text-[12px] leading-[16px] font-semibold text-slate-500 uppercase tracking-wider text-left border-b border-slate-200/80 bg-slate-50/50">
                    Inspect
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 transition-opacity duration-300 ${isFetching ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {filteredLogs.map((log) => {
                  const initials = getActorInitials(log);
                  const actorDisplayName =
                    log.actorName ||
                    log.actorEmail ||
                    (log.actorId ? `User (${log.actorId.substring(0, 8)}...)` : 'System');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition-colors duration-150 group"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-semibold text-slate-900 font-sans">
                            {format(new Date(log.createdAt), 'MMM d, yyyy • HH:mm:ss')}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center font-sans shrink-0 shadow-2xs">
                            {initials || <User className="w-3 h-3 text-white" />}
                          </div>
                          <div className="truncate max-w-[170px]">
                            <div className="text-xs font-semibold text-slate-900 font-sans truncate" title={actorDisplayName}>
                              {actorDisplayName}
                            </div>
                            {log.actorEmail && log.actorName && (
                              <div className="text-[11px] text-slate-500 font-sans truncate" title={log.actorEmail}>
                                {log.actorEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border font-sans ${getActionBadgeStyle(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 font-sans flex items-center gap-1.5">
                            {getResourceIcon(log.resourceType)}
                            {log.resourceType}
                          </span>
                          {log.resourceId && (
                            <span
                              className="text-[11px] text-slate-400 font-sans truncate max-w-[150px] mt-0.5"
                              title={log.resourceId}
                            >
                              ID: {formatId(log.resourceId)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Summary */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <div className="flex items-center gap-2 max-w-[300px]">
                          {log.details && Object.keys(log.details).length > 0 && (
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <div className="truncate min-w-0 flex-1">
                            {formatDetails(log.details)}
                          </div>
                        </div>
                      </td>

                      {/* Inspect */}
                      <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all active:scale-[0.97] cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!filteredLogs.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm font-sans">
                      {hasActiveFilters ? (
                        <div className="space-y-2">
                          <p className="font-semibold text-slate-700">No events matching current filters</p>
                          <p className="text-xs text-slate-400">
                            Adjust your search keyword, action filter, or resource category.
                          </p>
                          <button
                            onClick={handleResetFilters}
                            className="mt-2 text-xs font-bold text-slate-900 underline cursor-pointer"
                          >
                            Clear all filters
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-9 rounded-[14px] bg-slate-100 flex items-center justify-center text-slate-400">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700">No Audit Events Logged Yet</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              As actions and state transitions occur, immutable records will populate here.
                            </p>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs font-semibold text-slate-500 font-sans">
              Showing page <span className="font-bold text-slate-900">{meta.page}</span> of{' '}
              <span className="font-bold text-slate-900">{meta.totalPages}</span> ({meta.total} total records)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const container = document.getElementById('main-scroll-container');
                  if (container) {
                    container.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back to Top</span>
              </button>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Portaled Event Detail Inspection Modal */}
      {selectedLog &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-slideUpFade">
            <div className="animate-successPop bg-white rounded-[20px] shadow-2xl w-full max-w-2xl border border-slate-200/80 flex flex-col overflow-hidden max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-[#12161F] font-sans tracking-tight">
                      Audit Event Inspection
                    </h2>
                    <p className="text-xs text-slate-500 font-sans">
                      {selectedLog.action} on {selectedLog.resourceType}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-6 space-y-6">
                {/* Meta Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-sans">
                      Timestamp
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-sans block">
                      {format(new Date(selectedLog.createdAt), 'EEEE, MMMM d, yyyy • HH:mm:ss')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans block mt-0.5">
                      ISO: {selectedLog.createdAt}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-sans">
                      Action Performed
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border font-sans ${getActionBadgeStyle(
                        selectedLog.action
                      )}`}
                    >
                      {selectedLog.action}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-sans">
                      Actor Details
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-sans block">
                      {selectedLog.actorName || 'System Service'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                      {selectedLog.actorEmail || 'Internal Agent'}
                    </span>
                    {selectedLog.actorId && (
                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                        UUID: {selectedLog.actorId}
                      </span>
                    )}
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-sans">
                      Target Resource
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-sans block flex items-center gap-1.5">
                      {getResourceIcon(selectedLog.resourceType)}
                      {selectedLog.resourceType}
                    </span>
                    {selectedLog.resourceId && (
                      <span className="text-[11px] text-slate-500 font-sans block mt-0.5">
                        Resource ID: {selectedLog.resourceId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 font-sans uppercase tracking-wider">
                      Event Payload & Changes
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyPayload(selectedLog.details)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors font-sans cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto text-xs font-sans leading-relaxed border border-slate-800">
                    <pre className="font-sans whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/50 rounded-b-[20px]">
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 bg-[#12161F] hover:bg-slate-800 text-white text-[13.5px] font-bold rounded-full shadow-xs transition-all active:scale-[0.97] cursor-pointer font-sans"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
