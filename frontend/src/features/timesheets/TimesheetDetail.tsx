import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import {
  ArrowLeft, Send, PlusCircle, CheckCircle2,
  Clock, AlertTriangle, AlertCircle, RefreshCw, CalendarDays
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange } from '../../utils/date';
import {
  useGetTimesheetDetailsQuery,
  useGetTimesheetHistoryQuery,
  useGetEmployeeProjectsQuery,
  useSubmitTimesheetMutation,
  useGetMyTimesheetsQuery,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation
} from '../../store/apiSlice';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';

interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  activityId: string;
  date: string;
  hours: number;
  remarks: string | null;
}

interface TimesheetSummary {
  expectedHours: number;
  loggedHours: number;
  approvedHours: number;
  variance: number;
}

interface Timesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionComment: string | null;
  timeEntries: TimeEntry[];
  summary?: TimesheetSummary;
  createdAt?: string;
  updatedAt?: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

export const TimesheetDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { employee } = useCurrentEmployee();

  const { data: timesheetData, isLoading: tsLoading, error: tsError, refetch: refetchTs } = useGetTimesheetDetailsQuery(id || '', { skip: !id });
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useGetTimesheetHistoryQuery(id || '', { skip: !id });
  const { data: projectsData, isLoading: projectsLoading } = useGetEmployeeProjectsQuery(employee?.id as string, { skip: !employee });
  const [submitTimesheetM] = useSubmitTimesheetMutation();
  const [approveTimesheetM] = useApproveTimesheetMutation();
  const [rejectTimesheetM] = useRejectTimesheetMutation();
  const { data: myTimesheetsData } = useGetMyTimesheetsQuery({ limit: 100 }, { skip: !employee });
  const { showToast } = useToast();

  const timesheet: Timesheet | null = timesheetData || null;
  const auditHistory: any[] = Array.isArray(historyData) ? historyData : (historyData?.data ?? []);
  const projects: Project[] = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);
  const myTimesheets: Timesheet[] = Array.isArray(myTimesheetsData) ? myTimesheetsData : (myTimesheetsData?.data ?? []);

  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const loading = tsLoading || historyLoading || projectsLoading;
  const error = tsError ? 'Failed to load timesheet details' : '';
  const [submitting, setSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectText, setRejectText] = useState('');
  const [managerProcessing, setManagerProcessing] = useState(false);

  const loadMetadata = useCallback(async (tsData: Timesheet) => {
    try {
      const entries: TimeEntry[] = tsData?.timeEntries ?? [];
      const usedProjectIds = [...new Set(entries.map((e: TimeEntry) => e.projectId))];

      const tMap: Record<string, string> = {};
      const aMap: Record<string, string> = {};
      await Promise.allSettled(
        usedProjectIds.map(async (pid) => {
          const [tasksData, activitiesData] = await Promise.all([
            apiClient(`/projects/${pid}/tasks`).catch(() => []),
            apiClient(`/projects/${pid}/activities`).catch(() => []),
          ]);
          (Array.isArray(tasksData) ? tasksData : []).forEach((t: any) => { tMap[t.id] = t.name; });
          (Array.isArray(activitiesData) ? activitiesData : []).forEach((a: any) => { aMap[a.id] = a.name; });
        })
      );
      setActivityMap(prev => ({ ...prev, ...aMap }));
    } catch (err) {
      console.error('Failed to load tasks and activities metadata', err);
    }
  }, []);

  useEffect(() => {
    if (timesheet && !loading) {
      loadMetadata(timesheet);
    }
  }, [timesheet, loading, loadMetadata]);

  const fetchTimesheet = () => {
    refetchTs();
    refetchHistory();
  };

  const handleSubmit = async () => {
    if (!timesheet || !id) return;
    try {
      setSubmitting(true);
      await submitTimesheetM(id).unwrap();
      setActionFeedback('Timesheet submitted for manager review');
      setTimeout(() => setActionFeedback(''), 4000);
      fetchTimesheet();
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message || 'Failed to submit timesheet'}`);
      setTimeout(() => setActionFeedback(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      setManagerProcessing(true);
      await approveTimesheetM(id).unwrap();
      showToast('Timesheet approved successfully', 'success');
      fetchTimesheet();
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setManagerProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!id) return;
    const comment = rejectText.trim();
    if (!comment) {
      showToast('Rejection comment is required', 'error');
      return;
    }
    try {
      setManagerProcessing(true);
      await rejectTimesheetM({ id, comment }).unwrap();
      setRejectModalOpen(false);
      setRejectText('');
      showToast('Timesheet rejected', 'success');
      fetchTimesheet();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setManagerProcessing(false);
    }
  };

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return formatDateRange(start, end);
  };

  const getProjectName = (projId: string) => {
    const p = projects.find((proj) => proj.id === projId);
    return p ? `${p.name} (${p.code})` : 'Project';
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            APPROVED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            SUBMITTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            DRAFT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono font-medium">Loading timesheet details...</p>
      </div>
    );
  }

  if (error || !timesheet) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Timesheet Not Found</h2>
        <p className="text-sm text-rose-600">{error || 'The requested timesheet could not be retrieved.'}</p>
        <Link
          to="/timesheets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-medium hover:bg-slate-800 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Timesheets
        </Link>
      </div>
    );
  }

  const getMatrix = () => {
    if (!timesheet || !timesheet.timeEntries) return { rows: [], dayTotals: [0,0,0,0,0,0,0], grandTotal: 0 };
    const rowMap = new Map<string, any>();
    const dayTotals = [0,0,0,0,0,0,0];
    let grandTotal = 0;

    timesheet.timeEntries.forEach(entry => {
      const key = `${entry.projectId}_${entry.taskId}_${entry.activityId}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          projectId: entry.projectId,
          taskId: entry.taskId,
          activityId: entry.activityId,
          days: [0,0,0,0,0,0,0],
          total: 0
        });
      }
      const row = rowMap.get(key);
      const [y, m, d] = entry.date.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1; 
      const hrs = Number(entry.hours) || 0;
      row.days[dayIndex] += hrs;
      row.total += hrs;
      dayTotals[dayIndex] += hrs;
      grandTotal += hrs;
    });

    return { rows: Array.from(rowMap.values()), dayTotals, grandTotal };
  };

  const { rows, dayTotals, grandTotal } = getMatrix();
  const isOwner = timesheet.employeeId === employee?.id;
  const isManagerViewing = !isOwner;
  const isDraftOrRejected = timesheet.status === 'DRAFT' || timesheet.status === 'REJECTED';

  // Navigation Logic
  let prevTsId = null;
  let nextTsId = null;
  if (isOwner && myTimesheets.length > 0) {
    const sorted = [...myTimesheets].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const currentIndex = sorted.findIndex(t => t.id === timesheet.id);
    if (currentIndex > 0) nextTsId = sorted[currentIndex - 1].id; // newer week is "next" in time
    if (currentIndex !== -1 && currentIndex < sorted.length - 1) prevTsId = sorted[currentIndex + 1].id; // older week is "prev" in time
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to={isManagerViewing ? "/approvals" : "/timesheets"}
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-600 hover:text-slate-950 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {isManagerViewing ? "Back to Approvals" : "Back to Timesheets"}
        </Link>
        <div className="flex items-center gap-2">
          {prevTsId && (
            <Link
              to={`/timesheets/${prevTsId}`}
              className="p-2 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs text-xs font-semibold"
            >
              &larr; Prev Week
            </Link>
          )}
          {nextTsId && (
            <Link
              to={`/timesheets/${nextTsId}`}
              className="p-2 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs text-xs font-semibold"
            >
              Next Week &rarr;
            </Link>
          )}
          <button
            onClick={fetchTimesheet}
            className="p-2 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh timesheet"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className={`p-4 border rounded-2xl text-xs font-mono flex items-center gap-2.5 animate-fadeIn shadow-2xs ${
          actionFeedback.startsWith('Error')
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {actionFeedback.startsWith('Error')
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />
          }
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Timesheet Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {renderStatusBadge(timesheet.status)}
              <span className="text-xs text-slate-400 font-mono">ID: {timesheet.id.slice(0, 8)}...</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 mt-2 font-display tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-slate-400" />
              Week of {formatWeekRange(timesheet.startDate)}
            </h1>
          </div>

          {/* Hours Summary Panel */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Expected */}
            <div className="min-w-[90px]">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Expected</p>
              <p className="text-xl font-extrabold text-slate-700 font-display mt-0.5">
                {timesheet.summary ? `${timesheet.summary.expectedHours}h` : `${grandTotal}h`}
              </p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            {/* Logged */}
            <div className="min-w-[80px]">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Logged</p>
              <p className="text-xl font-extrabold text-slate-950 font-display mt-0.5">
                {timesheet.summary ? `${timesheet.summary.loggedHours}h` : `${grandTotal}h`}
              </p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            {/* Approved */}
            <div className="min-w-[90px]">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Approved</p>
              <p className={`text-xl font-extrabold font-display mt-0.5 ${
                timesheet.summary && timesheet.summary.approvedHours > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {timesheet.summary ? `${timesheet.summary.approvedHours}h` : '—'}
              </p>
            </div>
            {timesheet.summary && (
              <>
                <div className="w-px h-10 bg-slate-200" />
                {/* Variance */}
                <div className="min-w-[80px]">
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Variance</p>
                  <p className={`text-xl font-extrabold font-display mt-0.5 ${
                    timesheet.summary.variance > 0
                      ? 'text-emerald-600'
                      : timesheet.summary.variance < 0
                      ? 'text-rose-600'
                      : 'text-slate-400'
                  }`}>
                    {timesheet.summary.variance > 0 ? '+' : ''}{timesheet.summary.variance}h
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* State Banners */}
        {timesheet.status === 'REJECTED' && (
          <div className="p-4.5 bg-rose-50/80 border border-rose-200 rounded-2xl flex items-start gap-3.5 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-rose-900">Timesheet Rejected by Manager</h3>
              <p className="text-xs sm:text-sm text-rose-700">
                {timesheet.rejectionComment || 'No rejection comment provided by your manager.'}
              </p>
              <p className="text-xs text-rose-600 font-mono mt-1">
                Please make necessary entry changes and submit the timesheet again.
              </p>
            </div>
          </div>
        )}

        {timesheet.status === 'SUBMITTED' && (
          <div className="p-4.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-blue-900">Under Review</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                This timesheet has been submitted and is currently pending review by your team manager. Entries are locked.
              </p>
            </div>
          </div>
        )}

        {timesheet.status === 'APPROVED' && (
          <div className="p-4.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Timesheet Approved</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your manager has approved this weekly timesheet. All entries are finalized and locked.
              </p>
            </div>
          </div>
        )}

        {/* Manager Review Actions */}
        {isManagerViewing && timesheet.status === 'SUBMITTED' && (
          <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-medium w-full md:w-auto">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Pending your review. Verify logged hours against expected activities.</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setRejectText(''); setRejectModalOpen(true); }}
                disabled={managerProcessing}
                className="inline-flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold px-4.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-2xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                Reject Timesheet
              </button>
              <button
                onClick={handleApprove}
                disabled={managerProcessing}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                <CheckCircle2 className="w-4 h-4" />
                {managerProcessing ? 'Processing...' : 'Approve Timesheet'}
              </button>
            </div>
          </div>
        )}

        {/* Actions for Draft / Rejected (Employee only) */}
        {isOwner && isDraftOrRejected && (
          <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {timesheet.timeEntries?.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium w-full md:w-auto">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You must have at least one time entry in this week to submit.</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">
                Review your logged hours below before submitting to your manager.
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/time-entries"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200/90 rounded-xl text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <PlusCircle className="w-4 h-4" />
                Log More Time
              </Link>
              <button
                onClick={handleSubmit}
                disabled={submitting || timesheet.timeEntries?.length === 0}
                className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-semibold px-4.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : timesheet.status === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entries Breakdown Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900 font-display">Recorded Week Entries</h2>
          <span className="text-xs font-mono font-semibold text-slate-500">{timesheet.timeEntries?.length || 0} entries</span>
        </div>

        {timesheet.timeEntries?.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-base font-bold text-slate-900 font-display">No time entries recorded for this week</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">Visit the Time Entries page to log hours against projects</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Project</th>
                  <th scope="col" className="px-5 py-3.5">Task</th>
                  <th scope="col" className="px-5 py-3.5">Activity</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Mon</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Tue</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Wed</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Thu</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Fri</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Sat</th>
                  <th scope="col" className="px-3 py-3.5 text-center">Sun</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-bold text-slate-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-900 truncate block max-w-[150px] text-xs sm:text-sm" title={getProjectName(row.projectId)}>
                        {getProjectName(row.projectId)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700 text-xs truncate max-w-[150px]">
                      {row.taskId || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-4 text-slate-700 text-xs truncate max-w-[120px]" title={activityMap[row.activityId]}>
                      {activityMap[row.activityId] || <span className="text-slate-300 italic">—</span>}
                    </td>
                    {row.days.map((hrs: number, j: number) => (
                      <td key={j} className="px-3 py-4 text-center">
                        {hrs > 0 ? (
                          <span className="inline-flex items-center justify-center font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 text-xs shadow-2xs">
                            {hrs}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-4 text-right">
                      <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm">{row.total}h</span>
                    </td>
                  </tr>
                ))}
                {/* Grand Totals Row */}
                <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                  <td colSpan={3} className="px-5 py-4 text-right font-bold text-slate-700 uppercase text-xs tracking-wider font-mono">
                    Daily Totals
                  </td>
                  {dayTotals.map((tot, j) => (
                    <td key={j} className="px-3 py-4 text-center font-bold text-slate-900 font-mono text-xs sm:text-sm">
                      {tot > 0 ? `${tot}h` : '-'}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right font-extrabold text-slate-950 text-sm sm:text-base font-mono">
                    {grandTotal}h
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit History Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900 font-display">Status History & Audit Ledger</h2>
        </div>
        <div className="p-6">
          {auditHistory.length === 0 ? (
            <p className="text-xs text-slate-500 font-mono">No status history records available.</p>
          ) : (
            <div className="space-y-4">
              {auditHistory.map((record, index) => {
                const actionColors: Record<string, string> = {
                  SUBMITTED: 'bg-blue-500',
                  RESUBMITTED: 'bg-blue-500',
                  APPROVED: 'bg-emerald-500',
                  REJECTED: 'bg-rose-500',
                };
                const dotColor = actionColors[record.action] ?? 'bg-slate-400';
                return (
                  <div key={record.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 ${dotColor} rounded-full mt-1.5 shrink-0 ring-4 ring-slate-100`} />
                      {index < auditHistory.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wide">{record.action}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        {new Date(record.timestamp).toLocaleString()}
                        {record.actorId && (
                          <span className="ml-1 text-slate-400">· {record.actorId.slice(0, 8)}…</span>
                        )}
                      </p>
                      {record.comments && (
                        <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 break-words font-sans">
                          &ldquo;{record.comments}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal 
        isOpen={rejectModalOpen} 
        onClose={() => setRejectModalOpen(false)}
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
            onClick={() => setRejectModalOpen(false)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRejectSubmit}
            disabled={managerProcessing}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
          >
            {managerProcessing ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
