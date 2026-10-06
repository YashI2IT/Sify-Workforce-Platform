import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Search, CheckSquare, Filter, X, LayoutList, KanbanSquare, CalendarRange } from 'lucide-react';
import { useUpdateProjectTaskMutation } from '../../../store/apiSlice';
import { useToast } from '../../../context/ToastContext';
import { ProjectTasksList } from './ProjectTasksList';
import { ProjectTasksBoard } from './ProjectTasksBoard';
import { ProjectTasksBacklog } from './ProjectTasksBacklog';
import { ProjectTasksTimeline } from './ProjectTasksTimeline';
// Removed unused priorityColors import
import { Select } from '../../../components/ui/Select';
import { TaskTemplatesModal } from './TaskTemplatesModal';

export interface Task {
  id: string;
  ticketId: string;
  name: string;
  description?: string | null;
  status: string;
  isActive: boolean;
  priority?: string | null;
  assigneeId?: string | null;
  creatorId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  projectId: string;
  parentTaskId?: string | null;
  requirementId?: string | null;
  milestoneId?: string | null;
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  targetDate: string;
  status: string;
}

interface ProjectTasksTabProps {
  tasks: Task[];
  milestones?: Milestone[];
  employees: Employee[];
  isAdmin: boolean;
  projectIsActive: boolean;
  projectId: string; // Added to pass to updateTask
  onAdd: (initialData?: any) => void;
  onEdit: (t: Task) => void;
  onViewDetail: (t: Task) => void;
  currentEmployeeId?: string;
}

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const VIEW_OPTIONS = [
  { id: 'list' as const, label: 'List', icon: LayoutList, title: 'List View' },
  { id: 'board' as const, label: 'Board', icon: KanbanSquare, title: 'Board View' },
  { id: 'backlog' as const, label: 'Backlog', icon: LayoutList, title: 'Backlog View', iconClass: 'rotate-90' },
  { id: 'timeline' as const, label: 'Timeline', icon: CalendarRange, title: 'Timeline View' },
];

