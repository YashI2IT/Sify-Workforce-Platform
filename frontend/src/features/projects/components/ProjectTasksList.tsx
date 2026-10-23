import { ChevronRight, AlertCircle, Clock, User, RotateCcw } from 'lucide-react';
import type { Task, Employee } from './ProjectTasksTab';
import { statusColors, priorityColors, fmt, isOverdue } from './taskUtils';

interface ProjectTasksListProps {
  tasks: Task[];
  filteredTasks: Task[];
  employees: Employee[];
  isAdmin: boolean;
  projectIsActive: boolean;
  onEdit: (t: Task) => void;
  onViewDetail: (t: Task) => void;
}

export const ProjectTasksList = ({
  tasks,
  filteredTasks,
  employees,
  isAdmin,
  projectIsActive,
  onEdit,
  onViewDetail,
}: ProjectTasksListProps) => {
  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);

  const rootTasks = filteredTasks.filter(t => !t.parentTaskId);
  const childrenOf = (id: string) => filteredTasks.filter(t => t.parentTaskId === id);

  const renderTask = (t: Task, depth = 0): React.ReactElement => {
    const children = childrenOf(t.id);
    const assignee = getEmployee(t.assigneeId);
    const statusCls = statusColors[t.status] ?? statusColors.TODO;
    const priorityCls = priorityColors[t.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
    const overdue = isOverdue(t.dueDate, t.status);

    return (
      <div key={t.id}>
        <div
          className={[
            'group flex items-center gap-3 px-6 py-3.5 border-b border-slate-100 last:border-0',
            'hover:bg-slate-50/60 transition-colors duration-150 cursor-pointer',
            depth > 0 ? 'bg-slate-50/40' : '',
          ].join(' ')}
          onClick={() => onViewDetail(t)}
          role="row"
          data-testid={'task-row-' + t.id}
        >
          {depth > 0 && (
            <div className="flex items-center shrink-0" style={{ paddingLeft: ((depth - 1) * 20) + 4 }}>
              <div className="w-4 h-4 border-l-2 border-b-2 border-slate-300 rounded-bl mr-1.5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {children.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              {t.ticketId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0 shadow-2xs">
                  {t.ticketId}
                </span>
              )}
              {t.recurrence && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200 shrink-0 shadow-2xs"
                  title={`Recurring Task: ${t.recurrence}`}
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  {t.recurrence}
                </span>
              )}
              <span className={['font-semibold text-slate-900 font-sans truncate', depth > 0 ? 'text-xs' : 'text-sm'].join(' ')}>
                {t.name}
              </span>
              {!t.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 font-sans">
                  INACTIVE
                </span>
              )}
              {children.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 font-sans">
                  {children.length} subtask{children.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {t.description && depth === 0 && (
              <p className="text-xs text-slate-500 truncate mt-0.5 max-w-md font-sans">{t.description}</p>
            )}
          </div>

          <div className="w-28 hidden sm:block shrink-0">
            <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans border ' + statusCls}>
              {t.status.replace('_', ' ')}
            </span>
          </div>

          <div className="w-24 hidden md:block shrink-0">
            <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-sans ' + priorityCls}>
              {t.priority ?? 'MEDIUM'}
            </span>
          </div>

          <div className="w-32 hidden lg:flex items-center gap-2 shrink-0">
            {assignee ? (
              <>
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs font-sans">
                  {assignee.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-700 truncate font-sans">{assignee.name.split(' ')[0]}</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic font-sans">Unassigned</span>
            )}
          </div>

          <div className="w-20 hidden xl:block shrink-0 text-xs font-medium text-slate-600 font-mono">{fmt(t.startDate)}</div>

          <div className={'w-24 hidden lg:flex items-center gap-1.5 shrink-0 text-xs font-mono ' + (overdue ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium')}>
            <span>{fmt(t.dueDate)}</span>
            {overdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
          </div>

          <div className="w-16 hidden xl:block shrink-0 text-xs font-semibold text-slate-700 font-mono text-right">
            {t.estimatedHours != null ? t.estimatedHours + 'h' : '--'}
          </div>

          <div className="w-10 flex items-center justify-end shrink-0" onClick={e => e.stopPropagation()}>
            {isAdmin && projectIsActive && (
              <button
                id={'task-edit-btn-' + t.id}
                onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                title="Edit Task"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {children.map(child => renderTask(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3.5 flex items-center gap-3 text-xs font-bold text-slate-600 uppercase tracking-wider font-sans">
        <div className="flex-1">Task</div>
        <div className="w-28 hidden sm:block">Status</div>
        <div className="w-24 hidden md:block">Priority</div>
        <div className="w-32 hidden lg:flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" /> Assignee</div>
        <div className="w-20 hidden xl:block">Start</div>
        <div className="w-24 hidden lg:flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Due</div>
        <div className="w-16 hidden xl:block text-right">Est.</div>
        <div className="w-10" />
      </div>
      <div role="rowgroup" className="divide-y divide-slate-100">
        {rootTasks.map(t => renderTask(t))}
      </div>
      <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium font-sans">
          {filteredTasks.length} of {tasks.length} tasks shown
        </span>
        <span className="text-xs text-slate-400 font-medium font-sans hidden sm:block">
          Click any row to inspect task details
        </span>
      </div>
    </div>
  );
};