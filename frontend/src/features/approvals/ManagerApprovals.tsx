import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, CalendarDays, Users } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange } from '../../utils/date';
import {
  useGetPendingApprovalsQuery,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation
} from '../../store/apiSlice';

interface Timesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
  timeEntries?: { hours: number }[];
  summary?: {
    expectedHours: number;
    loggedHours: number;
    approvedHours: number;
    variance: number;
  };
}

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
}

export const ManagerApprovals = () => {
  const { isLoading: empLoading } = useCurrentEmployee();
  const { showToast } = useToast();
  
  const { data: timesheetsData, isLoading: approvalsLoading, error: approvalsError, refetch: fetchApprovals } = useGetPendingApprovalsQuery();
  const [approveTimesheetM] = useApproveTimesheetMutation();
  const [rejectTimesheetM] = useRejectTimesheetMutation();

  const timesheets: Timesheet[] = Array.isArray(timesheetsData) ? timesheetsData : (timesheetsData?.data ?? []);
  
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});
  const loading = approvalsLoading || empLoading;
  const error = approvalsError ? 'Failed to load approvals' : '';
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState<{ timesheetId: string } | null>(null);
  const [rejectText, setRejectText] = useState('');

  const loadEmployeeData = useCallback(async (list: Timesheet[]) => {
    try {
      const uniqueIds = [...new Set(list.map((ts) => ts.employeeId))];
      const empResults = await Promise.allSettled(
        uniqueIds.map((id) => apiClient(`/employees/${id}`))
      );
      const map: Record<string, Employee> = {};
      empResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) {
          map[uniqueIds[i]] = res.value;
        }
      });
      setEmployeeMap(map);
    } catch (err) {
      console.error('Failed to load employee details', err);
    }
  }, []);

  useEffect(() => {
    if (timesheets.length > 0) {
      loadEmployeeData(timesheets);
    }
  }, [timesheets, loadEmployeeData]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      await approveTimesheetM(id).unwrap();
      showToast('Timesheet approved successfully', 'success');
      fetchApprovals();
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectComment) return;
    const { timesheetId } = rejectComment;
    const comment = rejectText.trim();
    if (!comment) {
      showToast('Rejection comment is required', 'error');
      return;
    }
    try {
      setProcessingId(timesheetId);
      await rejectTimesheetM({ id: timesheetId, comment }).unwrap();
      setRejectComment(null);
      setRejectText('');
      showToast('Timesheet rejected', 'success');
      fetchApprovals();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return formatDateRange(start, end);
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const uniqueMemberCount = new Set(timesheets.map(t => t.employeeId)).size;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight ">
                  Pending Approvals
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {timesheets.length} {timesheets.length === 1 ? 'timesheet' : 'timesheets'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Review and approve submitted timesheets from your team members.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchApprovals}
            className="p-2.5 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh approvals"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Executive Telemetry Row (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Pending Queue */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Pending Queue
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : timesheets.length}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">submissions</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Awaiting manager verification</p>
        </div>

        {/* Card 2: Team Members in Queue */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Team Members
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : uniqueMemberCount}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">members</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-slate-950 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, uniqueMemberCount * 25)}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Active direct contributors</p>
        </div>

        {/* Card 3: Governance Audit */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Audit Readiness
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : timesheets.length === 0 ? 'Clear' : 'Action Required'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${timesheets.length === 0 ? 'bg-emerald-500 w-full' : 'bg-amber-500 w-2/3'}`} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Weekly compliance status</p>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal 
        isOpen={!!rejectComment} 
        onClose={() => { setRejectComment(null); setRejectText(''); }}
        title="Reject Timesheet"
        maxWidth="md"
      >
        <p className="text-xs sm:text-sm text-slate-500 mb-4">
          Provide a clear reason for rejection so the employee knows what to adjust before resubmitting.
        </p>
        <textarea
          autoFocus
          rows={3}
          value={rejectText}
          onChange={(e) => setRejectText(e.target.value)}
          placeholder="Enter rejection reason..."
          className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all shadow-2xs resize-none"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <button
            onClick={() => { setRejectComment(null); setRejectText(''); }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRejectSubmit}
            disabled={processingId === rejectComment?.timesheetId}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
          >
            {processingId === rejectComment?.timesheetId ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </Modal>

      {/* Approvals Table Ledger */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <LoadingSpinner size="md" />
            <p className="text-xs font-mono font-medium text-slate-500">Loading pending approvals...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="font-semibold text-slate-800">Error loading approvals</p>
            <p className="text-sm text-rose-600">{error}</p>
            <button 
              onClick={fetchApprovals} 
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500">
            <svg className="w-20 h-20 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
              <circle cx="60" cy="60" r="44" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" fill="#F8FAFC" />
              <path d="M42 62L54 74L78 46" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-base font-bold text-slate-900 ">No pending approvals</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {uniqueMemberCount === 0
                ? 'No team members have submitted timesheets for review yet.'
                : 'All submitted timesheets from your team have been reviewed.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Employee</th>
                  <th scope="col" className="px-5 py-3.5">Timesheet Week</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Expected</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Logged</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Variance</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timesheets.map((ts) => {
                  const emp = employeeMap[ts.employeeId];
                  const isBusy = processingId === ts.id;
                  
                  return (
                    <tr key={ts.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800 shadow-2xs">
                            {getInitials(emp?.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-sm ">
                              {emp ? emp.name : <span className="text-slate-400 text-xs font-mono">{ts.employeeId.slice(0, 8)}…</span>}
                            </div>
                            {emp && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                <span className="font-semibold text-slate-600">{emp.employeeCode}</span> · {emp.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-bold text-slate-900 text-sm ">
                          <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                          {formatWeekRange(ts.startDate)}
                        </div>
                        <Link
                          to={`/timesheets/${ts.id}`}
                          className="text-xs font-mono font-semibold text-slate-600 hover:text-slate-950 hover:underline mt-1 block"
                        >
                          View entries →
                        </Link>
                      </td>
                      {/* Expected */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-600 font-mono text-sm">
                          {ts.summary ? `${ts.summary.expectedHours}h` : '—'}
                        </span>
                      </td>
                      {/* Logged */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {ts.summary
                            ? `${ts.summary.loggedHours}h`
                            : ts.timeEntries ? `${ts.timeEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0)}h` : '0h'}
                        </span>
                      </td>
                      {/* Variance */}
                      <td className="px-4 py-4 text-right">
                        {ts.summary ? (
                          <span className={`font-bold font-mono text-sm ${
                            ts.summary.variance > 0 ? 'text-emerald-600' :
                            ts.summary.variance < 0 ? 'text-rose-600' : 'text-slate-400'
                          }`}>
                            {ts.summary.variance > 0 ? '+' : ''}{ts.summary.variance}h
                          </span>
                        ) : <span className="text-slate-400 font-mono text-sm">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(ts.id)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isBusy ? 'Processing…' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectComment({ timesheetId: ts.id }); setRejectText(''); }}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-semibold shadow-2xs disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};




