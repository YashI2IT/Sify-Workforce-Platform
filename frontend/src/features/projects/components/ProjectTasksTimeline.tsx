import { useState, useMemo, useRef } from 'react';
import type { Task, Employee, Milestone } from './ProjectTasksTab';
import { useGetProjectDependenciesQuery } from '../../../store/apiSlice';
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

const formatDD = (d: Date) => d.getDate().toString().padStart(2, '0');
// Removed unused getWeekNumber function
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
  const MIN_DAY_WIDTH = 28;
  const MAX_DAY_WIDTH = 64;
  const [dayWidth, setDayWidth] = useState(36);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Ref for synced scrolling
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const projectId = tasks[0]?.projectId || '';
  const { data: projectDependencies = [] } = useGetProjectDependenciesQuery(projectId, { skip: !projectId });

  const dependencies = useMemo(() => {
    const acc: Record<string, { predecessors: any[], successors: any[] }> = {};
    projectDependencies.forEach((dep: any) => {
      if (!acc[dep.predecessorId]) acc[dep.predecessorId] = { predecessors: [], successors: [] };
      if (!acc[dep.successorId]) acc[dep.successorId] = { predecessors: [], successors: [] };
      
      acc[dep.predecessorId].successors.push(dep);
      acc[dep.successorId].predecessors.push(dep);
    });
    return acc;
  }, [projectDependencies]);

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

    // Buffer days before and after: compact and relevant without excess empty space
    const minD = addDays(new Date(minT), -3);
    const maxD = addDays(new Date(maxT), 7);
    const tDays = Math.max(differenceInDays(maxD, minD), 14);
    
    const dts = [];
    for (let i = 0; i <= tDays; i++) {
      dts.push(addDays(minD, i));
    }
    
    return { minDate: minD, totalDays: tDays, dates: dts };
  }, [tasks, milestones]);

  // Group dates by month for the clean top-tier banner (prevents collisions)
  const monthGroups = useMemo(() => {
    const groups: { monthKey: string; label: string; daysCount: number }[] = [];
    dates.forEach(d => {
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.monthKey === monthKey) {
        lastGroup.daysCount += 1;
      } else {
        groups.push({
          monthKey,
          label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          daysCount: 1,
        });
      }
    });
    return groups;
  }, [dates]);

  // 3. Grid rendering helpers
  const getX = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const diff = differenceInDays(parseISO(dateStr), minDate);
    return Math.max(0, diff * dayWidth);
  };

  const todayX = differenceInDays(new Date(), minDate) * dayWidth;

  // Dynamic height calculation: generous minimum height (380px) for professional Gantt chart aesthetics
  const HEADER_HEIGHT = 58;
  const MIN_CONTAINER_HEIGHT = 380;
  const MAX_CONTAINER_HEIGHT = 560;
  const rowsContentHeight = 44 + (flatTasks.length * ROW_HEIGHT);
  const totalNeededHeight = HEADER_HEIGHT + rowsContentHeight + 16;
  const isScrollable = totalNeededHeight > MAX_CONTAINER_HEIGHT;
  const containerHeight = Math.max(MIN_CONTAINER_HEIGHT, Math.min(totalNeededHeight, MAX_CONTAINER_HEIGHT));

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-md">
      
      {/* TOOLBAR */}
      <div className="px-5 py-3 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/80 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight font-sans">Project Timeline</h3>
          <div className="flex items-center bg-white border border-slate-200/80 rounded-full p-0.5 shadow-2xs">
            <button 
              onClick={() => setDayWidth(w => Math.max(MIN_DAY_WIDTH, w - 6))} 
              disabled={dayWidth <= MIN_DAY_WIDTH}
              className="p-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-slate-600 transition-colors cursor-pointer" 
              title="Zoom Out (Min 28px/day)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-semibold px-2.5 text-slate-600 font-sans">{dayWidth}px/d</span>
            <button 
              onClick={() => setDayWidth(w => Math.min(MAX_DAY_WIDTH, w + 6))} 
              disabled={dayWidth >= MAX_DAY_WIDTH}
              className="p-1 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-full text-slate-600 transition-colors cursor-pointer" 
              title="Zoom In (Max 64px/day)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 font-sans flex-wrap">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs"></span> Active</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span> Review</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs"></span> Completed</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs"></span> Overdue</div>
        </div>
      </div>

      {/* TIMELINE CONTAINER */}
      <div className="flex overflow-hidden relative" style={{ height: `${containerHeight}px` }}>
        
        {/* LEFT PANEL (Hierarchy) */}
        <div 
          className="w-[320px] shrink-0 border-r border-slate-200/80 flex flex-col z-20 bg-white shadow-[2px_0_10px_rgba(0,0,0,0.02)]"
          style={{ overflowY: 'hidden', height: `${containerHeight}px` }}
        >
          <div className="h-[58px] shrink-0 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between px-5">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-sans">Task</span>
            <span className="text-[11px] font-semibold text-slate-400 font-sans">{flatTasks.length} task{flatTasks.length !== 1 ? 's' : ''}</span>
          </div>
          
          <div 
            ref={leftPanelRef}
            className="flex-1 pb-1"
            style={{ 
              overflowY: isScrollable ? 'auto' : 'hidden', 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none' 
            }}
            onScroll={(e) => {
              if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
          >
            {/* Milestones row header */}
            <div className="h-[44px] flex items-center px-5 border-b border-slate-100 bg-amber-50/30">
              <Flag className="w-3.5 h-3.5 text-amber-600 mr-2 shrink-0" />
              <span className="text-xs font-bold text-amber-900 font-sans">Milestones</span>
              <span className="ml-auto text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                {milestones.length}
              </span>
            </div>

            {flatTasks.map(t => (
              <div 
                key={t.id} 
                className="flex items-center px-5 border-b border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer group"
                style={{ height: ROW_HEIGHT, paddingLeft: `${20 + (t.level * 16)}px` }}
                onClick={() => onViewDetail(t)}
              >
                {t.hasChildren ? (
                  <button 
                    type="button"
                    className="w-4 h-4 flex items-center justify-center mr-1 text-slate-400 hover:text-slate-900 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(t.id); }}
                    title={t.isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                  >
                    {t.isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <div className="w-4 h-4 mr-1"></div>
                )}
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-xs font-semibold text-slate-900 truncate font-sans group-hover:text-indigo-600 transition-colors flex items-center gap-1.5" title={t.name}>
                    {t.ticketId && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0 shadow-2xs">
                        {t.ticketId}
                      </span>
                    )}
                    <span className="truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-sans border ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    {!t.isActive && <span className="text-[9px] font-bold text-slate-400 font-sans">INACTIVE</span>}
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {t.assigneeId ? (
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs font-sans" title={getEmployee(t.assigneeId)?.name}>
                      {getEmployee(t.assigneeId)?.name.slice(0, 1).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border border-slate-200 bg-slate-50 text-slate-300 flex items-center justify-center" title="Unassigned">
                      <User className="w-3.5 h-3.5" />
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
          className="flex-1 overflow-x-auto relative bg-slate-50/20"
          style={{ 
            height: `${containerHeight}px`,
            overflowY: isScrollable ? 'auto' : 'hidden'
          }}
          onScroll={(e) => {
            if (leftPanelRef.current) leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
        >
          {/* Header Dates (Clean Two-Tier Structure: Month Banner + Day Cells) */}
          <div className="sticky top-0 z-30 h-[58px] bg-slate-50 border-b border-slate-200/80 flex flex-col min-w-full" style={{ width: totalDays * dayWidth }}>
            {/* Tier 1: Months Banner */}
            <div className="h-[28px] border-b border-slate-200/80 flex bg-slate-100/70">
              {monthGroups.map((group, idx) => (
                <div
                  key={group.monthKey}
                  className={`h-full flex items-center px-3 border-r border-slate-200/80 text-xs font-bold text-slate-800 tracking-tight font-sans overflow-hidden whitespace-nowrap ${
                    idx % 2 === 0 ? 'bg-slate-100/90' : 'bg-slate-50/90'
                  }`}
                  style={{ width: group.daysCount * dayWidth }}
                >
                  <span className="truncate">{group.label}</span>
                </div>
              ))}
            </div>

            {/* Tier 2: Days Row */}
            <div className="h-[30px] flex bg-slate-50/80">
              {dates.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isCurToday = isToday(d);
                return (
                  <div
                    key={i}
                    className={`shrink-0 border-r border-slate-200/60 flex items-center justify-center relative font-sans ${
                      isWeekend ? 'bg-slate-100/40 text-slate-400' : 'text-slate-600'
                    }`}
                    style={{ width: dayWidth }}
                    title={d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  >
                    <span
                      className={`text-[11px] font-semibold flex items-center justify-center ${
                        isCurToday
                          ? 'w-6 h-6 rounded-full bg-indigo-600 text-white font-bold shadow-xs'
                          : ''
                      }`}
                    >
                      {formatDD(d)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Content */}
          <div className="relative min-w-full" style={{ width: totalDays * dayWidth, minHeight: `${containerHeight - HEADER_HEIGHT}px` }}>
            
            {/* Vertical grid lines */}
            <div className="absolute inset-0 pointer-events-none flex" style={{ opacity: 0.35 }}>
               {dates.map((d, i) => (
                 <div key={i} className={`shrink-0 border-r ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-100/60 border-slate-200' : 'border-slate-100'}`} style={{ width: dayWidth }}></div>
               ))}
            </div>

            {/* Today indicator */}
            {todayX > 0 && todayX < totalDays * dayWidth && (
              <div 
                className="absolute top-0 bottom-0 border-l-2 border-indigo-500/70 z-10 pointer-events-none"
                style={{ left: todayX + (dayWidth / 2) }}
              />
            )}

            {/* Milestones Row */}
            <div className="h-[44px] border-b border-slate-100/60 relative bg-amber-50/15">
              {milestones.map(m => {
                if (!m.targetDate) return null;
                const x = getX(m.targetDate) ?? 0;
                return (
                  <div 
                    key={m.id} 
                    className="absolute top-[12px] -ml-2 group cursor-pointer z-20"
                    style={{ left: x + (dayWidth / 2) }}
                    title={m.title}
                  >
                    <div className="w-4 h-4 bg-amber-500 rotate-45 shadow-xs border border-amber-600 flex items-center justify-center transition-transform group-hover:scale-125">
                    </div>
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 whitespace-nowrap bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded font-sans font-medium shadow-md z-30 pointer-events-none transition-opacity">
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
                  
                  // Dep logic based on type
                  const type = dep.type || 'FS';
                  
                  // For F* types we start from dueDate. For S* types we start from startDate.
                  // For *F types we end at dueDate. For *S types we end at startDate.
                  const startX = (type.startsWith('F') ? getX(t.dueDate || t.startDate) : getX(t.startDate || t.dueDate)) ?? 0;
                  const endX = (type.endsWith('F') ? getX(successorTask.dueDate || successorTask.startDate) : getX(successorTask.startDate || successorTask.dueDate)) ?? 0;
                  
                  if (startX === null || endX === null) return null; // Can't draw if dates are missing
                  
                  const startY = (idx + 1) * ROW_HEIGHT + (ROW_HEIGHT / 2);
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
              const hasStart = !!t.startDate;
              const hasDue = !!t.dueDate;
              const startX = getX(t.startDate || t.dueDate) ?? 0;
              const endX = getX(t.dueDate || t.startDate) ?? 0;
              let barWidth = hasStart && hasDue ? endX - startX : dayWidth * 2;
              if (barWidth < dayWidth) barWidth = dayWidth;

              const isOverdue = t.status !== 'DONE' && t.dueDate && parseISO(t.dueDate) < new Date();
              const isDone = t.status === 'DONE';
              
              let barColor = 'bg-blue-600 border-blue-700 text-white';
              if (isDone) barColor = 'bg-emerald-600 border-emerald-700 text-white opacity-85';
              else if (isOverdue) barColor = 'bg-rose-600 border-rose-700 text-white';
              else if (t.status === 'REVIEW') barColor = 'bg-amber-500 border-amber-600 text-white';
              else if (t.status === 'TODO') barColor = 'bg-slate-400 border-slate-500 text-white';

              return (
                <div 
                  key={t.id} 
                  className="border-b border-slate-100/60 relative hover:bg-slate-50/50 transition-colors"
                  style={{ height: ROW_HEIGHT }}
                >
                  {(hasStart || hasDue) ? (
                    <div 
                      className={`absolute top-[8px] h-[28px] rounded-lg shadow-2xs border flex items-center px-2.5 cursor-pointer group transition-transform hover:scale-[1.01] ${barColor} ${!t.isActive ? 'opacity-40' : ''}`}
                      style={{ left: startX, width: Math.max(barWidth, dayWidth), zIndex: 5 }}
                      onClick={() => onViewDetail(t)}
                      title={`${t.ticketId}: ${t.name}${isOverdue ? ' (Overdue)' : ''}`}
                    >
                      <span className="text-[11px] font-semibold truncate drop-shadow-2xs font-sans flex items-center gap-1.5">
                        <span className="opacity-80 font-mono text-[10px] font-normal">{t.ticketId}</span>
                        <span>{t.name}</span>
                      </span>
                      {isOverdue && (
                        <span className="ml-1.5 shrink-0" title="Overdue">
                          <AlertCircle className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="absolute top-[12px] text-[10px] text-slate-400 font-sans italic px-2.5 font-medium">
                      Unscheduled
                    </div>
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