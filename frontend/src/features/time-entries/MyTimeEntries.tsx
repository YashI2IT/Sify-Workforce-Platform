import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../lib/apiClient';
import { TimeEntryForm } from './TimeEntryForm';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { Clock, AlertCircle, RefreshCw, Calendar as CalendarIcon, Edit2, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  useGetEmployeeTimeEntriesQuery,
  useGetEmployeeProjectsQuery,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation
} from '../../store/apiSlice';

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

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateStr = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const MyTimeEntries = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  
  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries } = useGetEmployeeTimeEntriesQuery({ employeeId: employee?.id as string, limit: 100 }, { skip: !employee });
  const { data: projectsData, isLoading: projectsLoading } = useGetEmployeeProjectsQuery(employee?.id as string, { skip: !employee });
  
  const entries: TimeEntry[] = Array.isArray(entriesData) ? entriesData : (entriesData?.data ?? []);
  const projects: Project[] = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);

  const [updateTimeEntryM] = useUpdateTimeEntryMutation();
  const [deleteTimeEntryM] = useDeleteTimeEntryMutation();

  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const loading = entriesLoading || projectsLoading || empLoading;

  // Calendar State
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(getTodayStr());
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [projectFilter, setProjectFilter] = useState<string>('');

  // Edit Entry State
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({
    projectId: '',
    taskId: '',
    activityId: '',
    date: '',
    hours: '',
    remarks: '',
  });
  const [editTasks, setEditTasks] = useState<Task[]>([]);
  const [editActivities, setEditActivities] = useState<Activity[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const loadMetadata = useCallback(async (entryList: TimeEntry[]) => {
    if (!entryList.length) return;
    try {
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

      setTaskMap(prev => ({ ...prev, ...tMap }));
      setActivityMap(prev => ({ ...prev, ...aMap }));
    } catch (err) {
      console.error('Failed to load tasks/activities for entries', err);
    }
  }, []);

  useEffect(() => {
    if (entries.length > 0) {
      loadMetadata(entries);
    }
  }, [entries, loadMetadata]);

  const fetchEntries = () => {
    refetchEntries();
  };

  const openEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditForm({
      projectId: entry.projectId,
      taskId: entry.taskId,
      activityId: entry.activityId,
      date: entry.date,
      hours: String(entry.hours),
      remarks: entry.remarks || '',
    });
    setEditError('');
    setEditLoading(true);
    Promise.all([
      apiClient(`/projects/${entry.projectId}/tasks`),
      apiClient(`/projects/${entry.projectId}/activities`),
    ])
      .then(([tasksData, activitiesData]) => {
        const tList: Task[] = Array.isArray(tasksData) ? tasksData : [];
        const aList: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];
        setEditTasks(tList.filter((t: any) => t.isActive || t.id === entry.taskId));
        setEditActivities(aList.filter((a: any) => a.isActive || a.id === entry.activityId));
      })
      .catch((err) => setEditError(err.message || 'Failed to load tasks and activities'))
      .finally(() => setEditLoading(false));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    try {
      await deleteTimeEntryM(id).unwrap();
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  const handleEditProjectChange = (projectId: string) => {
    setEditForm((prev) => ({ ...prev, projectId, taskId: '', activityId: '' }));
    if (!projectId) {
      setEditTasks([]);
      setEditActivities([]);
      return;
    }
    setEditLoading(true);
    Promise.all([
      apiClient(`/projects/${projectId}/tasks`),
      apiClient(`/projects/${projectId}/activities`),
    ])
      .then(([tasksData, activitiesData]) => {
        const tList: Task[] = Array.isArray(tasksData) ? tasksData : [];
        const aList: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];
        const activeTasks = tList.filter((t: any) => t.isActive);
        const activeActivities = aList.filter((a: any) => a.isActive);
        setEditTasks(activeTasks);
        setEditActivities(activeActivities);
        setEditForm((prev) => ({
          ...prev,
          taskId: activeTasks[0]?.id || '',
          activityId: activeActivities[0]?.id || '',
        }));
      })
      .catch((err) => setEditError(err.message || 'Failed to load tasks and activities'))
      .finally(() => setEditLoading(false));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    const parsedHours = parseFloat(editForm.hours);
    if (isNaN(parsedHours) || parsedHours <= 0) {
      setEditError('Hours must be a positive number');
      return;
    }
    if (parsedHours > 24) {
      setEditError('Hours cannot exceed 24 in a single entry');
      return;
    }
    if (Math.round(parsedHours * 4) !== parsedHours * 4) {
      setEditError('Hours must be in 0.25h increments (e.g., 0.25, 0.5, 0.75, 1)');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    try {
      await updateTimeEntryM({
        id: editingEntry.id,
        data: {
          projectId: editForm.projectId,
          taskId: editForm.taskId,
          activityId: editForm.activityId,
          date: editForm.date,
          hours: parsedHours,
          remarks: editForm.remarks.trim() || null,
        }
      }).unwrap();

      setEditingEntry(null);
      fetchEntries();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update time entry');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Calendar Logic
  const activeDateObj = new Date(selectedDateFilter);
  if (isNaN(activeDateObj.getTime())) {
    setSelectedDateFilter(getTodayStr()); // fallback
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const d = new Date(activeDateObj);
    if (calendarView === 'week') {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDateFilter(formatDateStr(d));
  };

  const getCalendarDays = () => {
    if (calendarView === 'week') {
      const day = activeDateObj.getDay(); 
      const diff = activeDateObj.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      const startOfWeek = new Date(activeDateObj);
      startOfWeek.setDate(diff);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
      });
    } else {
      const y = activeDateObj.getFullYear();
      const m = activeDateObj.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      
      let startPadding = firstDay.getDay() - 1;
      if (startPadding === -1) startPadding = 6; 
      
      const days = [];
      for (let i = 0; i < startPadding; i++) days.push(null);
      for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(y, m, i));
      
      let endPadding = days.length % 7;
      if (endPadding !== 0) {
        for (let i = 0; i < 7 - endPadding; i++) days.push(null);
      }
      return days;
    }
  };

  const calendarDays = getCalendarDays();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const filteredEntries = projectFilter ? entries.filter(e => e.projectId === projectFilter) : entries;
  const displayedEntries = filteredEntries.filter(e => e.date === selectedDateFilter);
  const dailyTotal = displayedEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white shadow-xs border border-slate-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  My Work
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Log daily project hours, view calendar pacing, and manage activities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="border border-slate-200/90 rounded-xl px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:border-slate-900 shadow-2xs"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            onClick={fetchEntries}
            className="p-2 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Refresh entries"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Calendar */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-700" />
                {activeDateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${calendarView === 'week' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${calendarView === 'month' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  Month
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => navigateDate('prev')} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setSelectedDateFilter(getTodayStr())} className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer transition-colors">
                Today
              </button>
              <button onClick={() => navigateDate('next')} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 mb-2">
              {dayLabels.map(d => (
                <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {d}
                </div>
              ))}
            </div>
            <div className={`grid grid-cols-7 gap-2 sm:gap-3 ${calendarView === 'month' ? 'auto-rows-fr' : ''}`}>
              {calendarDays.map((dateObj, idx) => {
                if (!dateObj) {
                  return <div key={`empty-${idx}`} className="rounded-xl border border-transparent bg-slate-50/30" />;
                }
                const dStr = formatDateStr(dateObj);
                const dayHours = filteredEntries
                  .filter(e => e.date === dStr)
                  .reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
                
                const isSelected = selectedDateFilter === dStr;
                const isToday = getTodayStr() === dStr;
                const hasHours = dayHours > 0;

                return (
                  <button
                    key={dStr}
                    onClick={() => setSelectedDateFilter(dStr)}
                    className={`flex flex-col items-center sm:items-start justify-between min-h-[4rem] sm:min-h-[5.5rem] rounded-xl p-1.5 sm:p-2.5 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-2 border-slate-950 bg-slate-50 shadow-xs'
                        : isToday
                        ? 'border-2 border-slate-300 bg-white hover:border-slate-400'
                        : hasHours
                        ? 'border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/70'
                        : 'border border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-bold ${
                      isSelected ? 'text-slate-950' : isToday ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {dateObj.getDate()}
                    </span>
                    {hasHours && (
                      <span className={`w-full text-center sm:text-left text-[10px] sm:text-xs font-mono font-bold mt-1 px-1 py-0.5 rounded ${
                        isSelected ? 'bg-slate-950 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {dayHours}h
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Pane: Context & Quick Entry */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs relative">
            {/* Embedded Form Component */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-white">
              <h3 className="text-sm font-bold text-slate-900 font-display mb-3">Add Time for {activeDateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
              <TimeEntryForm onSuccess={fetchEntries} selectedDate={selectedDateFilter} embedded />
            </div>

            {/* Daily Summary */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 font-display">Daily Summary</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-950 text-white shadow-2xs">
                  {dailyTotal} hrs total
                </span>
              </div>

              {loading ? (
                <div className="py-10 flex justify-center"><LoadingSpinner size="sm" /></div>
              ) : displayedEntries.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300">
                  <p className="text-xs font-medium text-slate-500">No entries for this date.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {displayedEntries.map(entry => {
                    const proj = projects.find(p => p.id === entry.projectId);
                    return (
                      <div key={entry.id} className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-colors flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-900 leading-tight">
                              {proj?.name || 'Unknown Project'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                              <span>{taskMap[entry.taskId] || '—'}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                              <span>{activityMap[entry.activityId] || '—'}</span>
                            </div>
                          </div>
                          <div className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm shrink-0">
                            {entry.hours}h
                          </div>
                        </div>
                        {entry.remarks && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{entry.remarks}"
                          </p>
                        )}
                        <div className="flex items-center justify-end gap-1.5 mt-1 pt-2 border-t border-slate-100">
                          <button onClick={() => openEditModal(entry)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Entry Modal */}
      <Modal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Time Entry"
        maxWidth="md"
      >
        {editError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Project *
            </label>
            <select
              required
              value={editForm.projectId}
              onChange={(e) => handleEditProjectChange(e.target.value)}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            >
              <option value="">— Select Project —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Task *
              </label>
              <select
                required
                disabled={editLoading || !editForm.projectId}
                value={editForm.taskId}
                onChange={(e) => setEditForm((prev) => ({ ...prev, taskId: e.target.value }))}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs disabled:bg-slate-100"
              >
                <option value="">— Select Task —</option>
                {editTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Activity *
              </label>
              <select
                required
                disabled={editLoading || !editForm.projectId}
                value={editForm.activityId}
                onChange={(e) => setEditForm((prev) => ({ ...prev, activityId: e.target.value }))}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs disabled:bg-slate-100"
              >
                <option value="">— Select Activity —</option>
                {editActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Hours *
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                required
                value={editForm.hours}
                onChange={(e) => setEditForm((prev) => ({ ...prev, hours: e.target.value }))}
                className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
              Remarks (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief description of work done..."
              value={editForm.remarks}
              onChange={(e) => setEditForm((prev) => ({ ...prev, remarks: e.target.value }))}
              className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingEntry(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting || editLoading}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
