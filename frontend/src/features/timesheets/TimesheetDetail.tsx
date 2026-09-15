import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import {
  ArrowLeft, Send, PlusCircle, CheckCircle2,
  Clock, AlertTriangle, AlertCircle, RefreshCw
} from 'lucide-react';

interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  activityId: string;
  date: string;
  hours: number;
  remarks: string | null;
}

interface Timesheet {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  rejectionComment: string | null;
  timeEntries: TimeEntry[];
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

  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  const fetchTimesheet = useCallback(async () => {
    if (!id || !employee) return;
    try {
      setLoading(true);
      setError('');
      const [tsData, projectsData] = await Promise.all([
        apiClient(`/timesheets/${id}`),
        apiClient(`/employees/${employee.id}/projects`).catch(() => []),
      ]);

      setTimesheet(tsData);
      const projList: Project[] = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);
      setProjects(projList);

      // Load task and activity names for all unique project IDs in the timesheet entries
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
      setTaskMap(tMap);
      setActivityMap(aMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load timesheet details');
    } finally {
      setLoading(false);
    }
  }, [id, employee]);

  useEffect(() => {
    fetchTimesheet();
  }, [fetchTimesheet]);

  const handleSubmit = async () => {
    if (!timesheet) return;
    try {
      setSubmitting(true);
      await apiClient(`/timesheets/${id}/submit`, { method: 'PATCH' });
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

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const getProjectName = (projId: string) => {
    const p = projects.find((proj) => proj.id === projId);
    return p ? `${p.name} (${p.code})` : 'Project';
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-500 space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Loading timesheet details...</p>
      </div>
    );
  }

  if (error || !timesheet) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Timesheet Not Found</h2>
        <p className="text-sm text-red-600">{error || 'The requested timesheet could not be retrieved.'}</p>
        <Link
          to="/timesheets"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Timesheets
        </Link>
      </div>
    );
  }

  const totalHours = timesheet.timeEntries?.reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0) || 0;
  const isDraftOrRejected = timesheet.status === 'DRAFT' || timesheet.status === 'REJECTED';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/timesheets"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Timesheets
        </Link>
        <button
          onClick={fetchTimesheet}
          className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
          title="Refresh timesheet"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {actionFeedback && (
        <div className={`p-3 border rounded-lg text-sm flex items-center gap-2 animate-fadeIn ${
          actionFeedback.startsWith('Error')
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Timesheet Summary Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                timesheet.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                timesheet.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                timesheet.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-gray-100 text-gray-700 border border-gray-200'
              }`}>
                {timesheet.status}
              </span>
              <span className="text-xs text-gray-400 font-mono">ID: {timesheet.id.slice(0, 8)}...</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              Week of {formatWeekRange(timesheet.startDate)}
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Recorded Hours</p>
              <p className="text-2xl font-bold text-blue-600">{totalHours} hrs</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Entries</p>
              <p className="text-2xl font-bold text-gray-800">{timesheet.timeEntries?.length || 0}</p>
            </div>
          </div>
        </div>

        {/* State Banners */}
        {timesheet.status === 'REJECTED' && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-red-800">Timesheet Rejected by Manager</h3>
              <p className="text-sm text-red-700">
                {timesheet.rejectionComment || 'No rejection comment provided by your manager.'}
              </p>
              <p className="text-xs text-red-600 mt-1">
                Please make necessary entry changes and submit the timesheet again.
              </p>
            </div>
          </div>
        )}

        {timesheet.status === 'SUBMITTED' && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-blue-800">Under Review</h3>
              <p className="text-xs text-blue-700 mt-0.5">
                This timesheet has been submitted and is currently pending review by your team manager. Entries are locked.
              </p>
            </div>
          </div>
        )}

        {timesheet.status === 'APPROVED' && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-emerald-800">Timesheet Approved</h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your manager has approved this weekly timesheet. All entries are finalized and locked.
              </p>
            </div>
          </div>
        )}

        {/* Actions for Draft / Rejected */}
        {isDraftOrRejected && (
          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              {timesheet.timeEntries?.length === 0
                ? 'You must have at least one time entry in this week to submit.'
                : 'Review your logged hours below before submitting to your manager.'}
            </p>
            <div className="flex items-center gap-3">
              <Link
                to="/time-entries"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Log More Time
              </Link>
              <button
                onClick={handleSubmit}
                disabled={submitting || timesheet.timeEntries?.length === 0}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Submitting...' : timesheet.status === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Entries Breakdown Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-base font-bold text-gray-900">Recorded Week Entries</h2>
          <span className="text-xs text-gray-500">{timesheet.timeEntries?.length || 0} entries</span>
        </div>

        {timesheet.timeEntries?.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No time entries recorded for this week</p>
            <p className="text-sm text-gray-400 mt-1">Visit the Time Entries page to log hours against projects</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/75 border-b text-gray-600 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Project</th>
                  <th className="px-5 py-3.5">Task</th>
                  <th className="px-5 py-3.5">Activity</th>
                  <th className="px-5 py-3.5">Hours</th>
                  <th className="px-5 py-3.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {timesheet.timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-gray-900">
                        {getProjectName(entry.projectId)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-700 text-xs">
                      {taskMap[entry.taskId] || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-700 text-xs">
                      {activityMap[entry.activityId] || <span className="text-gray-300 italic">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded text-xs">
                        {entry.hours}h
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs max-w-sm truncate">
                      {entry.remarks || <span className="text-gray-300 italic">None</span>}
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
