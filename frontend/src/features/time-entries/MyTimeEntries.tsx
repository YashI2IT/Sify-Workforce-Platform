import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient';
import { TimeEntryForm } from './TimeEntryForm';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { Clock, History, AlertCircle, RefreshCw } from 'lucide-react';

interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  activityId: string;
  date: string;
  hours: number;
  remarks: string | null;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface Task {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
}

export const MyTimeEntries = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEntries = useCallback(async () => {
    if (!employee) return;
    try {
      setLoading(true);
      setError('');
      const [entriesRes, projectsRes] = await Promise.all([
        apiClient(`/employees/${employee.id}/time-entries?limit=100`),
        apiClient(`/employees/${employee.id}/projects`).catch(() => []),
      ]);

      const entryList: TimeEntry[] = Array.isArray(entriesRes) ? entriesRes : (entriesRes?.data ?? []);
      const projList: Project[] = Array.isArray(projectsRes) ? projectsRes : (projectsRes?.data ?? []);

      setEntries(entryList);
      setProjects(projList);

      // Load tasks and activities for each project that appears in entries
      const usedProjectIds = [...new Set(entryList.map((e) => e.projectId))];
      const tMap: Record<string, string> = {};
      const aMap: Record<string, string> = {};

      await Promise.allSettled(
        usedProjectIds.map(async (pid) => {
          const [tasksData, activitiesData] = await Promise.all([
            apiClient(`/projects/${pid}/tasks`).catch(() => []),
            apiClient(`/projects/${pid}/activities`).catch(() => []),
          ]);
          const tList: Task[] = Array.isArray(tasksData) ? tasksData : [];
          const aList: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];
          tList.forEach((t) => { tMap[t.id] = t.name; });
          aList.forEach((a) => { aMap[a.id] = a.name; });
        })
      );

      setTaskMap(tMap);
      setActivityMap(aMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load time entries');
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (!empLoading) {
      fetchEntries();
    }
  }, [fetchEntries, empLoading]);

  const getProjectName = (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    return proj ? `${proj.name} (${proj.code})` : 'Assigned Project';
  };

  const totalHoursLogged = entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-blue-600" />
            Time Entries
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Log your daily project hours and track your recorded activities.
          </p>
        </div>
        <button
          onClick={fetchEntries}
          className="p-2 border rounded-lg hover:bg-gray-50 text-gray-600 transition-colors self-start sm:self-auto"
          title="Refresh entries"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Time Entry Form */}
      <TimeEntryForm onSuccess={fetchEntries} />

      {/* Historical Entries Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h2 className="text-base font-bold text-gray-900">Recent Time Log</h2>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Total Logged: <span className="font-bold text-blue-600">{totalHoursLogged} hrs</span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm">Loading recent entries...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500" />
            <p className="font-semibold text-gray-800">Error loading entries</p>
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={fetchEntries} className="mt-2 text-sm text-blue-600 hover:underline font-medium">
              Try Again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-base font-medium text-gray-700">No time entries recorded yet</p>
            <p className="text-sm text-gray-400 mt-1">Use the form above to record your project work</p>
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
                {entries.map((entry) => (
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
                    <td className="px-5 py-4 text-gray-500 text-xs max-w-xs truncate">
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
