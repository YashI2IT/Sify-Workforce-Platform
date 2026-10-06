import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, CalendarDays } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange } from '../../utils/date';
import {
  useGetTimesheetDetailsQuery,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation
} from '../../store/apiSlice';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';

export const ManagerTimesheetReview = () => {
  const { id } = useParams<{ id: string }>();
  const { data: timesheetData, isLoading: tsLoading, error: tsError, refetch } = useGetTimesheetDetailsQuery(id || '', { skip: !id });
  const [approveTimesheetM] = useApproveTimesheetMutation();
  const [rejectTimesheetM] = useRejectTimesheetMutation();
  const { showToast } = useToast();

  const [projectMap, setProjectMap] = useState<Record<string, { name: string, code: string }>>({});
  const [taskMap, setTaskMap] = useState<Record<string, { name: string, ticketId: string }>>({});
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const [employeeInfo, setEmployeeInfo] = useState<{ name: string, email: string } | null>(null);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectText, setRejectText] = useState('');
  const [managerProcessing, setManagerProcessing] = useState(false);

  const timesheet = timesheetData;
  const loading = tsLoading;
  const error = tsError ? 'Failed to load timesheet details' : '';

  const loadMetadata = useCallback(async (tsData: any) => {
    try {
      const entries = tsData?.timeEntries ?? [];
      const usedProjectIds = [...new Set(entries.map((e: any) => e.projectId))] as string[];

      const pMap: Record<string, any> = {};
      const tMap: Record<string, any> = {};
      const aMap: Record<string, string> = {};
      
      const projs = await apiClient('/projects').catch(() => []);
      if (Array.isArray(projs)) {
        projs.forEach((p: any) => {
          pMap[p.id] = { name: p.name, code: p.code };
        });
      }

      if (tsData?.employeeId) {
        apiClient(`/employees/${tsData.employeeId}`)
          .then((emp: any) => {
            if (emp) setEmployeeInfo({ name: emp.name, email: emp.email });
          })
          .catch(() => {});
      }

      await Promise.allSettled(
        usedProjectIds.map(async (pid) => {
          // Fetch tasks and activities
          const [tasksData, activitiesData] = await Promise.all([
            apiClient(`/projects/${pid}/tasks`).catch(() => []),
            apiClient(`/projects/${pid}/activities`).catch(() => []),
          ]);
          (Array.isArray(tasksData) ? tasksData : []).forEach((t: any) => { 
            tMap[t.id] = { name: t.name, ticketId: t.ticketId || t.id.slice(0,8) }; 
          });
          (Array.isArray(activitiesData) ? activitiesData : []).forEach((a: any) => { 
            aMap[a.id] = a.name; 
          });

          // If the project wasn't in the global list, fetch it individually
          if (!pMap[pid]) {
            const projData = await apiClient(`/projects/${pid}`).catch(() => null);
            if (projData && projData.id) {
              pMap[pid] = { name: projData.name, code: projData.code };
            }
          }
        })
      );
      setProjectMap(prev => ({ ...prev, ...pMap }));
      setTaskMap(prev => ({ ...prev, ...tMap }));
      setActivityMap(prev => ({ ...prev, ...aMap }));
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  }, []);

  useEffect(() => {
    if (timesheet && !loading) {
      loadMetadata(timesheet);
    }
  }, [timesheet, loading, loadMetadata]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setManagerProcessing(true);
      await approveTimesheetM(id).unwrap();
      showToast('Timesheet approved successfully', 'success');
      refetch();
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
      refetch();
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

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono font-medium">Loading timesheet review...</p>
      </div>
    );
  }

  if (error || !timesheet) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-9 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Timesheet Not Found</h2>
        <p className="text-sm text-rose-600">{error || 'The requested timesheet could not be retrieved.'}</p>
        <Link
          to="/approvals"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-medium hover:bg-slate-800 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Pending Approvals
        </Link>
      </div>
    );
  }

  const entries = timesheet.timeEntries || [];
  
  // Calculate day totals
  const dayTotals = [0,0,0,0,0,0,0];
  let grandTotal = 0;
  entries.forEach((e: any) => {
    const [y, m, d] = e.date.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
    dayTotals[dayIndex] += Number(e.hours);
    grandTotal += Number(e.hours);
  });

  const empName = timesheet.employee?.name || employeeInfo?.name || 'Unknown Employee';
  const empEmail = timesheet.employee?.email || employeeInfo?.email || '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/approvals"
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-600 hover:text-slate-950 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Pending Approvals
        </Link>
        <button
          onClick={() => refetch()}
          className="p-2 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-[14px] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold font-mono border shadow-2xs ${
                timesheet.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                timesheet.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200/80' :
                timesheet.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200/80' :
                'bg-slate-100 text-slate-700 border-slate-200/80'
              }`}>
                {timesheet.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {timesheet.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-950 mt-3 font-display tracking-tight">
              Timesheet Approval
            </h1>
            <div className="mt-2 text-sm text-slate-600 flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  {empName[0] || '?'}
                </div>
                {empName}
                <span className="text-slate-400 font-normal">({empEmail})</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-mono text-slate-600">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              {formatWeekRange(timesheet.startDate)}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-[14px] border border-slate-200/80 shadow-2xs">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Expected</p>
              <p className="text-xl font-extrabold text-slate-700 font-display mt-0.5">
                {timesheet.summary?.expectedHours || 40}h
              </p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Logged</p>
              <p className="text-xl font-extrabold text-slate-950 font-display mt-0.5">
                {timesheet.summary?.loggedHours || grandTotal}h
              </p>
            </div>
            {timesheet.summary && (
              <>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Variance</p>
                  <p className={`text-xl font-extrabold font-display mt-0.5 ${
                    timesheet.summary.variance > 0 ? 'text-emerald-600' : timesheet.summary.variance < 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}>
                    {timesheet.summary.variance > 0 ? '+' : ''}{timesheet.summary.variance}h
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {timesheet.status === 'REJECTED' && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Previously Rejected</h3>
            <p className="text-sm text-rose-700 mt-1">{timesheet.rejectionComment}</p>
          </div>
        )}

        {timesheet.status === 'SUBMITTED' && (
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={() => { setRejectText(''); setRejectModalOpen(true); }}
              disabled={managerProcessing}
              className="inline-flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-2xs disabled:opacity-50"
            >
              Reject Timesheet
            </button>
            <button
              onClick={handleApprove}
              disabled={managerProcessing}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {managerProcessing ? 'Processing...' : 'Approve Timesheet'}
            </button>
          </div>
        )}
      </div>

      {/* DAILY SUMMARY */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-slate-900 font-display">Timesheet Daily Summary</h2>
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-sm pr-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <div key={day} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">{day}</span>
              <span className="font-extrabold text-slate-800 mt-0.5">{dayTotals[i] > 0 ? `${dayTotals[i]}h` : '-'}</span>
            </div>
          ))}
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-900 uppercase font-mono">Total</span>
            <span className="font-extrabold text-slate-950 mt-0.5">{grandTotal}h</span>
          </div>
        </div>
      </div>

      {/* RECORDED TIME ENTRIES */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70">
          <h2 className="text-sm font-bold text-slate-900 font-display">Recorded Time Entries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Task ID / Ticket</th>
                <th className="px-5 py-3.5">Project</th>
                <th className="px-5 py-3.5">Task</th>
                <th className="px-5 py-3.5">Activity</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Hours</th>
                <th className="px-5 py-3.5">Remarks</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-500 text-sm">
                    No time entries found.
                  </td>
                </tr>
              ) : entries.map((entry: any, i: number) => {
                const p = projectMap[entry.projectId] || { name: 'Unknown', code: '??' };
                const t = taskMap[entry.taskId] || { name: 'Unknown Task', ticketId: entry.taskId };
                const aName = activityMap[entry.activityId] || 'Unknown';
                return (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">{empName}</td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <div className="font-bold text-slate-900">{entry.taskId ? entry.taskId.slice(0,8) : '—'}</div>
                      {t.ticketId && t.ticketId !== entry.taskId.slice(0,8) && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{t.ticketId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100" title={`${p.name} (${p.code})`}>
                      {p.name} <span className="text-slate-400 font-normal">({p.code})</span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">{t.name}</td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">{aName}</td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">{entry.date}</td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">{entry.hours}h</td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100" title={entry.remarks || ''}>
                      {entry.remarks || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        timesheet.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                        timesheet.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {timesheet.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={rejectModalOpen} 
        onClose={() => setRejectModalOpen(false)}
        title="Reject Timesheet"
        maxWidth="md"
      >
        <p className="text-xs sm:text-sm text-slate-500 mb-4">
          Provide a mandatory remark for rejection so the employee knows what to adjust before resubmitting.
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Rejection Remark *</label>
          <textarea
            autoFocus
            rows={3}
            value={rejectText}
            onChange={(e) => setRejectText(e.target.value)}
            placeholder="E.g. Missing task breakdown for Tuesday..."
            className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all shadow-2xs resize-none"
          />
        </div>
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
            {managerProcessing ? 'Rejecting...' : 'Reject Timesheet'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
