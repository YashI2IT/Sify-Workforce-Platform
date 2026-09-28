import { useNavigate } from 'react-router-dom';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useGetMyTimesheetsQuery } from '../../store/apiSlice';
import { CalendarDays, AlertCircle, RefreshCw, ChevronRight, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange } from '../../utils/date';

interface Timesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionComment?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const MyTimesheets = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const navigate = useNavigate();

  const { data: timesheetsData, isLoading: timesheetsLoading, error: timesheetsError, refetch: fetchTimesheets } = useGetMyTimesheetsQuery({ limit: 100 }, { skip: !employee });

  const loading = empLoading || timesheetsLoading;
  const error = timesheetsError ? 'Failed to load timesheets' : '';
  const timesheets: Timesheet[] = Array.isArray(timesheetsData) ? timesheetsData : (timesheetsData?.data ?? []);

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return formatDateRange(start, end);
  };

  const approvedCount = timesheets.filter(t => t.status === 'APPROVED').length;
  const submittedCount = timesheets.filter(t => t.status === 'SUBMITTED').length;
  const draftCount = timesheets.filter(t => t.status === 'DRAFT').length;
  const rejectedCount = timesheets.filter(t => t.status === 'REJECTED').length;
  const approvedRate = timesheets.length > 0 ? Math.round((approvedCount / timesheets.length) * 100) : 0;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            APPROVED
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            SUBMITTED
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            DRAFT
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight ">
                  My Timesheets
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {timesheets.length} {timesheets.length === 1 ? 'cycle' : 'cycles'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Weekly timesheet summaries, approval workflow lifecycles, and manager submission audits.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchTimesheets}
            className="p-2.5 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh timesheets"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/time-entries')}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99]"
          >
            <Clock className="w-4 h-4" />
            Log Time
          </button>
        </div>
      </div>

      {/* Executive Telemetry Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Timesheet Cycles */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Recorded Cycles
            </span>
            <CalendarDays className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : timesheets.length}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">weeks</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div className="bg-slate-950 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Automatic Monday–Sunday cycles</p>
        </div>

        {/* Card 2: Approved Timesheets */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Approved Cycles
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : approvedCount}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">({approvedRate}%)</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${approvedRate}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Verified by management lead</p>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Pending Review
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : submittedCount}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">submitted</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${timesheets.length > 0 ? (submittedCount / timesheets.length) * 100 : 0}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Awaiting manager approval</p>
        </div>

        {/* Card 4: Draft / Open */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Draft & Open
            </span>
            {rejectedCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-600 font-bold">
                <ShieldAlert className="w-3 h-3" /> {rejectedCount} rejected
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-300" />
            )}
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : draftCount}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">draft cycles</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-slate-700 h-full rounded-full transition-all duration-500" 
                style={{ width: `${timesheets.length > 0 ? (draftCount / timesheets.length) * 100 : 0}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Can log time or submit for review</p>
        </div>
      </div>

      {/* Timesheets List Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 text-center text-slate-500 space-y-3">
            <LoadingSpinner size="md" />
            <p className="text-xs font-mono font-medium text-slate-500">Loading timesheets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-3">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="font-semibold text-slate-800">Error loading timesheets</p>
            <p className="text-sm text-rose-600">{error}</p>
            <button
              onClick={fetchTimesheets}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        ) : timesheets.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500">
            <svg className="w-20 h-20 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
              <rect x="22" y="26" width="76" height="68" rx="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M40 50H80M40 64H80M40 78H60" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
              <circle cx="88" cy="34" r="10" fill="#0F172A" />
              <path d="M84 34H92M88 30V38" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="text-base font-bold text-slate-900 ">No timesheets recorded yet</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Timesheets are automatically created when you record your daily project work hours.
            </p>
            <button
              onClick={() => navigate('/time-entries')}
              className="mt-4 inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              Log First Time Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Timesheet Week</th>
                  <th scope="col" className="px-5 py-3.5">Submission Status</th>
                  <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timesheets.map(ts => (
                  <tr key={ts.id} className="hover:bg-slate-50/70 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm ">
                        {formatWeekRange(ts.startDate)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Starts: {new Date(ts.startDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        {renderStatusBadge(ts.status)}
                        {ts.status === 'REJECTED' && ts.rejectionComment && (
                          <div className="text-xs text-rose-600 mt-1 font-medium truncate max-w-xs flex items-center gap-1">
                            <span className="font-bold">Reason:</span> {ts.rejectionComment}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/timesheets/${ts.id}`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};



