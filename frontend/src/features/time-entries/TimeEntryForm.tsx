import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { Clock, CheckCircle2, AlertCircle, Calendar, Hash, FolderKanban, ListTodo, Layers, MessageSquare, X } from 'lucide-react';

export const TimeEntryForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { employee } = useCurrentEmployee();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load employee's assigned projects
  useEffect(() => {
    if (!employee) return;
    setLoadingProjects(true);
    apiClient(`/employees/${employee.id}/projects`)
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        setProjects(list.filter((p: any) => p.isActive));
      })
      .catch(err => setError(err.message || 'Failed to load assigned projects'))
      .finally(() => setLoadingProjects(false));
  }, [employee]);

  // Load tasks and activities when a project is selected
  useEffect(() => {
    if (selectedProject) {
      setLoadingDetails(true);
      Promise.all([
        apiClient(`/projects/${selectedProject}/tasks`),
        apiClient(`/projects/${selectedProject}/activities`),
      ])
        .then(([tasksData, activitiesData]) => {
          const tList = Array.isArray(tasksData) ? tasksData : [];
          const aList = Array.isArray(activitiesData) ? activitiesData : [];
          setTasks(tList.filter((t: any) => t.isActive));
          setActivities(aList.filter((a: any) => a.isActive));
          setError('');
        })
        .catch(err => {
          setTasks([]);
          setActivities([]);
          setError(err.message || 'Failed to load tasks and activities for the selected project');
        })
        .finally(() => setLoadingDetails(false));
    } else {
      setTasks([]);
      setActivities([]);
    }
    setSelectedTask('');
    setSelectedActivity('');
  }, [selectedProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validation
    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setError('Hours must be greater than 0');
      return;
    }
    if (parsedHours > 24) {
      setError('Hours logged in a single entry cannot exceed 24');
      return;
    }
    if (!selectedProject || !selectedTask || !selectedActivity) {
      setError('Please select Project, Task, and Activity');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }

    setSubmitting(true);

    try {
      await apiClient('/time-entries', {
        method: 'POST',
        body: JSON.stringify({
          projectId: selectedProject,
          taskId: selectedTask,
          activityId: selectedActivity,
          date,
          hours: parsedHours,
          remarks: remarks.trim() || null,
        }),
      });

      setSuccessMsg(`Successfully logged ${parsedHours} hours for ${date}`);
      setTimeout(() => setSuccessMsg(''), 4000);

      // Reset form fields
      setHours('');
      setRemarks('');
      // Keep selected project for quick entry of multiple tasks, but allow change
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save time entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Log Time
        </h2>
        <span className="text-xs text-gray-400 font-medium">All fields with * are required</span>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Project selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
              Project *
            </label>
            <select
              required
              disabled={loadingProjects}
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            >
              <option value="">— Select Assigned Project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {projects.length === 0 && !loadingProjects && (
              <p className="text-xs text-amber-600 mt-1">
                You are not currently assigned to any active projects.
              </p>
            )}
          </div>

          {/* Task selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-gray-400" />
              Task *
            </label>
            <select
              required
              disabled={!selectedProject || loadingDetails}
              value={selectedTask}
              onChange={e => setSelectedTask(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">
                {!selectedProject
                  ? '— Select a project first —'
                  : loadingDetails
                  ? 'Loading tasks...'
                  : tasks.length === 0
                  ? 'No tasks configured for this project'
                  : '— Select Task —'}
              </option>
              {tasks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.status})
                </option>
              ))}
            </select>
          </div>

          {/* Activity selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-400" />
              Activity *
            </label>
            <select
              required
              disabled={!selectedProject || loadingDetails}
              value={selectedActivity}
              onChange={e => setSelectedActivity(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">
                {!selectedProject
                  ? '— Select a project first —'
                  : loadingDetails
                  ? 'Loading activities...'
                  : activities.length === 0
                  ? 'No activities configured for this project'
                  : '— Select Activity —'}
              </option>
              {activities.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Work Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Hours input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-gray-400" />
              Hours Worked *
            </label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              required
              placeholder="e.g. 8"
              value={hours}
              onChange={e => setHours(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief description of work done..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            type="submit"
            disabled={submitting || !selectedProject || !selectedTask || !selectedActivity}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Clock className="w-4 h-4" />
            {submitting ? 'Saving Time Entry...' : 'Save Time Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

