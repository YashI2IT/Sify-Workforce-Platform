import { useState } from 'react';
import { X, Edit2, Clock, Calendar, AlertCircle, Send, Trash2, Edit3, MessageSquare, Link, Plus } from 'lucide-react';
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee';
import { useGetTaskCommentsQuery, useCreateTaskCommentMutation, useUpdateTaskCommentMutation, useDeleteTaskCommentMutation, useGetTaskDependenciesQuery, useCreateTaskDependencyMutation, useDeleteTaskDependencyMutation } from '../../../store/apiSlice';
import { useToast } from '../../../context/ToastContext';

interface Task {
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
  projectId,
  onEdit,
}: TaskDetailPanelProps) => {
  const { employee } = useCurrentEmployee();
  const { showToast } = useToast();
  
  // Comments API
  const { data: comments = [], isLoading: commentsLoading } = useGetTaskCommentsQuery(
    { projectId, taskId: task?.id ?? '' },
    { skip: !isOpen || !task }
  );
  const [createComment, { isLoading: isCreating }] = useCreateTaskCommentMutation();
  const [updateComment] = useUpdateTaskCommentMutation();
  const [deleteComment] = useDeleteTaskCommentMutation();

  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Dependencies API
  const { data: depsData, isLoading: depsLoading, refetch: refetchDeps } = useGetTaskDependenciesQuery(
    task?.id ?? '',
    { skip: !isOpen || !task }
  );
  const [createDep, { isLoading: creatingDep }] = useCreateTaskDependencyMutation();
  const [deleteDep] = useDeleteTaskDependencyMutation();

  const [isAddingDep, setIsAddingDep] = useState(false);
  const [newDepId, setNewDepId] = useState('');
  const [newDepType, setNewDepType] = useState('FS');

  const handleCreateDep = async () => {
    if (!newDepId) return;
    try {
       await createDep({ taskId: task!.id, successorId: newDepId, type: newDepType, projectId }).unwrap();
       setIsAddingDep(false);
       setNewDepId('');
       setNewDepType('FS');
       refetchDeps();
       showToast('Dependency added', 'success');
    } catch (e: any) {
       showToast(e.data?.message || 'Failed to add dependency', 'error');
    }
  };
  const handleDeleteDep = async (succId: string) => {
    try {
      await deleteDep({ taskId: task!.id, successorId: succId, projectId }).unwrap();
      refetchDeps();
      showToast('Dependency removed', 'success');
    } catch (e: any) {
      showToast(e.data?.message || 'Failed to remove dependency', 'error');
    }
  };

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
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono border bg-blue-50 text-blue-600 border-blue-100">
                {task.ticketId}
              </span>
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

          {/* ── DEPENDENCIES ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Dependencies</p>
              {isAdmin && projectIsActive && !isAddingDep && (
                <button
                  onClick={() => setIsAddingDep(true)}
                  className="text-[10px] font-bold text-indigo-600 uppercase flex items-center gap-1 hover:text-indigo-700"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>

            {isAddingDep && (
              <div className="p-3 mb-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex gap-2">
                  <select 
                    className="flex-1 text-xs border border-slate-200 rounded-lg p-1.5 bg-white"
                    value={newDepId}
                    onChange={(e) => setNewDepId(e.target.value)}
                  >
                    <option value="">Select task...</option>
                    {tasks.filter(t => t.id !== task.id && t.isActive).map(t => (
                      <option key={t.id} value={t.id}>{t.ticketId} - {t.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-20 text-xs border border-slate-200 rounded-lg p-1.5 bg-white font-mono"
                    value={newDepType}
                    onChange={(e) => setNewDepType(e.target.value)}
                  >
                    <option value="FS">FS</option>
                    <option value="SS">SS</option>
                    <option value="FF">FF</option>
                    <option value="SF">SF</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsAddingDep(false)} className="text-[10px] font-bold text-slate-500">CANCEL</button>
                  <button onClick={handleCreateDep} disabled={!newDepId || creatingDep} className="text-[10px] font-bold text-indigo-600 disabled:opacity-50">
                    SAVE
                  </button>
                </div>
              </div>
            )}

            {depsLoading ? (
               <div className="text-xs text-slate-400">Loading...</div>
            ) : (!depsData?.predecessors?.length && !depsData?.successors?.length && !isAddingDep) ? (
               <div className="text-xs text-slate-400 italic">No dependencies set.</div>
            ) : (
              <div className="space-y-2">
                {depsData?.predecessors?.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2 flex items-center gap-1">
                      <Link className="w-3 h-3" /> Waiting On (Predecessors)
                    </p>
                    <div className="space-y-1.5">
                      {depsData.predecessors.map((dep: any) => {
                         const predTask = getTask(dep.predecessorId);
                         if (!predTask) return null;
                         return (
                           <div key={dep.id} className="flex items-center justify-between gap-2">
                             <div className="flex items-center gap-2 overflow-hidden">
                               <span className="px-1 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded font-mono shrink-0">{dep.type}</span>
                               <span className="text-xs text-slate-700 truncate">{predTask.ticketId} {predTask.name}</span>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  </div>
                )}
                {depsData?.successors?.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-mono mb-2 flex items-center gap-1">
                      <Link className="w-3 h-3" /> Blocks (Successors)
                    </p>
                    <div className="space-y-1.5">
                      {depsData.successors.map((dep: any) => {
                         const succTask = getTask(dep.successorId);
                         if (!succTask) return null;
                         return (
                           <div key={dep.id} className="flex items-center justify-between gap-2 group">
                             <div className="flex items-center gap-2 overflow-hidden">
                               <span className="px-1 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded font-mono shrink-0">{dep.type}</span>
                               <span className="text-xs text-slate-700 truncate">{succTask.ticketId} {succTask.name}</span>
                             </div>
                             {isAdmin && projectIsActive && (
                               <button 
                                 onClick={() => handleDeleteDep(dep.successorId)}
                                 className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                             )}
                           </div>
                         );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── COMMENTS ── */}
          <section className="flex flex-col flex-1 min-h-0 border-t border-slate-100">
            <div className="p-5 flex items-center gap-2 border-b border-slate-50">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">Comments</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {commentsLoading ? (
                <div className="text-center py-4 text-xs text-slate-400 font-medium">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No comments yet.</p>
                </div>
              ) : (
                comments.map((c: any) => {
                  const isAuthor = c.authorId === employee?.id;
                  const canEdit = isAuthor || isAdmin;
                  
                  if (editingCommentId === c.id) {
                    return (
                      <div key={c.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full text-sm border-0 focus:ring-0 p-0 resize-none bg-transparent"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                          <button
                            onClick={async () => {
                              try {
                                await updateComment({ projectId, taskId: task.id, commentId: c.id, comment: editContent }).unwrap();
                                setEditingCommentId(null);
                              } catch (err) {
                                showToast('Failed to update comment', 'error');
                              }
                            }}
                            disabled={!editContent.trim()}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={c.id} className="flex gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shrink-0 border border-indigo-200/50">
                        <span className="text-xs font-bold text-indigo-700">{c.author?.name?.charAt(0) || 'U'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className="text-xs font-bold text-slate-700">{c.author?.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">
                              {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCommentId(c.id); setEditContent(c.comment); }} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={async () => {
                                if(confirm('Delete this comment?')) {
                                  try {
                                    await deleteComment({ projectId, taskId: task.id, commentId: c.id }).unwrap();
                                  } catch (err) {
                                    showToast('Failed to delete comment', 'error');
                                  }
                                }
                              }} className="p-1 text-slate-400 hover:text-rose-600 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{c.comment}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="w-full px-4 py-3 pr-12 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 hover:bg-slate-100/50 transition-colors resize-none"
                />
                <button
                  disabled={!newComment.trim() || isCreating}
                  onClick={async () => {
                    try {
                      await createComment({ projectId, taskId: task.id, comment: newComment.trim() }).unwrap();
                      setNewComment('');
                    } catch (err) {
                      showToast('Failed to post comment', 'error');
                    }
                  }}
                  className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        </div>

      </div>
    </>
  );
};