export const ProjectTasksTab = ({
  tasks,
  milestones = [],
  employees,
  isAdmin,
  projectIsActive,
  projectId,
  onAdd,
  onEdit,
  onViewDetail,
  currentEmployeeId,
}: ProjectTasksTabProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [taskTemplatesModalOpen, setTaskTemplatesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'backlog' | 'timeline'>('board');
  const [updateTask] = useUpdateProjectTaskMutation();
  const { showToast } = useToast();

  const switcherRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updatePill = () => {
    const activeBtn = btnRefs.current[viewMode];
    const container = switcherRef.current;
    if (activeBtn && container) {
      const cRect = container.getBoundingClientRect();
      const bRect = activeBtn.getBoundingClientRect();
      if (bRect.width > 0) {
        setIndicatorStyle({
          left: bRect.left - cRect.left,
          width: bRect.width,
          opacity: 1,
        });
      }
    }
  };

  useEffect(() => {
    updatePill();
    window.addEventListener('resize', updatePill);
    return () => window.removeEventListener('resize', updatePill);
  }, [viewMode]);

  const toggleStatus = (s: string) =>
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const togglePriority = (p: string) =>
    setPriorityFilter(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter([]);
    setPriorityFilter([]);
    setAssigneeFilter('');
  };

  const hasActiveFilters = !!(search || statusFilter.length || priorityFilter.length || assigneeFilter);

  const activeFilterCount = [
    search ? 1 : 0,
    statusFilter.length > 0 ? 1 : 0,
    priorityFilter.length > 0 ? 1 : 0,
    assigneeFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter.length && !statusFilter.includes(t.status)) return false;
      if (priorityFilter.length && !priorityFilter.includes(t.priority || 'MEDIUM')) return false;
      if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter]);

  const rootTasks = useMemo(
    () => filteredTasks.filter(t => !t.parentTaskId),
    [filteredTasks]
  );

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask({ projectId, taskId, data: { status: newStatus } }).unwrap();
    } catch (err: any) {
      showToast(err.data?.message || 'Failed to update task status', 'error');
    }
  };

  return (
    <div className="p-4 sm:p-5 lg:p-6 space-y-4">
      {/* Header & Controls bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight font-sans">Tasks</h3>
          <p className="text-xs text-slate-500 font-medium font-sans mt-0.5">
            {tasks.length} tasks &middot; {tasks.filter(t => t.status === 'DONE').length} completed
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Segmented View Switcher */}
          <div
            ref={switcherRef}
            className="relative flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-2xs"
          >
            {/* Smooth Sliding Pill Indicator */}
            {indicatorStyle.width > 0 && (
              <div
                className="absolute top-1 bottom-1 bg-white rounded-full shadow-xs transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
                style={{
                  left: indicatorStyle.left,
                  width: indicatorStyle.width,
                  opacity: indicatorStyle.opacity,
                }}
              />
            )}

            {VIEW_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isActive = viewMode === opt.id;
              return (
                <button
                  key={opt.id}
                  ref={el => { btnRefs.current[opt.id] = el; }}
                  onClick={() => setViewMode(opt.id)}
                  className={`relative z-10 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors duration-200 cursor-pointer select-none ${
                    isActive
                      ? indicatorStyle.width === 0 ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={opt.title}
                >
                  <Icon className={`w-3.5 h-3.5 ${opt.iconClass || ''}`} strokeWidth={2.2} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Filters Toggle Button */}
          <button
            id="task-filter-toggle"
            onClick={() => setShowFilters(f => !f)}
            className={[
              'inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-[0.97]',
              showFilters || hasActiveFilters
                ? 'bg-[#12161F] border-[#12161F] text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
            ].join(' ')}
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={2.2} />
            Filters
            {hasActiveFilters && (
              <span className="bg-white text-slate-950 rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center shadow-xs">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Admin Action Buttons */}
          {isAdmin && projectIsActive && (
            <>
              <button
                onClick={() => setTaskTemplatesModalOpen(true)}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold text-xs shadow-xs transition-all active:scale-[0.97] cursor-pointer"
              >
                Templates
              </button>
              <button
                id="task-create-btn"
                onClick={() => onAdd()}
                className="inline-flex items-center gap-2 bg-[#12161F] hover:bg-slate-800 text-white px-5 py-2 rounded-full font-bold text-xs shadow-xs transition-all duration-200 active:scale-[0.97] cursor-pointer"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Create Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200/70 rounded-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-slideUpFade overflow-hidden">
          <div className="relative border-b border-slate-100 bg-slate-50/50">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={2.5} />
            <input
              id="task-search-input"
              type="text"
              placeholder="Search tasks by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 text-[13px] bg-transparent border-0 focus:ring-0 text-slate-900 font-medium placeholder:text-slate-400 transition-colors outline-none"
            />
          </div>
          <div className="p-4 flex flex-wrap items-start gap-x-8 gap-y-5 bg-white">
            <div className="space-y-2.5 flex-1 min-w-[220px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    id={'status-chip-' + s}
                    onClick={() => toggleStatus(s)}
                    className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-all duration-200 cursor-pointer overflow-hidden ${
                      statusFilter.includes(s)
                        ? 'bg-[#12161F] text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {!statusFilter.includes(s) && (
                      <span className={`w-1.5 h-1.5 rounded-full ${s === 'TODO' ? 'bg-slate-300' : s === 'IN_PROGRESS' ? 'bg-blue-500' : s === 'REVIEW' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                    )}
                    <span className="relative z-10">{s.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5 flex-1 min-w-[220px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Priority</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    id={'priority-chip-' + p}
                    onClick={() => togglePriority(p)}
                    className={`group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-all duration-200 cursor-pointer overflow-hidden ${
                      priorityFilter.includes(p)
                        ? 'bg-[#12161F] text-white shadow-xs'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {!priorityFilter.includes(p) && (
                      <span className={`w-1.5 h-1.5 rounded-full ${p === 'LOW' ? 'bg-slate-300' : p === 'MEDIUM' ? 'bg-sky-500' : p === 'HIGH' ? 'bg-orange-500' : 'bg-rose-500'}`} />
                    )}
                    <span className="relative z-10">{p}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2.5 w-full sm:w-auto shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Assignee</p>
              <Select
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                className="w-full sm:w-[170px]"
                options={[
                  { value: '', label: 'All members' },
                  ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                ]}
              />
            </div>
          </div>
          {hasActiveFilters && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                id="clear-filters-btn"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
              <span className="text-xs text-slate-400 font-medium">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Content Areas */}
      {tasks.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200/80 rounded-[14px] bg-white/70 backdrop-blur-xs shadow-xs">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold text-slate-800 font-sans">No tasks yet</p>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            {isAdmin ? 'Click "Create Task" to add the first task.' : 'No tasks configured for this project.'}
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-14 text-center border border-dashed border-slate-200/80 rounded-[14px] bg-white/70 backdrop-blur-xs shadow-xs">
          <Search className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold text-slate-700 font-sans">No tasks match your filters</p>
          <button id="clear-filters-empty-btn" onClick={clearFilters} className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer">
            Clear filters
          </button>
        </div>
      ) : (
        <div key={viewMode} className="animate-fadeIn">
          {viewMode === 'list' && (
            <ProjectTasksList
              tasks={tasks}
              filteredTasks={filteredTasks}
              employees={employees}
              isAdmin={isAdmin}
              projectIsActive={projectIsActive}
              onEdit={onEdit}
              onViewDetail={onViewDetail}
            />
          )}
          {viewMode === 'backlog' && (
            <ProjectTasksBacklog
              tasks={rootTasks}
              allFilteredTasks={filteredTasks}
              employees={employees}
              isAdmin={isAdmin}
              projectIsActive={projectIsActive}
              onViewDetail={onViewDetail}
              onStatusChange={handleStatusChange}
              currentEmployeeId={currentEmployeeId}
            />
          )}
          {viewMode === 'board' && (
            <ProjectTasksBoard
              tasks={rootTasks}
              allFilteredTasks={filteredTasks}
              employees={employees}
              isAdmin={isAdmin}
              projectIsActive={projectIsActive}
              onViewDetail={onViewDetail}
              onStatusChange={handleStatusChange}
              currentEmployeeId={currentEmployeeId}
            />
          )}
          {viewMode === 'timeline' && (
            <ProjectTasksTimeline
              tasks={filteredTasks}
              milestones={milestones}
              employees={employees}
              onViewDetail={onViewDetail}
            />
          )}
        </div>
      )}
      <TaskTemplatesModal
        isOpen={taskTemplatesModalOpen}
        onClose={() => setTaskTemplatesModalOpen(false)}
        projectId={projectId}
        isAdmin={isAdmin}
        projectIsActive={projectIsActive}
        employees={employees}
        tasks={tasks}
        onUseTemplate={(tpl) => onAdd({
          name: tpl.taskName,
          description: tpl.description,
          priority: tpl.priority,
          estimatedHours: tpl.estimatedHours,
          assigneeId: tpl.assigneeId,
          recurrence: tpl.recurrence,
        })}
      />
    </div>
  );
};