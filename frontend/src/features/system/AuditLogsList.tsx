import { useState, useMemo } from 'react';
import { useGetAuditLogsQuery } from '../../store/apiSlice';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { 
  ShieldAlert, 
  Search, 
  Activity, 
  User, 
  Clock, 
  FileText,

  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { Select } from '../../components/ui/Select';

interface AuditLog {
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

export const AuditLogsList = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const limit = 50;

  const { data: logsRes, isLoading, error } = useGetAuditLogsQuery({ page, limit });

  const logs: AuditLog[] = logsRes?.data || [];
  const meta = logsRes?.meta || { total: 0, page: 1, limit: 50, totalPages: 1 };

  // Generate unique action options for the filter based on current data
  const actionOptions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return ['ALL', ...Array.from(actions)].sort();
  }, [logs]);

  // Client-side filtering for search & action filter
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = search === '' || 
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.resourceType.toLowerCase().includes(search.toLowerCase()) ||
        log.actorId?.toLowerCase().includes(search.toLowerCase());
        
      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
      
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  if (isLoading && !logs.length) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center text-red-600">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 opacity-50" />
        <h3 className="mb-2 text-lg font-semibold">Failed to load audit logs</h3>
        <p className="text-sm opacity-80">There was a problem fetching the audit history.</p>
      </div>
    );
  }

  const formatDetails = (details: any) => {
    if (!details) return null;
    
    // For specific events, we can format nicely
    if (details.updatedFields) {
      return (
        <span className="text-xs text-slate-500">
          Updated: {details.updatedFields.join(', ')}
        </span>
      );
    }
    if (details.invitedEmail) {
      return (
        <span className="text-xs text-slate-500">
          Invited: {details.invitedEmail}
        </span>
      );
    }
    
    // Fallback JSON presentation
    const jsonStr = JSON.stringify(details);
    if (jsonStr === '{}') return null;
    return (
      <span className="text-xs text-slate-400 font-mono" title={jsonStr}>
        {jsonStr.length > 50 ? `${jsonStr.substring(0, 50)}...` : jsonStr}
      </span>
    );
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('ACTIVATED') || action.includes('ACCEPTED') || action.includes('APPROVED')) return 'text-emerald-700 bg-emerald-50/50 border-emerald-200/60';
    if (action.includes('DEACTIVATED') || action.includes('REMOVED') || action.includes('DECLINED') || action.includes('REJECTED') || action.includes('REVOKED')) return 'text-rose-700 bg-rose-50/50 border-rose-200/60';
    if (action.includes('UPDATED')) return 'text-slate-700 bg-slate-100/80 border-slate-200';
    if (action.includes('ASSIGNED') || action.includes('SUBMITTED') || action.includes('RESENT')) return 'text-amber-700 bg-amber-50/50 border-amber-200/60';
    return 'text-slate-600 bg-slate-50 border-slate-200/60';
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-7 pb-20 animate-fadeIn">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">System Audit Logs</h1>
        <p className="mt-2 text-sm text-slate-500">
          Immutable history of administrative actions, resource modifications, and system events.
        </p>
      </div>

      {/* Main Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        
        {/* Controls Bar */}
        <div className="border-b border-slate-200/80 bg-transparent p-4 sm:flex sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative max-w-xs flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-xl border border-slate-200 py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-slate-950 focus:outline-none sm:text-sm bg-white"
              />
            </div>

            <div className="relative min-w-[200px]">
              <Select
                value={actionFilter}
                onChange={setActionFilter}
                options={actionOptions.map(opt => ({
                  value: opt,
                  label: opt === 'ALL' ? 'All Actions' : opt
                }))}
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2 sm:mt-0 sm:ml-4">
            <span className="text-sm font-medium text-slate-500">
              {filteredLogs.length} events
            </span>
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="relative inline-flex items-center rounded-l-xl bg-white px-2 py-2 text-slate-400 border border-slate-200 hover:bg-slate-50 focus:z-10 disabled:opacity-50 transition-colors"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="relative -ml-px inline-flex items-center rounded-r-xl bg-white px-2 py-2 text-slate-400 border border-slate-200 hover:bg-slate-50 focus:z-10 disabled:opacity-50 transition-colors"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr className="bg-transparent border-b border-slate-200/80">
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-slate-900 sm:pl-6 w-[200px]">
                  Timestamp
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 w-[200px]">
                  Actor
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 w-[220px]">
                  Action
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 w-[180px]">
                  Resource
                </th>
                <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-transparent">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Activity className="mx-auto h-12 w-12 text-slate-200" />
                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No events found</h3>
                    <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr 
                    key={log.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-500 sm:pl-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
                          <User className="h-3 w-3 text-slate-500" />
                        </div>
                        <span className="font-medium text-slate-900 truncate max-w-[150px]" title={log.actorName || log.actorId || 'System'}>
                          {log.actorName || (log.actorId ? (log.actorId.substring(0, 8) + '...') : 'System')}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold font-mono tracking-wide border uppercase ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-700">
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1.5">
                          {log.resourceType === 'Employee' || log.resourceType === 'EmployeeInvitation' ? <User className="h-3.5 w-3.5 text-slate-400"/> : <Database className="h-3.5 w-3.5 text-slate-400" />}
                          {log.resourceType}
                        </span>
                        {log.resourceId && (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px]" title={log.resourceId}>
                            {log.resourceId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-500 truncate max-w-[300px]">
                      <div className="flex items-center gap-2">
                        {log.details && Object.keys(log.details).length > 0 && (
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        )}
                        {formatDetails(log.details)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination footer if we have multiple pages on server */}
        {meta.totalPages > 1 && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6 flex items-center justify-between">
             <div className="text-sm text-slate-500">
                Showing page <span className="font-medium text-slate-900">{meta.page}</span> of <span className="font-medium text-slate-900">{meta.totalPages}</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
