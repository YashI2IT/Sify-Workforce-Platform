import { useState, useMemo } from 'react';
import { Plus, Search, CheckSquare, Filter, X, LayoutList, KanbanSquare, CalendarRange } from 'lucide-react';
import { useUpdateProjectTaskMutation } from '../../../store/apiSlice';
import { useToast } from '../../../context/ToastContext';
import { ProjectTasksList } from './ProjectTasksList';
import { ProjectTasksBoard } from './ProjectTasksBoard';
import { ProjectTasksBacklog } from './ProjectTasksBacklog';
import { ProjectTasksTimeline } from './ProjectTasksTimeline';
import { statusColors, priorityColors } from './taskUtils';
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
}

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

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
}: ProjectTasksTabProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [taskTemplatesModalOpen, setTaskTemplatesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'backlog' | 'timeline'>('list');
  const [updateTask] = useUpdateProjectTaskMutation();
  const { showToast } = useToast();

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-display">Tasks</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {tasks.length} tasks &middot; {tasks.filter(t => t.status === 'DONE').length} completed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                viewMode === 'board' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Board View"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('backlog')}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                viewMode === 'backlog' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Backlog View"
            >
              <LayoutList className="w-4 h-4 rotate-90" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                viewMode === 'timeline' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Timeline View"
            >
              <CalendarRange className="w-4 h-4" />
            </button>
          </div>
          
          <button
            id="task-filter-toggle"
            onClick={() => setShowFilters(f => !f)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer',
              showFilters || hasActiveFilters
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400',
            ].join(' ')}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="bg-white text-slate-950 rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          {isAdmin && projectIsActive && (
            <>
              <button
                onClick={() => setTaskTemplatesModalOpen(true)}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 px-4 py-2 rounded-xl font-medium text-xs shadow-xs transition-all cursor-pointer"
              >
                Templates
              </button>
              <button
                id="task-create-btn"
                onClick={() => onAdd()}
                className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium text-xs shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> Create Task
              </button>
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              id="task-search-input"
              type="text"
              placeholder="Search tasks by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Status</p>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    id={'status-chip-' + s}
                    onClick={() => toggleStatus(s)}
                    className={[
                      'px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border cursor-pointer transition-all',
                      statusFilter.includes(s)
                        ? 'bg-slate-950 text-white border-slate-950'
                        : statusColors[s] + ' hover:opacity-80',
                    ].join(' ')}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Priority</p>
              <div className="flex gap-1.5 flex-wrap">
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p}
                    id={'priority-chip-' + p}
                    onClick={() => togglePriority(p)}
                    className={[
                      'px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold cursor-pointer transition-all',
                      priorityFilter.includes(p)
                        ? 'bg-slate-950 text-white ring-1 ring-slate-950'
                        : priorityColors[p] + ' hover:opacity-80',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Assignee</p>
              <Select
                value={assigneeFilter}
                onChange={setAssigneeFilter}
                className="w-[140px]"
                options={[
                  { value: '', label: 'All members' },
                  ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                ]}
              />
            </div>
          </div>
          {hasActiveFilters && (
            <button
              id="clear-filters-btn"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <CheckSquare className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-800 font-display">No tasks yet</p>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Click "Create Task" to add the first task.' : 'No tasks configured for this project.'}
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <Search className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-700 font-display">No tasks match your filters</p>
          <button id="clear-filters-empty-btn" onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer">
            Clear filters
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <ProjectTasksList
          tasks={tasks}
          filteredTasks={filteredTasks}
          employees={employees}
          isAdmin={isAdmin}
          projectIsActive={projectIsActive}
          onEdit={onEdit}
          onViewDetail={onViewDetail}
        />
      ) : viewMode === 'backlog' ? (
        <ProjectTasksBacklog
          tasks={rootTasks}
          allFilteredTasks={filteredTasks}
          employees={employees}
          isAdmin={isAdmin}
          projectIsActive={projectIsActive}
          onViewDetail={onViewDetail}
          onStatusChange={handleStatusChange}
        />
      ) : viewMode === 'board' ? (
        <ProjectTasksBoard
          tasks={rootTasks}
          allFilteredTasks={filteredTasks}
          employees={employees}
          isAdmin={isAdmin}
          projectIsActive={projectIsActive}
          onViewDetail={onViewDetail}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <ProjectTasksTimeline
          tasks={filteredTasks}
          milestones={milestones}
          employees={employees}
          onViewDetail={onViewDetail}
        />
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