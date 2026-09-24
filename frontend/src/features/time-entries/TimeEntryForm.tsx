import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { Clock, CheckCircle2, AlertCircle, Calendar, Hash, FolderKanban, ListTodo, Layers, MessageSquare, X } from 'lucide-react';
import {
  useGetEmployeeProjectsQuery,
  useGetProjectTasksQuery,
  useGetProjectActivitiesQuery,
  useGetTimeEntryQuery,
  useCreateTimeEntryMutation
} from '../../store/apiSlice';

export const TimeEntryForm = ({ onSuccess, defaultValues, selectedDate, embedded = false }: { onSuccess?: () => void, defaultValues?: any, selectedDate?: string, embedded?: boolean }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const reuseId = searchParams.get('reuse');
  const { employee } = useCurrentEmployee();

  const [selectedProject, setSelectedProject] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return selectedDate || `${y}-${m}-${day}`;
  });

  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);
  const [hours, setHours] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: projectsData, isLoading: loadingProjects } = useGetEmployeeProjectsQuery(employee?.id as string, { skip: !employee });
  const projects = Array.isArray(projectsData) ? projectsData.filter((p: any) => p.isActive) : [];

  const { data: tasksData, isLoading: loadingTasks } = useGetProjectTasksQuery(selectedProject, { skip: !selectedProject });
  const tasks = Array.isArray(tasksData) ? tasksData.filter((t: any) => t.isActive) : [];

  const { data: activitiesData, isLoading: loadingActivities } = useGetProjectActivitiesQuery(selectedProject, { skip: !selectedProject });
  const activities = Array.isArray(activitiesData) ? activitiesData.filter((a: any) => a.isActive) : [];

  const loadingDetails = loadingTasks || loadingActivities;

  const [createTimeEntryM] = useCreateTimeEntryMutation();
  const { data: reuseEntryData, isSuccess: reuseEntryLoaded } = useGetTimeEntryQuery(reuseId || '', { skip: !reuseId });

  // Handle Reuse Entry
  useEffect(() => {
    if (reuseId && reuseEntryLoaded && reuseEntryData) {
      if (projects.find((p: any) => p.id === reuseEntryData.projectId)) {
        setSelectedProject(reuseEntryData.projectId);
        setHours(reuseEntryData.hours?.toString() || '');
        setRemarks(reuseEntryData.remarks || '');
        // Task and activity will be set by the other effect once they load
      }
      searchParams.delete('reuse');
      setSearchParams(searchParams, { replace: true });
    }
  }, [reuseId, reuseEntryLoaded, reuseEntryData, projects, searchParams, setSearchParams]);

  // Handle Default Values and LocalStorage on mount
  useEffect(() => {
    if (!employee || reuseId) return;
    if (projects.length === 0) return;

    if (defaultValues) {
      if (projects.find((p: any) => p.id === defaultValues.projectId)) {
        setSelectedProject(defaultValues.projectId);
        setHours(defaultValues.hours?.toString() || '');
        setRemarks(defaultValues.remarks || '');
      }
    } else {
      const savedProject = localStorage.getItem('last_project_id');
      if (savedProject && projects.find((p: any) => p.id === savedProject)) {
        setSelectedProject(savedProject);
      }
    }
  }, [employee, defaultValues, projects, reuseId]);

  // Auto-select tasks and activities when they load
  useEffect(() => {
    if (selectedProject && !loadingDetails) {
      let targetTaskId: string | null = null;
      let targetActivityId: string | null = null;

      if (defaultValues?.projectId === selectedProject) {
        targetTaskId = defaultValues.taskId;
        targetActivityId = defaultValues.activityId;
      } else if (reuseEntryData?.projectId === selectedProject) {
        targetTaskId = reuseEntryData.taskId;
        targetActivityId = reuseEntryData.activityId;
      } else if (localStorage.getItem('last_project_id') === selectedProject) {
        targetTaskId = localStorage.getItem('last_task_id');
        targetActivityId = localStorage.getItem('last_activity_id');
      }

      if (targetTaskId && tasks.find((t: any) => t.id === targetTaskId)) {
        setSelectedTask(targetTaskId);
      } else if (tasks.length > 0 && !selectedTask) {
        setSelectedTask(tasks[0].id);
      } else if (tasks.length === 0) {
        setSelectedTask('');
      }

      if (targetActivityId && activities.find((a: any) => a.id === targetActivityId)) {
        setSelectedActivity(targetActivityId);
      } else if (activities.length > 0 && !selectedActivity) {
        setSelectedActivity(activities[0].id);
      } else if (activities.length === 0) {
        setSelectedActivity('');
      }
    }
  }, [selectedProject, loadingDetails, tasks, activities, defaultValues, reuseEntryData, selectedTask, selectedActivity]);

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedTask('');
    setSelectedActivity('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setError('Hours must be a positive number');
      return;
    }
    if (parsedHours > 24) {
      setError('Hours cannot exceed 24 in a single entry');
      return;
    }
    if (Math.round(parsedHours * 4) !== parsedHours * 4) {
      setError('Hours must be in 0.25h increments (e.g., 0.25, 0.5, 0.75, 1)');
      return;
    }
    if (!selectedProject || !selectedTask || !selectedActivity) {
      setError('Project, Task, and Activity are all required');
      return;
    }
    const taskBelongs = tasks.some((t) => t.id === selectedTask);
    const actBelongs = activities.some((a) => a.id === selectedActivity);
    if (!taskBelongs || !actBelongs) {
      setError('Selected Task or Activity does not belong to the selected project');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }

    setSubmitting(true);

    try {
      await createTimeEntryM({
        projectId: selectedProject,
        taskId: selectedTask,
        activityId: selectedActivity,
        date,
        hours: parsedHours,
        remarks: remarks.trim() || null,
      }).unwrap();

      setSuccessMsg(`Successfully logged ${parsedHours} hours for ${date}`);
      setTimeout(() => setSuccessMsg(''), 4000);

      localStorage.setItem('last_project_id', selectedProject);
      localStorage.setItem('last_task_id', selectedTask);
      localStorage.setItem('last_activity_id', selectedActivity);

      setHours('');
      setRemarks('');
      
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save time entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={embedded ? "w-full" : "bg-white border border-slate-200/90 rounded-2xl p-6 mb-6 shadow-2xs"}>
      {!embedded && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
            <Clock className="w-4 h-4 text-slate-950" />
            Log Daily Time
          </h2>
          <span className="text-xs text-slate-400 font-mono">All fields with * are required</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Project selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
              Project *
            </label>
            <select
              required
              disabled={loadingProjects}
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">— Select Assigned Project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {projects.length === 0 && !loadingProjects && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                You are not currently assigned to any active projects.
              </p>
            )}
          </div>

          {/* Task selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-slate-400" />
              Task *
            </label>
            <select
              required
              disabled={!selectedProject || loadingDetails}
              value={selectedTask}
              onChange={e => setSelectedTask(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Activity *
            </label>
            <select
              required
              disabled={!selectedProject || loadingDetails}
              value={selectedActivity}
              onChange={e => setSelectedActivity(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs disabled:bg-slate-100 disabled:text-slate-400"
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Work Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Hours input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
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
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief description of work done..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3.5 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting || !selectedProject || !selectedTask || !selectedActivity}
            className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white font-medium py-2.5 px-5 rounded-xl text-sm transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
          >
            <Clock className="w-4 h-4" />
            {submitting ? 'Saving Time Entry...' : 'Save Time Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};
