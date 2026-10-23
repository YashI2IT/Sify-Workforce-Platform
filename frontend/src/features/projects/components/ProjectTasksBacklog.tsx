import ReactDOM from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock, AlertCircle, GripVertical, User, ChevronDown, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { Task, Employee } from './ProjectTasksTab';
import { statusColors, priorityColors, fmt, isOverdue } from './taskUtils';

interface ProjectTasksBacklogProps {
  tasks: Task[]; // root tasks
  allFilteredTasks: Task[]; // used for counting subtasks
  employees: Employee[];
  isAdmin: boolean;
  projectIsActive: boolean;
  onViewDetail: (t: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
  currentEmployeeId?: string;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

export const ProjectTasksBacklog = ({
  tasks,
  allFilteredTasks,
  employees,
  isAdmin,
  projectIsActive,
  onViewDetail,
  onStatusChange,
  currentEmployeeId
}: ProjectTasksBacklogProps) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    COMPLETED: true // Collapse completed by default
  });

  const toggleCollapse = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);
  const childrenCount = (id: string) => allFilteredTasks.filter(t => t.parentTaskId === id).length;

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return; // No manual sorting within sections
    
    const task = tasks.find(t => t.id === draggableId);
    if (!task || !task.isActive || !projectIsActive) return;
    if (!isAdmin && task.assigneeId !== currentEmployeeId) return;

    let newStatus = 'TODO';
    if (destination.droppableId === 'ACTIVE_WORK') newStatus = 'IN_PROGRESS';
    else if (destination.droppableId === 'REVIEW') newStatus = 'REVIEW';
    else if (destination.droppableId === 'COMPLETED') newStatus = 'DONE';

    onStatusChange(draggableId, newStatus);
  };

  const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const reviewTasks = tasks.filter(t => t.status === 'REVIEW');
  const backlogTasks = tasks.filter(t => t.status === 'TODO').sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority ?? 'MEDIUM'] ?? 0;
    const pb = PRIORITY_WEIGHT[b.priority ?? 'MEDIUM'] ?? 0;
    if (pa !== pb) return pb - pa;
    // Tie breaker: created date or just name
    return a.name.localeCompare(b.name);
  });
  const completedTasks = tasks.filter(t => t.status === 'DONE');

  const SECTIONS = [
    { id: 'ACTIVE_WORK', title: 'Active Work', tasks: activeTasks, color: 'bg-blue-50 text-blue-700 border-blue-200/60' },
    { id: 'REVIEW', title: 'In Review', tasks: reviewTasks, color: 'bg-amber-50 text-amber-700 border-amber-200/60' },
    { id: 'BACKLOG', title: 'Backlog', tasks: backlogTasks, color: 'bg-slate-100 text-slate-700 border-slate-200/60' },
    { id: 'COMPLETED', title: 'Completed', tasks: completedTasks, color: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' }
  ];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-4 pb-6">
        {SECTIONS.map(section => {
          const isCollapsed = collapsed[section.id];
          
          return (
            <div key={section.id} className="bg-white border border-slate-200/80 rounded-[14px] shadow-xs transition-shadow hover:shadow-md">
              <div 
                className={`px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors rounded-t-2xl ${isCollapsed ? 'border-b-0 rounded-b-2xl' : ''}`}
                onClick={() => toggleCollapse(section.id)}
              >
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <h4 className="font-bold text-sm text-slate-900 tracking-tight font-sans">{section.title}</h4>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${section.color}`}>
                    {section.tasks.length}
                  </span>
                </div>
              </div>
              
              {!isCollapsed && (
                <Droppable droppableId={section.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-2.5 min-h-[50px] rounded-b-2xl transition-all duration-200 ease-out flex flex-col gap-2 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/70 ring-2 ring-indigo-400/50 ring-inset shadow-inner' : 'bg-slate-50/20'
                      }`}
                    >
                      {section.tasks.map((t, index) => {
                        const isDragDisabled = !t.isActive || (!isAdmin && t.assigneeId !== currentEmployeeId) || !projectIsActive;
                        const priorityCls = priorityColors[t.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
                        const statusCls = statusColors[t.status] ?? statusColors.TODO;
                        const assignee = getEmployee(t.assigneeId);
                        const overdue = isOverdue(t.dueDate, t.status);
                        const subtasks = childrenCount(t.id);

                        return (
                          <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={isDragDisabled}>
                            {(provided, snapshot) => {
                              const itemContent = (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`outline-none select-none ${snapshot.isDragging ? 'z-[9999]' : ''}`}
                                  style={provided.draggableProps.style}
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    className={`group flex items-center gap-3 p-3 bg-white border rounded-xl select-none transition-shadow duration-150 ${
                                      isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                                    } ${
                                      snapshot.isDragging
                                        ? 'shadow-2xl shadow-slate-900/15 border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
                                        : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md shadow-xs'
                                    } ${!t.isActive ? 'opacity-60' : ''}`}
                                    onClick={() => onViewDetail(t)}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onViewDetail(t); }}
                                  >
                                    <div
                                      className={`shrink-0 p-0.5 rounded transition-colors ${
                                        isDragDisabled ? 'hidden' : ''
                                      } ${
                                        snapshot.isDragging ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-500'
                                      }`}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                        <h5 className={`font-semibold text-sm leading-snug truncate font-sans ${section.id === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-indigo-600 transition-colors'}`}>
                                          {t.name}
                                        </h5>
                                        {section.id === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-sans border ${statusCls}`}>
                                          {t.status.replace('_', ' ')}
                                        </span>
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${priorityCls}`}>
                                          {t.priority ?? 'MEDIUM'}
                                        </span>
                                        {!t.isActive && (
                                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 rounded-full font-sans">
                                            INACTIVE
                                          </span>
                                        )}
                                        {subtasks > 0 && (
                                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full font-sans">
                                            {subtasks} subtask{subtasks > 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 shrink-0">
                                      <div className="flex flex-col gap-1 items-end hidden sm:flex">
                                        {t.dueDate && (
                                          <div className={`flex items-center gap-1 text-[11px] font-mono ${overdue ? 'text-rose-600 font-bold' : 'text-slate-500 font-medium'}`}>
                                            <Clock className="w-3 h-3 shrink-0" />
                                            <span>{fmt(t.dueDate)}</span>
                                            {overdue && <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />}
                                          </div>
                                        )}
                                        {t.estimatedHours != null && (
                                          <div className="text-[11px] text-slate-400 font-medium font-mono">
                                            Est: <span className="font-semibold text-slate-600">{t.estimatedHours}h</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center shrink-0 w-8 justify-end">
                                        {assignee ? (
                                          <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center border border-white shadow-2xs" title={assignee.name}>
                                            {assignee.name.slice(0, 1).toUpperCase()}
                                          </div>
                                        ) : (
                                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200/80 shadow-2xs" title="Unassigned">
                                            <User className="w-3.5 h-3.5" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );

                              if (snapshot.isDragging && typeof document !== 'undefined') {
                                return ReactDOM.createPortal(itemContent, document.body);
                              }
                              return itemContent;
                            }}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {section.tasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="py-2.5 flex items-center justify-center border border-dashed border-slate-200/80 rounded-xl bg-slate-50/40">
                          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Empty</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};