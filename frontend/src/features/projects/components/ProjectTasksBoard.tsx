import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock, AlertCircle, GripVertical, User } from 'lucide-react';
import type { Task, Employee } from './ProjectTasksTab';
import { statusColors, priorityColors, fmt, isOverdue } from './taskUtils';

const STATUS_COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' }
];

interface ProjectTasksBoardProps {
  tasks: Task[]; // These should be the filtered root tasks
  allFilteredTasks: Task[]; // Needed to count subtasks
  employees: Employee[];
  isAdmin: boolean;
  projectIsActive: boolean;
  onViewDetail: (t: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}

export const ProjectTasksBoard = ({
  tasks,
  allFilteredTasks,
  employees,
  isAdmin,
  projectIsActive,
  onViewDetail,
  onStatusChange
}: ProjectTasksBoardProps) => {
  
  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);
  const childrenCount = (id: string) => allFilteredTasks.filter(t => t.parentTaskId === id).length;

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Check permissions / active state
    const task = tasks.find(t => t.id === draggableId);
    if (!task || !task.isActive || !isAdmin || !projectIsActive) return;

    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
        {STATUS_COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          const headerBg = statusColors[col.id] || 'bg-slate-100 text-slate-800';
          
          return (
            <div key={col.id} className="flex flex-col shrink-0 w-80 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs h-fit max-h-full">
              <div className={`px-4 py-3 border-b border-slate-200/50 rounded-t-2xl flex items-center justify-between ${headerBg}`}>
                <h4 className="font-bold font-mono uppercase text-xs tracking-wider">{col.title}</h4>
                <span className="bg-white/50 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                  {colTasks.length}
                </span>
              </div>
              
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-3 min-h-[150px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-slate-100/80' : ''
                    }`}
                  >
                    {colTasks.map((t, index) => {
                      const isDragDisabled = !t.isActive || !isAdmin || !projectIsActive;
                      const priorityCls = priorityColors[t.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
                      const assignee = getEmployee(t.assigneeId);
                      const overdue = isOverdue(t.dueDate, t.status);
                      const subtasks = childrenCount(t.id);

                      return (
                        <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={isDragDisabled}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`mb-3 bg-white border rounded-xl shadow-xs overflow-hidden ${
                                snapshot.isDragging ? 'border-slate-400 shadow-lg' : 'border-slate-200'
                              } ${!t.isActive ? 'opacity-60' : ''}`}
                              onClick={() => onViewDetail(t)}
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-blue-50 text-blue-600 border border-blue-100">
                                        {t.ticketId}
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
                                    <h5 className="font-semibold text-slate-900 text-sm leading-snug">{t.name}</h5>
                                  </div>
                                  <div
                                    {...provided.dragHandleProps}
                                    className={`shrink-0 text-slate-300 hover:text-slate-500 cursor-grab ${
                                      isDragDisabled ? 'hidden' : ''
                                    }`}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                  <div className="flex flex-col gap-1.5">
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
                                  
                                  <div className="flex items-center shrink-0">
                                    {assignee ? (
                                      <div className="w-6 h-6 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs" title={assignee.name}>
                                        {assignee.name.slice(0, 1).toUpperCase()}
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-2 border-white shadow-xs" title="Unassigned">
                                        <User className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {colTasks.length === 0 && (
                      <div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <span className="text-xs text-slate-400 font-medium font-mono uppercase">Empty</span>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};