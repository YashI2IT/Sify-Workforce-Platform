import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { TimeEntryForm } from './TimeEntryForm';
import { apiClient } from '../../lib/apiClient';
import {
  useGetEmployeeTimeEntriesQuery,
  useGetEmployeeProjectsQuery,
  useUpdateTimeEntryMutation,
  useDeleteTimeEntryMutation,
  useSubmitTodayMutation,
  useSubmitWeekMutation,
} from '../../store/apiSlice';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import {
  AlertCircle, RefreshCw, ChevronLeft, ChevronRight,
  Edit2, Trash2, Lock, Copy, Send, CalendarCheck,
  Clock, CheckCircle2, XCircle
} from 'lucide-react';

interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  activityId: string;
  timesheetId: string;
  date: string;
  hours: number;
  remarks: string | null;
  approvalStatus: string; // DRAFT | SUBMITTED | APPROVED | REJECTED
  timesheet?: { status: string };
}

interface Project {
  id: string;
  name: string;
  code: string;
}

interface Task {
  id: string;
  ticketId: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
}

const getMonday = (d: Date) => {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  return mon;
};

const formatDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getTodayStr = () => formatDateStr(new Date());

// ── Status badge per entry ────────────────────────────────────────────────────

const EntryStatusBadge = ({ status }: { status: string }) => {
  if (status === 'APPROVED') return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
      <CheckCircle2 className="w-2.5 h-2.5" />Approved
    </span>
  );
  if (status === 'SUBMITTED') return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
      <Clock className="w-2.5 h-2.5" />Pending
    </span>
  );
  if (status === 'REJECTED') return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
      <XCircle className="w-2.5 h-2.5" />Rejected
    </span>
  );
  return null; // DRAFT = no badge
};

