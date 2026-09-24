import { useState, useMemo, useEffect, useRef } from 'react';
import type { Task, Employee, Milestone } from './ProjectTasksTab';
import { useGetTaskDependenciesQuery } from '../../../store/apiSlice';
import { User, Flag, ChevronRight, ChevronDown, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { statusColors } from './taskUtils';

// ==========================================
// TYPES & CONSTANTS
// ==========================================
interface FlatTask extends Task {
  level: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
}

const ROW_HEIGHT = 44;
const DEPENDENCY_STROKE = '#cbd5e1'; // slate-300

// ==========================================
// DATE HELPERS
// ==========================================
const parseISO = (str: string) => new Date(str);
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
const differenceInDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000);
const isToday = (d: Date) => {
  const today = new Date();
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
};
const formatMonthYear = (d: Date) => d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
const formatDD = (d: Date) => d.getDate().toString().padStart(2, '0');
const getWeekNumber = (d: Date) => {
  const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
  const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// ==========================================
// DEPENDENCY FETCHER
// ==========================================
const DependencyFetcher = ({ 
  taskId, 
  onLoaded 
}: { 
  taskId: string; 
  onLoaded: (taskId: string, data: { predecessors: any[], successors: any[] }) => void;
}) => {
  const { data } = useGetTaskDependenciesQuery(taskId);
  useEffect(() => {
    if (data) onLoaded(taskId, data);
  }, [data, taskId, onLoaded]);
  return null;
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export const ProjectTasksTimeline = ({
  tasks,
  milestones = [],
  employees,
  onViewDetail,
}: {
  tasks: Task[];
  milestones?: Milestone[];
  employees: Employee[];
  onViewDetail: (t: Task) => void;
}) => {
  const [dayWidth, setDayWidth] = useState(30);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dependencies, setDependencies] = useState<Record<string, { predecessors: any[], successors: any[] }>>({});
  
  // Ref for synced scrolling
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const handleDependenciesLoaded = (taskId: string, data: any) => {
    setDependencies(prev => ({ ...prev, [taskId]: data }));
  };

  const getEmployee = (id?: string | null) => employees.find(e => e.id === id);

  // 1. Hierarchical Flattening
  const flatTasks = useMemo(() => {
    const rootTasks = tasks.filter(t => !t.parentTaskId);
    const result: FlatTask[] = [];

    const traverse = (parent: Task, level: number) => {
      const children = tasks.filter(t => t.parentTaskId === parent.id);
      const isExp = expanded[parent.id] !== false; // expanded by default
      result.push({ ...parent, level, isExpanded: isExp, hasChildren: children.length > 0 });
      if (isExp) {
        children.forEach(c => traverse(c, level + 1));
      }
    };

    rootTasks.forEach(r => traverse(r, 0));
    return result;
  }, [tasks, expanded]);

  // 2. Date Math
  const { minDate, totalDays, dates } = useMemo(() => {
    let minT = new Date().getTime();
    let maxT = new Date().getTime();

    tasks.forEach(t => {
      if (t.startDate) minT = Math.min(minT, parseISO(t.startDate).getTime());
      if (t.dueDate) maxT = Math.max(maxT, parseISO(t.dueDate).getTime());
    });
    milestones.forEach(m => {
      if (m.targetDate) {
        minT = Math.min(minT, parseISO(m.targetDate).getTime());
        maxT = Math.max(maxT, parseISO(m.targetDate).getTime());
      }
    });

    const minD = addDays(new Date(minT), -7);
    const maxD = addDays(new Date(maxT), 21);
    const tDays = Math.max(differenceInDays(maxD, minD), 30);
    
    const dts = [];
    for (let i = 0; i <= tDays; i++) {
      dts.push(addDays(minD, i));
    }
    
    return { minDate: minD, totalDays: tDays, dates: dts };
  }, [tasks, milestones]);

  // 3. Grid rendering helpers
  const getX = (dateStr?: string | null) => {
    if (!dateStr) return 0;
    const diff = differenceInDays(parseISO(dateStr), minDate);
    return Math.max(0, diff * dayWidth);
  };

  const todayX = differenceInDays(new Date(), minDate) * dayWidth;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col h-[600px]">
      
      {/* TOOLBAR */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold font-display text-slate-800">Project Timeline</h3>
          <div className="flex items-center bg-slate-200/50 rounded-lg p-0.5">
            <button onClick={() => setDayWidth(Math.max(10, dayWidth - 5))} className="p-1 hover:bg-white rounded text-slate-600 shadow-xs transition-all" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-2 text-slate-500">{dayWidth}px/d</span>
            <button onClick={() => setDayWidth(Math.min(60, dayWidth + 5))} className="p-1 hover:bg-white rounded text-slate-600 shadow-xs transition-all" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Active</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Completed</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Overdue</div>
        </div>
      </div>

      {/* TIMELINE CONTAINER */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* LEFT PANEL (Hierarchy) */}
        <div 
          className="w-[320px] shrink-0 border-r border-slate-200 flex flex-col z-20 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.03)]"
          style={{ overflowY: 'hidden' }}
        >
          <div className="h-[60px] shrink-0 border-b border-slate-200 bg-slate-50/80 flex items-end px-4 pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task</span>
          </div>
          
          <div 
            ref={leftPanelRef}
            className="flex-1 overflow-y-auto pb-10"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={(e) => {
              if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
          >
            {/* Milestones row header */}
            <div className="h-[44px] flex items-center px-4 border-b border-slate-100 bg-amber-50/30">
              <Flag className="w-3.5 h-3.5 text-amber-500 mr-2" />
              <span className="text-xs font-bold text-amber-900 font-display">Milestones</span>
            </div>

            {flatTasks.map(t => (
              <div 
                key={t.id}
                className="flex items-center px-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                style={{ height: ROW_HEIGHT, paddingLeft: `${16 + (t.level * 16)}px` }}
                onClick={() => onViewDetail(t)}
              >
                {t.hasChildren ? (
                  <div 
                    className="w-4 h-4 flex items-center justify-center mr-1 text-slate-400 hover:text-slate-900"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(t.id); }}
                  >
                    {t.isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </div>
                ) : (
                  <div className="w-4 h-4 mr-1"></div>
                )}
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-xs font-semibold text-slate-800 truncate" title={t.name}>{t.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-1 rounded text-[8px] font-bold font-mono ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    {!t.isActive && <span className="text-[8px] font-mono text-slate-400">INACTIVE</span>}
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {t.assigneeId ? (
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center" title={getEmployee(t.assigneeId)?.name}>
                      {getEmployee(t.assigneeId)?.name.slice(0, 1).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-200 bg-slate-50 text-slate-300 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL (Timeline) */}
        <div 
          ref={rightPanelRef}
          className="flex-1 overflow-auto relative bg-slate-50/30"
          onScroll={(e) => {
            if (leftPanelRef.current) leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
        >
          {/* Header Dates */}
          <div className="sticky top-0 z-30 h-[60px] bg-white border-b border-slate-200 flex">
            {dates.map((d, i) => {
              const isStartOfWeek = d.getDay() === 1;
              const isStartOfMonth = d.getDate() === 1;
              return (
                <div 
                  key={i} 
                  className="shrink-0 border-r border-slate-100 flex flex-col justify-end pb-1 relative"
                  style={{ width: dayWidth }}
                >
                  {isStartOfMonth && (
                    <div className="absolute top-1 left-1 text-[10px] font-bold font-display text-slate-700 whitespace-nowrap z-40 bg-white/80 px-1 rounded">
                      {formatMonthYear(d)}
                    </div>
                  )}
                  {isStartOfWeek && !isStartOfMonth && (
                    <div className="absolute top-1 left-1 text-[9px] font-mono text-slate-400 whitespace-nowrap z-40 bg-white/80 px-1 rounded">
                      Week {getWeekNumber(d)}
                    </div>
                  )}
                  <div className={`text-[10px] font-mono text-center relative z-40 ${isToday(d) ? 'text-blue-600 font-bold bg-blue-50 mx-1 rounded' : 'text-slate-400'}`}>
                    {formatDD(d)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Content */}
          <div className="relative pb-10" style={{ width: totalDays * dayWidth }}>
            
            {/* Vertical grid lines */}
            <div className="absolute inset-0 pointer-events-none flex" style={{ opacity: 0.4 }}>
               {dates.map((d, i) => (
                 <div key={i} className={`shrink-0 border-r ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-100/50 border-slate-200' : 'border-slate-100'}`} style={{ width: dayWidth }}></div>
               ))}
            </div>

            {/* Today indicator */}
            {todayX > 0 && todayX < totalDays * dayWidth && (
              <div 
                className="absolute top-0 bottom-0 border-l-2 border-blue-500/50 z-10 pointer-events-none"
                style={{ left: todayX + (dayWidth / 2) }}
              />
            )}

            {/* Milestones Row */}
            <div className="h-[44px] border-b border-slate-100/50 relative bg-amber-50/10">
              {milestones.map(m => {
                if (!m.targetDate) return null;
                const x = getX(m.targetDate);
                return (
                  <div 
                    key={m.id} 
                    className="absolute top-[12px] -ml-2 group cursor-pointer z-20"
                    style={{ left: x + (dayWidth / 2) }}
                    title={m.title}
                  >
                    <div className="w-4 h-4 bg-amber-500 rotate-45 shadow-sm border border-amber-600 flex items-center justify-center">
                    </div>
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 whitespace-nowrap bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded font-mono shadow-md z-30 pointer-events-none transition-opacity">
                      {m.title}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Dependency Connectors (SVG overlay - MUST BE UNDER TASK BARS FOR CLICKABILITY) */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', zIndex: 4 }}>
              {flatTasks.map((t, idx) => {
                const deps = dependencies[t.id]?.successors || [];
                return deps.map(dep => {
                  const successorIdx = flatTasks.findIndex(f => f.id === dep.successorId);
                  if (successorIdx === -1) return null; // Successor is collapsed or not loaded
                  
                  const successorTask = flatTasks[successorIdx];
                  if (!t.dueDate || !successorTask.startDate) return null; // Cannot draw line if missing dates
                  
                  // Math for Finish-to-Start line
                  // Y coordinates account for the milestones row (+1)
                  const startX = getX(t.dueDate);
                  const startY = (idx + 1) * ROW_HEIGHT + (ROW_HEIGHT / 2);
                  const endX = getX(successorTask.startDate);
                  const endY = (successorIdx + 1) * ROW_HEIGHT + (ROW_HEIGHT / 2);

                  // Path logic: go right 10px, go down/up to target Y, go right to target X
                  const path = `M ${startX} ${startY} L ${startX + 10} ${startY} L ${startX + 10} ${endY} L ${endX} ${endY}`;
                  
                  // Marker
                  const arrowId = `arrow-${t.id}-${dep.successorId}`;
                  
                  return (
                    <g key={dep.id}>
                      <defs>
                        <marker id={arrowId} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                          <path d="M0,0 L0,6 L9,3 z" fill={DEPENDENCY_STROKE} />
                        </marker>
                      </defs>
                      <path 
                        d={path} 
                        fill="none" 
                        stroke={DEPENDENCY_STROKE} 
                        strokeWidth="1.5" 
                        markerEnd={`url(#${arrowId})`} 
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </g>
                  );
                });
              })}
            </svg>

            {/* Task Rows & Bars */}
            {flatTasks.map((t, _idx) => {
              const startX = getX(t.startDate);
              const endX = getX(t.dueDate);
              let barWidth = endX - startX;
              if (barWidth < dayWidth && t.startDate) barWidth = dayWidth; // Min width 1 day

              const isOverdue = t.status !== 'DONE' && t.dueDate && parseISO(t.dueDate) < new Date();
              const isDone = t.status === 'DONE';
              
              let barColor = 'bg-blue-500 border-blue-600';
              if (isDone) barColor = 'bg-slate-300 border-slate-400 opacity-70';
              else if (isOverdue) barColor = 'bg-rose-500 border-rose-600';
              else if (t.status === 'TODO') barColor = 'bg-slate-400 border-slate-500';

              return (
                <div 
                  key={t.id} 
                  className="border-b border-slate-100/50 relative hover:bg-slate-50/50 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  <DependencyFetcher taskId={t.id} onLoaded={handleDependenciesLoaded} />
                  
                  {t.startDate && (
                    <div 
                      className={`absolute top-[8px] h-[28px] rounded-md shadow-xs border flex items-center px-2 cursor-pointer group ${barColor} ${!t.isActive ? 'opacity-40' : ''}`}
                      style={{ left: startX, width: barWidth, zIndex: 5 }}
                      onClick={() => onViewDetail(t)}
                    >
                      <span className="text-[10px] font-semibold text-white truncate drop-shadow-xs">
                        {t.name}
                      </span>
                      {isOverdue && <AlertCircle className="w-3 h-3 text-white absolute -right-4 text-rose-500" />}
                    </div>
                  )}
                  
                  {!t.startDate && (
                    <div className="absolute top-[12px] text-[10px] text-slate-400 font-mono italic px-2">Unscheduled</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};