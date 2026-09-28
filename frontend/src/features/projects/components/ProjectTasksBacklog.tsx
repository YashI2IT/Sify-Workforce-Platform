import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock, AlertCircle, GripVertical, User, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
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
  onStatusChange
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
    if (!task || !task.isActive || !isAdmin || !projectIsActive) return;

    let newStatus = 'TODO';
    if (destination.droppableId === 'ACTIVE_WORK') newStatus = 'IN_PROGRESS';
    else if (destination.droppableId === 'COMPLETED') newStatus = 'DONE';

    onStatusChange(draggableId, newStatus);
  };

  const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW');
  const backlogTasks = tasks.filter(t => t.status === 'TODO').sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority ?? 'MEDIUM'] ?? 0;
    const pb = PRIORITY_WEIGHT[b.priority ?? 'MEDIUM'] ?? 0;
    if (pa !== pb) return pb - pa;
    // Tie breaker: created date or just name
    return a.name.localeCompare(b.name);
  });
  const completedTasks = tasks.filter(t => t.status === 'DONE');

  const SECTIONS = [
    { id: 'ACTIVE_WORK', title: 'Active Work', tasks: activeTasks, color: 'bg-blue-50 text-blue-700' },
    { id: 'BACKLOG', title: 'Backlog', tasks: backlogTasks, color: 'bg-slate-100 text-slate-700' },
    { id: 'COMPLETED', title: 'Completed', tasks: completedTasks, color: 'bg-emerald-50 text-emerald-700' }
  ];

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 pb-8">
        {SECTIONS.map(section => {
          const isCollapsed = collapsed[section.id];
          
          return (
            <div key={section.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div 
                className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${isCollapsed ? 'border-b-0' : ''}`}
                onClick={() => toggleCollapse(section.id)}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <h4 className="font-bold font-display text-sm text-slate-900 tracking-tight">{section.title}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${section.color}`}>
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
                      className={`p-2 min-h-[100px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-slate-50' : 'bg-slate-50/30'
                      }`}
                    >
                      {section.tasks.map((t, index) => {
                        const isDragDisabled = !t.isActive || !isAdmin || !projectIsActive;
                        const priorityCls = priorityColors[t.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
                        const statusCls = statusColors[t.status] ?? statusColors.TODO;
                        const assignee = getEmployee(t.assigneeId);
                        const overdue = isOverdue(t.dueDate, t.status);
                        const subtasks = childrenCount(t.id);

                        return (
                          <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={isDragDisabled}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`group flex items-center gap-3 p-3 mb-1.5 bg-white border rounded-xl shadow-xs transition-all ${
                                  snapshot.isDragging ? 'border-slate-400 shadow-lg scale-[1.02]' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                } ${!t.isActive ? 'opacity-60' : ''}`}
                                onClick={() => onViewDetail(t)}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className={`shrink-0 text-slate-300 hover:text-slate-500 cursor-grab ${isDragDisabled ? 'hidden' : ''}`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h5 className={`font-semibold text-sm leading-snug truncate ${section.id === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                      <span className="text-slate-400 font-mono mr-1.5 font-normal text-xs">{t.ticketId}</span>
                                      {t.name}
                                    </h5>
                                    {section.id === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${statusCls}`}>
                                      {t.status.replace('_', ' ')}
                                    </span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${priorityCls}`}>
                                      {t.priority ?? 'MEDIUM'}
                                    </span>
                                    {!t.isActive && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-400 border border-slate-200 rounded">
                                        INACTIVE
                                      </span>
                                    )}
                                    {subtasks > 0 && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-500 rounded">
                                        {subtasks} subtask{subtasks > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 shrink-0">
                                  <div className="flex flex-col gap-1 items-end hidden sm:flex">
                                    {t.dueDate && (
                                      <div className={`flex items-center gap-1 text-[10px] font-mono ${overdue ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                                        <Clock className="w-3 h-3" />
                                        {fmt(t.dueDate)}
                                        {overdue && <AlertCircle className="w-3 h-3" />}
                                      </div>
                                    )}
                                    {t.estimatedHours != null && (
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        Est: {t.estimatedHours}h
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center shrink-0 w-8 justify-end">
                                    {assignee ? (
                                      <div className="w-7 h-7 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs" title={assignee.name}>
                                        {assignee.name.slice(0, 1).toUpperCase()}
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-2 border-white shadow-xs" title="Unassigned">
                                        <User className="w-4 h-4" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {section.tasks.length === 0 && (
                        <div className="h-16 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 my-1">
                          <span className="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">Empty</span>
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