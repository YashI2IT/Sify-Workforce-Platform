import { ChevronRight, AlertCircle, Clock, User } from 'lucide-react';
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
          className={['group flex items-center gap-2 px-4 py-3 border-b border-slate-100 last:border-0',
            'hover:bg-slate-50/80 transition-colors cursor-pointer',
            depth > 0 ? 'bg-slate-50/30' : ''].join(' ')}
          onClick={() => onViewDetail(t)}
          role="row"
          data-testid={'task-row-' + t.id}
        >
          {depth > 0 && (
            <div className="flex items-center shrink-0" style={{ paddingLeft: ((depth - 1) * 20) + 4 }}>
              <div className="w-5 h-4 border-l-2 border-b-2 border-slate-300 rounded-bl mr-1" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {children.length > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <span className={['font-semibold text-slate-900 font-display truncate', depth > 0 ? 'text-xs' : 'text-sm'].join(' ')}>
                <span className="text-slate-400 font-mono mr-1.5 font-normal text-xs">{t.ticketId}</span>
                {t.name}
              </span>
              {!t.isActive && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded">
                  INACTIVE
                </span>
              )}
              {children.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 rounded">
                  {children.length} subtask{children.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {t.description && depth === 0 && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-sm">{t.description}</p>
            )}
          </div>
          <div className="w-28 hidden sm:block shrink-0">
            <span className={'inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ' + statusCls}>
              {t.status.replace('_', ' ')}
            </span>
          </div>
          <div className="w-20 hidden md:block shrink-0">
            <span className={'inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ' + priorityCls}>
              {t.priority ?? 'MEDIUM'}
            </span>
          </div>
          <div className="w-28 hidden lg:flex items-center gap-1.5 shrink-0">
            {assignee ? (
              <>
                <div className="w-5 h-5 rounded-full bg-slate-700 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                  {assignee.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs text-slate-600 truncate">{assignee.name.split(' ')[0]}</span>
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">Unassigned</span>
            )}
          </div>
          <div className="w-20 hidden xl:block shrink-0 text-xs text-slate-500 font-mono">{fmt(t.startDate)}</div>
          <div className={'w-20 hidden lg:flex items-center gap-1 shrink-0 text-xs font-mono ' + (overdue ? 'text-rose-600 font-semibold' : 'text-slate-500')}>
            {fmt(t.dueDate)}
            {overdue && <AlertCircle className="w-3 h-3 shrink-0" />}
          </div>
          <div className="w-16 hidden xl:block shrink-0 text-xs text-slate-500 font-mono text-right">
            {t.estimatedHours != null ? t.estimatedHours + 'h' : '--'}
          </div>
          <div className="w-10 flex items-center justify-end shrink-0" onClick={e => e.stopPropagation()}>
            {isAdmin && projectIsActive && (
              <button
                id={'task-edit-btn-' + t.id}
                onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
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
    <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
      <div className="bg-slate-50/80 border-b border-slate-200/80 px-4 py-2.5 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
        <div className="flex-1">Task</div>
        <div className="w-28 hidden sm:block">Status</div>
        <div className="w-20 hidden md:block">Priority</div>
        <div className="w-28 hidden lg:flex items-center gap-1"><User className="w-3 h-3" /> Assignee</div>
        <div className="w-20 hidden xl:block">Start</div>
        <div className="w-20 hidden lg:flex items-center gap-1"><Clock className="w-3 h-3" /> Due</div>
        <div className="w-16 hidden xl:block text-right">Est.</div>
        <div className="w-10" />
      </div>
      <div role="rowgroup">
        {rootTasks.map(t => renderTask(t))}
      </div>
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          {filteredTasks.length} of {tasks.length} tasks shown
        </span>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:block">
          Click a row to view details
        </span>
      </div>
    </div>
  );
};