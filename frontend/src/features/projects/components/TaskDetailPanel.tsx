import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Edit2, Clock, Calendar, AlertCircle, Send, Trash2, Edit3, MessageSquare, Link, Plus } from 'lucide-react';
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee';
import { useGetTaskCommentsQuery, useCreateTaskCommentMutation, useUpdateTaskCommentMutation, useDeleteTaskCommentMutation, useGetTaskDependenciesQuery, useCreateTaskDependencyMutation, useDeleteTaskDependencyMutation, useGetEmployeesDirectoryQuery, useUpdateProjectTaskMutation } from '../../../store/apiSlice';
import { useToast } from '../../../context/ToastContext';
import { Select } from '../../../components/ui/Select';

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
  metadata?: Record<string, any> | null;
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
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <span className="text-xs font-semibold text-slate-500 font-sans w-28 pt-0.5 shrink-0">{label}</span>
    <div className="flex-1 min-w-0 text-xs text-slate-800 font-medium font-sans">{children}</div>
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
  
  const [updateProjectTask] = useUpdateProjectTaskMutation();

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateProjectTask({ projectId, taskId: task!.id, data: { status: newStatus } }).unwrap();
      showToast('Task status updated', 'success');
    } catch (e: any) {
      showToast(e.data?.message || 'Failed to update status', 'error');
    }
  };
  
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

  const [mentionQuery, setMentionQuery] = useState<{ active: boolean, text: string, startIndex: number }>({ active: false, text: '', startIndex: -1 });
  const [selectedMentions, setSelectedMentions] = useState<{name: string, id: string}[]>([]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);
    
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      if (lastAtSymbol === 0 || textBeforeCursor[lastAtSymbol - 1] === ' ' || textBeforeCursor[lastAtSymbol - 1] === '\n') {
        const query = textBeforeCursor.slice(lastAtSymbol + 1);
        if (!query.includes(' ')) {
          setMentionQuery({ active: true, text: query, startIndex: lastAtSymbol });
          return;
        }
      }
    }
    setMentionQuery({ active: false, text: '', startIndex: -1 });
  };

  const handleMentionSelect = (emp: Employee) => {
    const before = newComment.slice(0, mentionQuery.startIndex);
    const after = newComment.slice(mentionQuery.startIndex + mentionQuery.text.length + 1);
    setNewComment(`${before}@${emp.name} ${after}`);
    setSelectedMentions(prev => {
      if (!prev.find(m => m.id === emp.id)) {
        return [...prev, { name: emp.name, id: emp.id }];
      }
      return prev;
    });
    setMentionQuery({ active: false, text: '', startIndex: -1 });
  };

  const { data: allEmployeesRes } = useGetEmployeesDirectoryQuery(undefined, { skip: !isOpen || !mentionQuery.active });
  const allEmployees = allEmployeesRes || [];

  const mentionCandidates = allEmployees.length > 0 ? allEmployees : employees;
  const filteredMentions = mentionCandidates
    .filter((e: any) => e.id !== employee?.id)
    .filter((e: any) => e.name.toLowerCase().includes(mentionQuery.text.toLowerCase()));

  // Render mentions elegantly
  const renderCommentText = (text: string) => {
    const parts = text.split(/(@\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/@\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <span key={i} className="text-indigo-600 font-semibold bg-indigo-50 px-1 rounded shadow-xs">@{match[1]}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);
  const getTask = (id?: string | null) => tasks.find(t => t.id === id);

  const subtasks = tasks.filter(t => t.parentTaskId === task.id);
  const parentTask = getTask(task.parentTaskId);
  const assignee = getEmployee(task.assigneeId);

  const statusCls = statusColors[task.status] ?? statusColors.TODO;
  const priorityCls = priorityColors[task.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
  const overdue = isOverdue(task.dueDate, task.status);

  const panelNode = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop covering 100% of viewport */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel covering 100% height from top to bottom */}
      <div
        className="relative z-10 w-full sm:w-[540px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-[slideInRight_0.2s_ease-out] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                {task.ticketId}
              </span>
              <span className={'px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ' + statusCls}>
                {task.status.replace('_', ' ')}
              </span>
              <span className={'px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ' + priorityCls}>
                {task.priority ?? 'MEDIUM'}
              </span>
              {!task.isActive && (
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-full">
                  INACTIVE
                </span>
              )}
            </div>
            <h2 id="task-detail-title" className="mt-2.5 text-lg font-bold text-slate-900 font-sans tracking-tight leading-tight">
              {task.name}
            </h2>
            {task.description && (
              <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed font-sans">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 -mr-1">
            {isAdmin && projectIsActive && (
              <button
                id="task-detail-edit-icon"
                onClick={() => { onEdit(task); onClose(); }}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
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
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── METADATA ── */}
          <section>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans mb-2">Details</h3>
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-[14px] px-4 py-1.5">
              <MetaRow label="Assignee">
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#12161F] text-white text-[9px] font-bold flex items-center justify-center">
                      {assignee.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900">{assignee.name}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Unassigned</span>
                )}
              </MetaRow>
              <MetaRow label="Start">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {fmt(task.startDate)}
                </span>
              </MetaRow>
              <MetaRow label="Due">
                <span className={'flex items-center gap-1.5 ' + (overdue ? 'text-rose-600 font-bold' : 'text-slate-700')}>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {fmt(task.dueDate)}
                  {overdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                </span>
              </MetaRow>
              <MetaRow label="Est. Hours">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {task.estimatedHours != null ? task.estimatedHours + 'h estimated' : 'Not set'}
                </span>
              </MetaRow>
              <MetaRow label="Status">
                {((isAdmin || task.assigneeId === employee?.id) && projectIsActive) ? (
                  <div className="w-[140px]">
                    <Select
                      value={task.status}
                      onChange={handleStatusChange}
                      options={[
                        { value: 'TODO', label: 'TODO' },
                        { value: 'IN_PROGRESS', label: 'IN PROGRESS' },
                        { value: 'REVIEW', label: 'REVIEW' },
                        { value: 'DONE', label: 'DONE' }
                      ]}
                      triggerClassName={`!py-1 !pl-2.5 !pr-1.5 rounded-lg text-xs font-bold font-mono border shadow-2xs ${statusCls.split(' ').map(c => '!' + c).join(' ')}`}
                    />
                  </div>
                ) : (
                  <span className={'inline-flex px-2.5 py-1 rounded-lg text-xs font-bold font-mono border shadow-2xs ' + statusCls}>
                    {task.status.replace('_', ' ')}
                  </span>
                )}
              </MetaRow>
            </div>
          </section>

          {/* ── CUSTOM FIELDS ── */}
          {task.metadata && Object.keys(task.metadata).length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans mb-2">Custom Fields</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(task.metadata).map(([key, val]) => (
                  <div key={key} className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-0.5">{key}</p>
                    <p className="text-xs font-semibold text-slate-800 break-words">{String(val || '—')}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── HIERARCHY ── */}
          {(parentTask || subtasks.length > 0) && (
            <section>
              <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans mb-2">Hierarchy</h3>
              <div className="space-y-2">
                {parentTask && (
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-1">Parent Task</p>
                    <div className="flex items-center gap-2">
                      {parentTask.ticketId && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0 shadow-2xs">
                          {parentTask.ticketId}
                        </span>
                      )}
                      <span className={'px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ' + (statusColors[parentTask.status] ?? statusColors.TODO)}>
                        {parentTask.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate font-sans">{parentTask.name}</span>
                    </div>
                  </div>
                )}
                {subtasks.length > 0 && (
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-2">
                      Subtasks ({subtasks.length})
                    </p>
                    <div className="space-y-2">
                      {subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-2">
                          {sub.ticketId && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0 shadow-2xs">
                              {sub.ticketId}
                            </span>
                          )}
                          <span className={'px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono border shrink-0 ' + (statusColors[sub.status] ?? statusColors.TODO)}>
                            {sub.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-800 font-medium truncate font-sans">{sub.name}</span>
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
              <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">Dependencies</h3>
              {isAdmin && projectIsActive && !isAddingDep && (
                <button
                  onClick={() => setIsAddingDep(true)}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 font-sans cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            {isAddingDep && (
              <div className="p-3.5 mb-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                <div className="flex gap-2">
                  <select 
                    className="flex-1 text-xs border border-slate-200 rounded-lg p-2 bg-white outline-none"
                    value={newDepId}
                    onChange={(e) => setNewDepId(e.target.value)}
                  >
                    <option value="">Select task...</option>
                    {tasks.filter(t => t.id !== task.id && t.isActive).map(t => (
                      <option key={t.id} value={t.id}>{t.ticketId} - {t.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-20 text-xs border border-slate-200 rounded-lg p-2 bg-white font-mono outline-none"
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
                  <button onClick={() => setIsAddingDep(false)} className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer">CANCEL</button>
                  <button onClick={handleCreateDep} disabled={!newDepId || creatingDep} className="px-3 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 cursor-pointer">
                    SAVE
                  </button>
                </div>
              </div>
            )}

            {depsLoading ? (
               <div className="text-xs text-slate-400 font-sans">Loading...</div>
            ) : (!depsData?.predecessors?.length && !depsData?.successors?.length && !isAddingDep) ? (
               <div className="text-xs text-slate-400 italic font-sans">No dependencies set.</div>
            ) : (
              <div className="space-y-2">
                {depsData?.predecessors?.length > 0 && (
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-2 flex items-center gap-1">
                      <Link className="w-3 h-3" /> Waiting On (Predecessors)
                    </p>
                    <div className="space-y-1.5">
                      {depsData.predecessors.map((dep: any) => {
                         const predTask = getTask(dep.predecessorId);
                         if (!predTask) return null;
                         return (
                           <div key={dep.id} className="flex items-center justify-between gap-2">
                             <div className="flex items-center gap-2 overflow-hidden">
                               <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded font-mono shrink-0">{dep.type}</span>
                               <span className="text-xs text-slate-800 font-medium truncate">{predTask.ticketId} {predTask.name}</span>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  </div>
                )}
                {depsData?.successors?.length > 0 && (
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase font-sans mb-2 flex items-center gap-1">
                      <Link className="w-3 h-3" /> Blocks (Successors)
                    </p>
                    <div className="space-y-1.5">
                      {depsData.successors.map((dep: any) => {
                         const succTask = getTask(dep.successorId);
                         if (!succTask) return null;
                         return (
                           <div key={dep.id} className="flex items-center justify-between gap-2 group">
                             <div className="flex items-center gap-2 overflow-hidden">
                               <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-100 text-indigo-700 rounded font-mono shrink-0">{dep.type}</span>
                               <span className="text-xs text-slate-800 font-medium truncate">{succTask.ticketId} {succTask.name}</span>
                             </div>
                             {isAdmin && projectIsActive && (
                               <button 
                                 onClick={() => handleDeleteDep(dep.successorId)}
                                 className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                                 title="Remove dependency"
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

          {/* ── COMMENTS STREAM ── */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-900 tracking-tight font-sans">
                Comments {comments.length > 0 && `(${comments.length})`}
              </h3>
            </div>
            
            <div className="space-y-3">
              {commentsLoading ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium font-sans">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 bg-slate-50/60 rounded-xl border border-dashed border-slate-200/80">
                  <MessageSquare className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium font-sans">No comments yet.</p>
                </div>
              ) : (
                comments.map((c: any) => {
                  const isAuthor = c.authorId === employee?.id;
                  const canEdit = isAuthor || isAdmin;
                  
                  if (editingCommentId === c.id) {
                    return (
                      <div key={c.id} className="bg-white p-3 rounded-xl shadow-xs border border-slate-200">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full text-xs sm:text-sm border-0 focus:ring-0 p-0 resize-none bg-transparent outline-none font-sans text-slate-800"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-800 font-sans cursor-pointer">Cancel</button>
                          <button
                            onClick={async () => {
                              try {
                                let finalComment = editContent;
                                selectedMentions.forEach(m => {
                                  const regex = new RegExp(`@${m.name}(?!\\w)`, 'g');
                                  finalComment = finalComment.replace(regex, `@[${m.name}](${m.id})`);
                                });
                                await updateComment({ projectId, taskId: task.id, commentId: c.id, comment: finalComment }).unwrap();
                                setEditingCommentId(null);
                                setSelectedMentions([]);
                              } catch (err) {
                                showToast('Failed to update comment', 'error');
                              }
                            }}
                            disabled={!editContent.trim()}
                            className="text-xs font-bold text-slate-900 hover:text-slate-950 disabled:opacity-40 font-sans cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={c.id} className="flex gap-3 group p-3 rounded-xl bg-slate-50/70 border border-slate-100/90 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-[#12161F] text-white flex items-center justify-center shrink-0 font-sans font-bold text-[10px]">
                        {c.author?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 font-sans">{c.author?.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { 
                                setEditingCommentId(c.id);
                                let raw = c.comment;
                                const mentions: {name: string, id: string}[] = [];
                                const regex = /@\[(.*?)\]\((.*?)\)/g;
                                let match;
                                while ((match = regex.exec(c.comment)) !== null) {
                                  mentions.push({ name: match[1], id: match[2] });
                                }
                                raw = raw.replace(/@\[(.*?)\]\((.*?)\)/g, '@$1');
                                setEditContent(raw);
                                setSelectedMentions(mentions);
                              }} className="p-1 text-slate-400 hover:text-slate-800 rounded cursor-pointer" title="Edit">
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
                              }} className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">{renderCommentText(c.comment)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Pinned Bottom Footer for Add Comment */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 shrink-0">
          <div className="relative bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-slate-900 transition-all shadow-xs">
            <textarea
              value={newComment}
              onChange={handleTextChange}
              placeholder="Write a comment... (Type @ to mention)"
              rows={2}
              className="w-full px-3.5 py-3 text-xs sm:text-sm border-0 bg-transparent resize-none outline-none font-sans text-slate-800 placeholder:text-slate-400"
            />
            
            <div className="px-2 pb-2 flex justify-between items-center">
              <div className="flex-1" />
              <button
                disabled={(() => {
                  let text = newComment;
                  selectedMentions.forEach(m => {
                    const regex = new RegExp(`@${m.name}(?!\\w)`, 'g');
                    text = text.replace(regex, '');
                  });
                  return text.trim().length === 0 || isCreating;
                })()}
                onClick={async () => {
                  try {
                    let finalComment = newComment;
                    selectedMentions.forEach(m => {
                      const regex = new RegExp(`@${m.name}(?!\\w)`, 'g');
                      finalComment = finalComment.replace(regex, `@[${m.name}](${m.id})`);
                    });
                    await createComment({ projectId, taskId: task.id, comment: finalComment.trim() }).unwrap();
                    setNewComment('');
                    setSelectedMentions([]);
                  } catch (err) {
                    showToast('Failed to post comment', 'error');
                  }
                }}
                className="inline-flex items-center justify-center p-2 bg-[#12161F] text-white rounded-lg hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#12161F] transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            {mentionQuery.active && filteredMentions.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                {filteredMentions.map((emp: any) => (
                  <button
                    key={emp.id}
                    onClick={() => handleMentionSelect(emp)}
                    className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {emp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(panelNode, document.body) : panelNode;
};