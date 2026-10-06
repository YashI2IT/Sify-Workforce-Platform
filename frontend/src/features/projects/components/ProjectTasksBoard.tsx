import ReactDOM from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Clock, AlertCircle, GripVertical, User } from 'lucide-react';
import type { Task, Employee } from './ProjectTasksTab';
import { priorityColors, fmt, isOverdue } from './taskUtils';

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
  currentEmployeeId?: string;
}

export const ProjectTasksBoard = ({
  tasks,
  allFilteredTasks,
  employees,
  isAdmin,
  projectIsActive,
  onViewDetail,
  onStatusChange,
  currentEmployeeId
}: ProjectTasksBoardProps) => {
  
  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);
  const childrenCount = (id: string) => allFilteredTasks.filter(t => t.parentTaskId === id).length;

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Check permissions / active state
    const task = tasks.find(t => t.id === draggableId);
    if (!task || !task.isActive || !projectIsActive) return;
    if (!isAdmin && task.assigneeId !== currentEmployeeId) return;

    onStatusChange(draggableId, destination.droppableId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 items-stretch xl:grid xl:grid-cols-4 xl:overflow-x-visible">
        {STATUS_COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          
          return (
            <div key={col.id} className="flex flex-col shrink-0 w-72 xl:w-auto bg-slate-50/70 rounded-[14px] border border-slate-200/80 shadow-xs">
              <div className="px-4 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between rounded-t-2xl">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 font-sans">{col.title}</h4>
                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-slate-200/60 shadow-2xs">
                  {colTasks.length}
                </span>
              </div>
              
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2.5 min-h-[90px] rounded-b-2xl flex flex-col transition-colors duration-150 ease-out ${
                      snapshot.isDraggingOver ? 'bg-indigo-50/40 ring-2 ring-indigo-400/40' : 'bg-slate-50/20'
                    }`}
                  >
                    {colTasks.map((t, index) => {
                      const isDragDisabled = !t.isActive || (!isAdmin && t.assigneeId !== currentEmployeeId) || !projectIsActive;
                      const priorityCls = priorityColors[t.priority ?? 'MEDIUM'] ?? priorityColors.MEDIUM;
                      const assignee = getEmployee(t.assigneeId);
                      const overdue = isOverdue(t.dueDate, t.status);
                      const subtasks = childrenCount(t.id);

                      return (
                        <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={isDragDisabled}>
                          {(provided, snapshot) => {
                            const cardContent = (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2.5 outline-none select-none ${snapshot.isDragging ? 'z-[9999]' : ''}`}
                                style={provided.draggableProps.style}
                              >
                                <div
                                  role="button"
                                  tabIndex={0}
                                  className={`bg-white border rounded-xl select-none group transition-shadow duration-150 ${
                                    isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                                  } ${
                                    snapshot.isDragging
                                      ? 'shadow-2xl shadow-slate-900/15 border-indigo-500 ring-2 ring-indigo-500/20 bg-white'
                                      : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md shadow-xs'
                                  } ${!t.isActive ? 'opacity-60' : ''}`}
                                  onClick={() => onViewDetail(t)}
                                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onViewDetail(t); }}
                                >
                                  <div className="p-3">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                                            {t.ticketId}
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
                                        <h5 className="font-semibold text-slate-900 text-[13.5px] leading-snug group-hover:text-indigo-600 transition-colors font-sans">
                                          {t.name}
                                        </h5>
                                      </div>
                                      <div
                                        className={`shrink-0 p-0.5 rounded transition-colors ${
                                          isDragDisabled ? 'hidden' : ''
                                        } ${
                                          snapshot.isDragging ? 'text-indigo-600' : 'text-slate-300 group-hover:text-slate-500'
                                        }`}
                                      >
                                        <GripVertical className="w-4 h-4" />
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
                                      <div className="flex flex-col gap-1">
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
                                      
                                      <div className="flex items-center shrink-0">
                                        {assignee ? (
                                          <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center border border-white shadow-2xs" title={assignee.name}>
                                            {assignee.name.slice(0, 1).toUpperCase()}
                                          </div>
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200/80 shadow-2xs" title="Unassigned">
                                            <User className="w-3.5 h-3.5" />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );

                            if (snapshot.isDragging && typeof document !== 'undefined') {
                              return ReactDOM.createPortal(cardContent, document.body);
                            }
                            return cardContent;
                          }}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    {colTasks.length === 0 && (
                      <div className={`py-4 flex items-center justify-center border-2 border-dashed rounded-xl transition-all duration-150 ${
                        snapshot.isDraggingOver
                          ? 'border-indigo-400/80 bg-indigo-50/60 text-indigo-600 shadow-2xs'
                          : 'border-slate-200/90 bg-white/40 text-slate-400'
                      }`}>
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {snapshot.isDraggingOver ? 'Drop here' : 'Empty'}
                        </span>
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