export const MyTimeEntries = () => {
  const { employee } = useCurrentEmployee();
  const [activeDate, setActiveDate] = useState<Date>(new Date());

  // Weekly bounds
  const monday = useMemo(() => getMonday(activeDate), [activeDate]);
  const sunday = useMemo(() => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    return d;
  }, [monday]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return d;
    }), [monday]);

  const mondayStr = useMemo(() => formatDateStr(monday), [monday]);
  const sundayStr = useMemo(() => formatDateStr(sunday), [sunday]);

  // Data fetching
  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries, isFetching } = useGetEmployeeTimeEntriesQuery(
    { employeeId: employee?.id as string, limit: 200 },
    { skip: !employee }
  );
  const { data: projectsData, isLoading: projectsLoading } = useGetEmployeeProjectsQuery(employee?.id as string, { skip: !employee });

  const entries: TimeEntry[] = Array.isArray(entriesData) ? entriesData : (entriesData?.data ?? []);
  const projects: Project[] = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);

  // Mutations
  const [updateTimeEntryM] = useUpdateTimeEntryMutation();
  const [deleteTimeEntryM] = useDeleteTimeEntryMutation();
  const [submitTodayM, { isLoading: submitTodayLoading }] = useSubmitTodayMutation();
  const [submitWeekM, { isLoading: submitWeekLoading }] = useSubmitWeekMutation();

  // State
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState('');

  const [addEntryDate, setAddEntryDate] = useState<string | null>(null);
  const [copyEntry, setCopyEntry] = useState<TimeEntry | null>(null);
  const [boardError, setBoardError] = useState('');
  const [boardSuccess, setBoardSuccess] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editForm, setEditForm] = useState({
    projectId: '', taskId: '', activityId: '', date: '', hours: '', remarks: ''
  });
  const [editTasks, setEditTasks] = useState<Task[]>([]);
  const [editActivities, setEditActivities] = useState<Activity[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Submit confirm states
  const [confirmSubmitToday, setConfirmSubmitToday] = useState<string | null>(null); // date string
  const [confirmSubmitWeek, setConfirmSubmitWeek] = useState(false);

  // Load nested metadata
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
          tList.forEach((t) => { tMap[t.id] = t.ticketId ? `[${t.ticketId}] ${t.name}` : t.name; });
          aList.forEach((a) => { aMap[a.id] = a.name; });
        })
      );
      setTaskMap(prev => ({ ...prev, ...tMap }));
      setActivityMap(prev => ({ ...prev, ...aMap }));
    } catch (err) {
      console.error('Failed to load tasks/activities', err);
    }
  }, []);

  useEffect(() => {
    if (entries.length > 0) loadMetadata(entries);
  }, [entries, loadMetadata]);

  // Filters & Derived data
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      const m = new Date(monday); m.setHours(0, 0, 0, 0);
      const s = new Date(sunday); s.setHours(0, 0, 0, 0);
      if (d < m || d > s) return false;
      if (projectFilter && e.projectId !== projectFilter) return false;
      if (taskFilter && e.taskId !== taskFilter) return false;
      if (activityFilter && e.activityId !== activityFilter) return false;
      return true;
    });
  }, [entries, monday, sunday, projectFilter, taskFilter, activityFilter]);

  const weeklyTotal = useMemo(() => filteredEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0), [filteredEntries]);
  const daysLogged = useMemo(() => new Set(filteredEntries.map(e => e.date)).size, [filteredEntries]);
  const avgHours = daysLogged ? (weeklyTotal / daysLogged).toFixed(1) : '0.0';

  // Per-day DRAFT counts (for submit today availability)
  const draftCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    filteredEntries.forEach(e => {
      if (e.approvalStatus === 'DRAFT' || e.approvalStatus === 'REJECTED') {
        map[e.date] = (map[e.date] ?? 0) + 1;
      }
    });
    return map;
  }, [filteredEntries]);

  const totalDraftCount = useMemo(() =>
    filteredEntries.filter(e => e.approvalStatus === 'DRAFT' || e.approvalStatus === 'REJECTED').length,
    [filteredEntries]);

  // Drag and Drop — only DRAFT/REJECTED entries can be dragged
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const sourceDate = result.source.droppableId;
    const destDate = result.destination.droppableId;
    if (sourceDate === destDate) return;

    const entryId = result.draggableId;
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;
    if (entry.approvalStatus === 'APPROVED' || entry.approvalStatus === 'SUBMITTED') return;

    setBoardError('');
    try {
      await updateTimeEntryM({ id: entryId, data: { date: destDate } }).unwrap();
      refetchEntries();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to move time entry';
      setBoardError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    const d = new Date(activeDate);
    if (direction === 'today') {
      setActiveDate(new Date());
    } else {
      d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
      setActiveDate(d);
    }
  };

  // Edit logic
  const openEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditForm({
      projectId: entry.projectId, taskId: entry.taskId, activityId: entry.activityId,
      date: entry.date, hours: String(entry.hours), remarks: entry.remarks || ''
    });
    setEditError(''); setEditLoading(true);
    Promise.all([
      apiClient(`/projects/${entry.projectId}/tasks`),
      apiClient(`/projects/${entry.projectId}/activities`),
    ])
      .then(([tasksData, activitiesData]) => {
        const tList: Task[] = Array.isArray(tasksData) ? tasksData : [];
        const aList: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];
        setEditTasks(tList.filter(t => (t as any).isActive || t.id === entry.taskId));
        setEditActivities(aList.filter(a => (a as any).isActive || a.id === entry.activityId));
      })
      .catch(err => setEditError(err.message || 'Failed to load metadata'))
      .finally(() => setEditLoading(false));
  };

  const handleEditProjectChange = (projectId: string) => {
    setEditForm(prev => ({ ...prev, projectId, taskId: '', activityId: '' }));
    if (!projectId) { setEditTasks([]); setEditActivities([]); return; }
    setEditLoading(true);
    Promise.all([
      apiClient(`/projects/${projectId}/tasks`),
      apiClient(`/projects/${projectId}/activities`),
    ])
      .then(([tasksData, activitiesData]) => {
        const tList: Task[] = Array.isArray(tasksData) ? tasksData : [];
        const aList: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];
        setEditTasks(tList.filter(t => (t as any).isActive));
        setEditActivities(aList.filter(a => (a as any).isActive));
        setEditForm(prev => ({ ...prev, taskId: tList[0]?.id || '', activityId: aList[0]?.id || '' }));
      })
      .catch(err => setEditError(err.message || 'Failed to load metadata'))
      .finally(() => setEditLoading(false));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const parsedHours = parseFloat(editForm.hours);
    if (isNaN(parsedHours) || parsedHours <= 0) return setEditError('Hours must be positive');
    if (parsedHours > 24) return setEditError('Hours cannot exceed 24');
    if (Math.round(parsedHours * 4) !== parsedHours * 4) return setEditError('Hours must be in 0.25h increments');

    setEditSubmitting(true);
    setEditError('');
    try {
      await updateTimeEntryM({
        id: editingEntry.id,
        data: {
          projectId: editForm.projectId, taskId: editForm.taskId, activityId: editForm.activityId,
          date: editForm.date, hours: parsedHours, remarks: editForm.remarks.trim() || null,
        }
      }).unwrap();
      setEditingEntry(null);
      refetchEntries();
    } catch (err: any) {
      if (err?.data?.message) {
        setEditError(typeof err.data.message === 'string' ? err.data.message : JSON.stringify(err.data.message));
      } else {
        setEditError(err?.message || 'Failed to update time entry');
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBoardError('');
    setDeleteLoading(true);
    try {
      await deleteTimeEntryM(id).unwrap();
      setDeleteConfirmId(null);
      refetchEntries();
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to delete';
      setBoardError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setDeleteConfirmId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Submit Today handler
  const handleSubmitToday = async (date: string) => {
    setBoardError('');
    setBoardSuccess('');
    try {
      const result = await submitTodayM({ date }).unwrap();
      setConfirmSubmitToday(null);
      setBoardSuccess(`Successfully submitted ${result.entryCount ?? ''} time entries for ${date} for manager approval.`);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to submit';
      setBoardError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  // Submit Week handler
  const handleSubmitWeek = async () => {
    setBoardError('');
    setBoardSuccess('');
    try {
      const result = await submitWeekM({ weekDate: mondayStr }).unwrap();
      setConfirmSubmitWeek(false);
      setBoardSuccess(`Successfully submitted ${result.entryCount ?? ''} time entries for the week of ${mondayStr} – ${sundayStr} for manager approval.`);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to submit week';
      setBoardError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const isInitialLoading = entriesLoading || projectsLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Time Entries</h1>
          <p className="text-sm text-slate-500 mt-1">Track, submit, and manage your daily project hours.</p>
        </div>
        {/* Week Nav + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <button onClick={() => navigateWeek('prev')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Previous Week">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold text-slate-900 px-2 min-w-[150px] text-center font-mono">
              {monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={() => navigateWeek('next')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Next Week">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button onClick={() => navigateWeek('today')} className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              Today
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <button onClick={() => refetchEntries()} disabled={isFetching} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
          {/* Submit Week CTA */}
          {totalDraftCount > 0 && (
            <button
              onClick={() => setConfirmSubmitWeek(true)}
              disabled={submitWeekLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Submit Week ({totalDraftCount})
            </button>
          )}
          <button
            onClick={() => setAddEntryDate(getTodayStr())}
            className="px-3 py-2 text-xs font-bold bg-slate-950 text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
          >
            + Add Time Entry
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-slate-400 min-w-[180px]"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {(taskFilter || projectFilter) && (
          <select
            value={taskFilter}
            onChange={(e) => setTaskFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-slate-400 min-w-[150px]"
          >
            <option value="">All Tasks</option>
            {Object.entries(taskMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {(activityFilter || projectFilter) && (
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:border-slate-400 min-w-[150px]"
          >
            <option value="">All Activities</option>
            {Object.entries(activityMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        {(projectFilter || taskFilter || activityFilter) && (
          <button onClick={() => { setProjectFilter(''); setTaskFilter(''); setActivityFilter(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 ml-auto cursor-pointer px-2">
            Clear Filters
          </button>
        )}
      </div>

      {/* Board-level feedback banners */}
      {boardError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{boardError}</span>
          </div>
          <button onClick={() => setBoardError('')} className="text-rose-500 hover:text-rose-700 ml-3 shrink-0 cursor-pointer">✕</button>
        </div>
      )}
      {boardSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{boardSuccess}</span>
          </div>
          <button onClick={() => setBoardSuccess('')} className="text-emerald-500 hover:text-emerald-700 ml-3 shrink-0 cursor-pointer">✕</button>
        </div>
      )}

      {/* WEEKLY TIME BOARD */}
      {isInitialLoading ? (
        <div className="h-64 flex items-center justify-center bg-white border border-slate-200/80 rounded-2xl">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="relative">
          {isFetching && !isInitialLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl pointer-events-none">
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-xs font-mono text-slate-600">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                Refreshing…
              </div>
            </div>
          )}
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
              <div className="flex gap-4 min-w-[1000px]">
                {weekDays.map(dateObj => {
                  const dateStr = formatDateStr(dateObj);
                  const dayEntries = filteredEntries.filter(e => e.date === dateStr);
                  const dailyTotal = dayEntries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
                  const isToday = dateStr === getTodayStr();
                  const dayDraftCount = draftCountByDate[dateStr] ?? 0;

                  return (
                    <div key={dateStr} className="flex-1 flex flex-col min-w-[200px] max-w-[300px]">
                      {/* Day header */}
                      <div className={`p-3 rounded-t-2xl border-x border-t border-slate-200/80 ${isToday ? 'bg-indigo-50/50 border-b-2 border-b-indigo-200' : 'bg-slate-50/50 border-b border-b-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                              {dateObj.toLocaleDateString(undefined, { weekday: 'short' })} {dateObj.getDate()}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${dailyTotal > 0 ? (isToday ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700') : 'bg-transparent text-slate-400'}`}>
                            {dailyTotal.toFixed(1)} hrs
                          </span>
                        </div>
                        {/* Submit Today button */}
                        {dayDraftCount > 0 && (
                          <button
                            onClick={() => setConfirmSubmitToday(dateStr)}
                            disabled={submitTodayLoading}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg py-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-2.5 h-2.5" />
                            Submit Today ({dayDraftCount})
                          </button>
                        )}
                      </div>

                      <Droppable droppableId={dateStr}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 flex flex-col gap-2 p-2 min-h-[150px] border-x border-slate-200/80 bg-white transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                          >
                            {dayEntries.length === 0 && !snapshot.isDraggingOver && (
                              <div className="flex-1 flex items-center justify-center p-4">
                                <p className="text-[10px] text-slate-400 font-medium">No time entries</p>
                              </div>
                            )}

                            {dayEntries.map((entry, index) => {
                              const isLocked = entry.approvalStatus === 'SUBMITTED' || entry.approvalStatus === 'APPROVED';
                              const isDraggable = entry.approvalStatus === 'DRAFT' || entry.approvalStatus === 'REJECTED';

                              return (
                                <Draggable key={entry.id} draggableId={entry.id} index={index} isDragDisabled={!isDraggable}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-white border rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs group relative
                                        ${isLocked ? 'border-slate-100 bg-slate-50/50 cursor-default' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}
                                        ${entry.approvalStatus === 'REJECTED' ? 'border-rose-200 bg-rose-50/30' : ''}
                                        ${entry.approvalStatus === 'APPROVED' ? 'border-emerald-200 bg-emerald-50/20' : ''}
                                        ${snapshot.isDragging ? 'shadow-lg border-indigo-300 ring-2 ring-indigo-500/20 bg-white' : ''}`}
                                    >
                                      <div className="pr-4 relative">
                                        {(entry.approvalStatus === 'SUBMITTED' || entry.approvalStatus === 'APPROVED') && (
                                          <div className="absolute -top-1 -right-1 text-slate-400" title={`Entry ${entry.approvalStatus}`}>
                                            <Lock className="w-3.5 h-3.5" />
                                          </div>
                                        )}
                                        <p className="text-xs font-bold text-slate-900 leading-tight truncate">
                                          {projects.find(p => p.id === entry.projectId)?.name || 'Unknown Project'}
                                        </p>
                                        <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
                                          {taskMap[entry.taskId] || 'Task'}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-400 truncate">
                                          {activityMap[entry.activityId] || 'Activity'}
                                        </p>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {entry.hours}h
                                          </span>
                                          <EntryStatusBadge status={entry.approvalStatus} />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                          <button onClick={() => setCopyEntry(entry)} title="Copy / Log Again" className="p-1 text-slate-400 hover:text-emerald-600 rounded cursor-pointer">
                                            <Copy className="w-3 h-3" />
                                          </button>
                                          {!isLocked && (
                                            <>
                                              <button onClick={() => openEditModal(entry)} className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                              <button
                                                onClick={() => setDeleteConfirmId(entry.id)}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      {entry.remarks && (
                                        <p className="text-[10px] text-slate-500 italic truncate border-t border-slate-100 pt-1">
                                          {entry.remarks}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>

                      <div className="p-2 border-x border-b border-slate-200/80 rounded-b-2xl bg-slate-50/50 flex justify-center">
                        <button
                          onClick={() => setAddEntryDate(dateStr)}
                          className="w-full py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors flex justify-center items-center gap-1 cursor-pointer"
                        >
                          + Add Entry
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DragDropContext>
        </div>
      )}

      {/* WEEKLY SUMMARY */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs flex flex-wrap gap-8 items-center">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Weekly Total</p>
          <p className="text-xl font-bold text-slate-900 font-mono">{weeklyTotal.toFixed(2)} <span className="text-sm text-slate-500 font-sans">hrs</span></p>
        </div>
        <div className="w-px h-10 bg-slate-200 hidden sm:block" />
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Days Logged</p>
          <p className="text-xl font-bold text-slate-900 font-mono">{daysLogged}</p>
        </div>
        <div className="w-px h-10 bg-slate-200 hidden sm:block" />
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg / Logged Day</p>
          <p className="text-xl font-bold text-slate-900 font-mono">{avgHours} <span className="text-sm text-slate-500 font-sans">hrs</span></p>
        </div>
        <div className="w-px h-10 bg-slate-200 hidden sm:block" />
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pending Submission</p>
          <p className="text-xl font-bold text-slate-900 font-mono">{totalDraftCount} <span className="text-sm text-slate-500 font-sans">entries</span></p>
        </div>
      </div>

      {/* ── MODALS ─────────────────────────────────────────────────────────────── */}

      {/* Add Entry */}
      <Modal isOpen={!!addEntryDate} onClose={() => setAddEntryDate(null)} title="Add Time Entry" maxWidth="md">
        {addEntryDate && (
          <div className="p-1">
            <TimeEntryForm
              onSuccess={() => { setAddEntryDate(null); refetchEntries(); }}
              selectedDate={addEntryDate}
              embedded
            />
          </div>
        )}
      </Modal>

      {/* Copy Entry */}
      <Modal isOpen={!!copyEntry} onClose={() => setCopyEntry(null)} title="Copy / Log Again" maxWidth="md">
        {copyEntry && (
          <div className="p-1">
            <TimeEntryForm
              onSuccess={() => { setCopyEntry(null); refetchEntries(); }}
              selectedDate={copyEntry.date}
              defaultValues={{
                projectId: copyEntry.projectId,
                taskId: copyEntry.taskId,
                activityId: copyEntry.activityId,
                hours: copyEntry.hours,
                remarks: copyEntry.remarks
              }}
              embedded
            />
          </div>
        )}
      </Modal>

      {/* Edit Entry */}
      <Modal isOpen={!!editingEntry} onClose={() => setEditingEntry(null)} title="Edit Time Entry" maxWidth="md">
        {editError && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{editError}</span>
          </div>
        )}
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Project *</label>
            <select required value={editForm.projectId} onChange={(e) => handleEditProjectChange(e.target.value)} className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none">
              <option value="">— Select Project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Task *</label>
              <select required disabled={editLoading || !editForm.projectId} value={editForm.taskId} onChange={(e) => setEditForm(prev => ({ ...prev, taskId: e.target.value }))} className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none disabled:bg-slate-100">
                <option value="">— Select Task —</option>
                {editTasks.map((t) => <option key={t.id} value={t.id}>{t.ticketId ? `[${t.ticketId}] ` : ''}{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Activity *</label>
              <select required disabled={editLoading || !editForm.projectId} value={editForm.activityId} onChange={(e) => setEditForm(prev => ({ ...prev, activityId: e.target.value }))} className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none disabled:bg-slate-100">
                <option value="">— Select Activity —</option>
                {editActivities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Date *</label>
              <input type="date" required value={editForm.date} onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))} className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Hours *</label>
              <input type="number" step="0.25" min="0.25" max="24" required value={editForm.hours} onChange={(e) => setEditForm(prev => ({ ...prev, hours: e.target.value }))} className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm font-mono bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Remarks (Optional)</label>
            <input type="text" placeholder="Brief description of work done..." value={editForm.remarks} onChange={(e) => setEditForm(prev => ({ ...prev, remarks: e.target.value }))} className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 transition-all shadow-2xs outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setEditingEntry(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={editSubmitting || editLoading} className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50">{editSubmitting ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete Time Entry" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this time entry? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setDeleteConfirmId(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
            <button type="button" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} disabled={deleteLoading} className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50">
              {deleteLoading ? 'Deleting...' : 'Delete Entry'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Submit Today Confirm */}
      <Modal isOpen={!!confirmSubmitToday} onClose={() => setConfirmSubmitToday(null)} title="Submit Today's Entries" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will submit all unsubmitted time entries for <strong>{confirmSubmitToday}</strong> to your manager for approval.
            You will not be able to edit these entries until they are reviewed.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setConfirmSubmitToday(null)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
            <button
              type="button"
              onClick={() => confirmSubmitToday && handleSubmitToday(confirmSubmitToday)}
              disabled={submitTodayLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitTodayLoading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Submit Week Confirm */}
      <Modal isOpen={confirmSubmitWeek} onClose={() => setConfirmSubmitWeek(false)} title="Submit This Week's Entries" maxWidth="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This will submit all <strong>{totalDraftCount} unsubmitted time entries</strong> for the week of{' '}
            <strong>{mondayStr} – {sundayStr}</strong> to your manager for approval.
            You will not be able to edit these entries until they are reviewed.
          </p>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setConfirmSubmitWeek(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
            <button
              type="button"
              onClick={handleSubmitWeek}
              disabled={submitWeekLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-all shadow-xs cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <CalendarCheck className="w-4 h-4" />
              {submitWeekLoading ? 'Submitting...' : 'Submit Week for Approval'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
