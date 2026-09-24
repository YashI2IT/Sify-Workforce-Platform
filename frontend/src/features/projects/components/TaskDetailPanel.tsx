import { X, Edit2, Clock, Calendar, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
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

interface Employee { id: string; name: string; }

interface TaskDetailPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  employees: Employee[];
  isAdmin: boolean;
  projectIsActive: boolean;
  projectId: string;
  onEdit: (t: Task) => void;
}

const statusColors: Record<string, string> = {
  TODO:        'bg-slate-100 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEW:      'bg-amber-50 text-amber-700 border-amber-200',
  DONE:        'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const priorityColors: Record<string, string> = {
  LOW:    'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-sky-50 text-sky-700',
  HIGH:   'bg-orange-50 text-orange-700',
  URGENT: 'bg-rose-50 text-rose-700',
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set';

const isOverdue = (d?: string | null, status?: string) => {
  if (!d || status === 'DONE') return false;
  return new Date(d) < new Date();
};

const MetaRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
    <span className="text-[11px] font-bold text-slate-400 uppercase font-mono w-28 pt-0.5 shrink-0">{label}</span>
    <div className="flex-1 min-w-0 text-xs text-slate-800 font-medium">{children}</div>
  </div>
);

export const TaskDetailPanel = ({
  task,
  isOpen,
  onClose,
  tasks,
  employees,
  isAdmin,
  projectIsActive,
  onEdit,
}: TaskDetailPanelProps) => {
  if (!isOpen || !task) return null;

  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);
  const getTask = (id?: string | null) => tasks.find(t => t.id === id);

  const subtasks = tasks.filter(t => t.parentTaskId === task.id);
  const parentTask = getTask(task.parentTaskId);
  const assignee = getEmployee(task.assigneeId);

  const statusCls = statusColors[task.status] ?? statusColors.TODO;
  const priorityCls = priorityColors[task.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-white shadow-2xl flex flex-col animate-[slideInRight_0.2s_ease-out]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={'px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border ' + statusCls}>
                {task.status.replace('_', ' ')}
              </span>
              <span className={'px-2 py-0.5 rounded text-[10px] font-bold font-mono ' + priorityCls}>
                {task.priority ?? 'MEDIUM'}
              </span>
              {!task.isActive && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded">
                  INACTIVE
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-extrabold text-slate-900 font-display leading-tight">
              {task.name}
            </h2>
            {task.description && (
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && projectIsActive && (
              <button
                id="task-detail-edit-icon"
                onClick={() => { onEdit(task); onClose(); }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                title="Edit Task"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              id="detail-panel-close"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* ── METADATA ── */}
          <section>
            <p className="text-[10px] font-bold text-slate-500 uppercase font-mono mb-2">Details</p>
            <div className="bg-slate-50/60 border border-slate-100 rounded-xl px-4 py-1">
              <MetaRow label="Assignee">
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-700 text-white text-[9px] font-bold flex items-center justify-center">
                      {assignee.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span>{assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </MetaRow>
              <MetaRow label="Start">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {fmt(task.startDate)}
                </span>
              </MetaRow>
              <MetaRow label="Due">
                <span className={'flex items-center gap-1.5 ' + (overdue ? 'text-rose-600 font-semibold' : '')}>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {fmt(task.dueDate)}
                  {overdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                </span>
              </MetaRow>
              <MetaRow label="Est. Hours">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {task.estimatedHours != null ? task.estimatedHours + 'h estimated' : 'Not set'}
                </span>
              </MetaRow>
            </div>
          </section>

          {/* ── HIERARCHY ── */}
          {(parentTask || subtasks.length > 0) && (
            <section>
              <p className="text-[10px] font-bold text-slate-500 uppercase font-mono mb-2">Hierarchy</p>
              <div className="space-y-2">
                {parentTask && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-1">Parent</p>
                    <div className="flex items-center gap-2">
                      <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ' + (statusColors[parentTask.status] ?? statusColors.TODO)}>
                        {parentTask.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{parentTask.name}</span>
                    </div>
                  </div>
                )}
                {subtasks.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2">
                      Subtasks ({subtasks.length})
                    </p>
                    <div className="space-y-1.5">
                      {subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2">
                          <span className={'px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border shrink-0 ' + (statusColors[sub.status] ?? statusColors.TODO)}>
                            {sub.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-700 truncate">{sub.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── MANAGER COMMENT ── */}
          <section>
            <p className="text-[10px] font-bold text-slate-500 uppercase font-mono mb-2">Manager Comment</p>
            <textarea
              rows={3}
              placeholder="Add comment..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-950 focus:border-transparent bg-white shadow-sm transition-all resize-none"
            />
          </section>

          {/* ── ACTIONS ── */}
          <section>
            <p className="text-[10px] font-bold text-slate-500 uppercase font-mono mb-2">Actions</p>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 cursor-pointer transition-colors shadow-2xs">
                Approve
              </button>
              <button className="flex-1 px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 cursor-pointer transition-colors shadow-2xs">
                Reject
              </button>
            </div>
          </section>
        </div>

      </div>
    </>
  );
};