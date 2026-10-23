import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Columns3,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange } from '../../utils/date';
import {
  useGetTimesheetDetailsQuery,
  useApproveTimesheetMutation,
  useRejectTimesheetMutation
} from '../../store/apiSlice';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../context/ToastContext';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

export type ColumnId =
  | 'employee'
  | 'ticket'
  | 'project'
  | 'task'
  | 'activity'
  | 'date'
  | 'hours'
  | 'remarks'
  | 'status';

export const DEFAULT_COLUMN_ORDER: ColumnId[] = [
  'employee',
  'ticket',
  'project',
  'task',
  'activity',
  'date',
  'hours',
  'remarks',
  'status',
];

export const COLUMN_LABELS: Record<ColumnId, string> = {
  employee: 'Employee',
  ticket: 'Task ID / Ticket',
  project: 'Project',
  task: 'Task',
  activity: 'Activity',
  date: 'Date',
  hours: 'Hours',
  remarks: 'Remarks',
  status: 'Status',
};

export const DEFAULT_COLUMN_VISIBILITY: Record<ColumnId, boolean> = {
  employee: true,
  ticket: true,
  project: true,
  task: true,
  activity: true,
  date: true,
  hours: true,
  remarks: true,
  status: true,
};

const COLUMN_MIN_WIDTHS: Record<ColumnId, number> = {
  employee: 130,
  ticket: 140,
  project: 200,
  task: 170,
  activity: 140,
  date: 110,
  hours: 80,
  remarks: 280,
  status: 120,
};

const getColumnStorageKey = (userId?: string) =>
  userId ? `timesheet_review_columns_${userId}` : 'timesheet_review_columns_default';

export const loadSavedColumnPreferences = (
  userId?: string
): { order: ColumnId[]; visibility: Record<ColumnId, boolean> } => {
  const fallback = {
    order: [...DEFAULT_COLUMN_ORDER],
    visibility: { ...DEFAULT_COLUMN_VISIBILITY },
  };

  if (typeof window === 'undefined' || !window.localStorage) return fallback;

  try {
    const raw = localStorage.getItem(getColumnStorageKey(userId));
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;

    const validIds = new Set<ColumnId>(DEFAULT_COLUMN_ORDER);
    const seen = new Set<ColumnId>();
    const sanitizedOrder: ColumnId[] = [];

    if (Array.isArray(parsed.order)) {
      for (const id of parsed.order) {
        if (validIds.has(id) && !seen.has(id)) {
          sanitizedOrder.push(id);
          seen.add(id);
        }
      }
    }

    for (const id of DEFAULT_COLUMN_ORDER) {
      if (!seen.has(id)) {
        sanitizedOrder.push(id);
      }
    }

    const sanitizedVisibility: Record<ColumnId, boolean> = { ...DEFAULT_COLUMN_VISIBILITY };
    if (parsed.visibility && typeof parsed.visibility === 'object') {
      for (const id of DEFAULT_COLUMN_ORDER) {
        if (typeof parsed.visibility[id] === 'boolean') {
          sanitizedVisibility[id] = parsed.visibility[id];
        }
      }
    }

    const hasVisible = Object.values(sanitizedVisibility).some(Boolean);
    if (!hasVisible) {
      return fallback;
    }

    return {
      order: sanitizedOrder,
      visibility: sanitizedVisibility,
    };
  } catch (err) {
    console.warn('Failed to parse column preferences from localStorage:', err);
    return fallback;
  }
};

export const ManagerTimesheetReview = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { employee: currentEmployee } = useCurrentEmployee();
  const { data: timesheetData, isLoading: tsLoading, error: tsError, refetch } = useGetTimesheetDetailsQuery(id || '', { skip: !id });
  const [approveTimesheetM] = useApproveTimesheetMutation();
  const [rejectTimesheetM] = useRejectTimesheetMutation();
  const { showToast } = useToast();

  const [projectMap, setProjectMap] = useState<Record<string, any>>({});
  const [taskMap, setTaskMap] = useState<Record<string, any>>({});
  const [activityMap, setActivityMap] = useState<Record<string, string>>({});
  const [employeeInfo, setEmployeeInfo] = useState<{ name: string, email: string } | null>(null);
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectText, setRejectText] = useState('');
  const [managerProcessing, setManagerProcessing] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const toggleFieldExpand = (key: string) => {
    setExpandedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(() => {
    return loadSavedColumnPreferences(currentEmployee?.id).order;
  });
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnId, boolean>>(() => {
    return loadSavedColumnPreferences(currentEmployee?.id).visibility;
  });

  const [isColumnsOpen, setIsColumnsOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);

  // Sync preferences when employee changes or loads
  useEffect(() => {
    if (currentEmployee?.id) {
      const prefs = loadSavedColumnPreferences(currentEmployee.id);
      setColumnOrder(prefs.order);
      setColumnVisibility(prefs.visibility);
    }
  }, [currentEmployee?.id]);

  const persistPreferences = useCallback(
    (order: ColumnId[], visibility: Record<ColumnId, boolean>) => {
      if (typeof window === 'undefined' || !window.localStorage) return;
      try {
        localStorage.setItem(
          getColumnStorageKey(currentEmployee?.id),
          JSON.stringify({ order, visibility })
        );
      } catch (e) {
        console.warn('Failed to save column preferences:', e);
      }
    },
    [currentEmployee?.id]
  );

  const handleToggleColumn = (id: ColumnId) => {
    setColumnVisibility((prev) => {
      const isVisible = prev[id];
      if (isVisible) {
        const visibleCount = Object.values(prev).filter(Boolean).length;
        if (visibleCount <= 1) return prev;
      }
      const next = { ...prev, [id]: !isVisible };
      persistPreferences(columnOrder, next);
      return next;
    });
  };

  const handleMoveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columnOrder.length) return;

    setColumnOrder((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      persistPreferences(next, columnVisibility);
      return next;
    });
  };

  const handleResetToDefault = () => {
    const defaultOrder = [...DEFAULT_COLUMN_ORDER];
    const defaultVis = { ...DEFAULT_COLUMN_VISIBILITY };
    setColumnOrder(defaultOrder);
    setColumnVisibility(defaultVis);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(getColumnStorageKey(currentEmployee?.id));
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (!isColumnsOpen || !columnsButtonRef.current) return;

    const updatePosition = () => {
      if (!columnsButtonRef.current) return;
      const rect = columnsButtonRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - popoverWidth - 12));
      const top = rect.bottom + 6;
      setPopoverCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isColumnsOpen]);

  useEffect(() => {
    if (!isColumnsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsColumnsOpen(false);
        columnsButtonRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        columnsButtonRef.current &&
        !columnsButtonRef.current.contains(e.target as Node)
      ) {
        setIsColumnsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isColumnsOpen]);

  const timesheet = timesheetData;
  const loading = tsLoading;
  const error = tsError ? 'Failed to load timesheet details' : '';

  const entries = timesheet?.timeEntries || [];

  const hasAnyCustomFields = useMemo(() => {
    return (timesheet?.timeEntries || []).some((entry: any) => {
      const p = projectMap[entry.projectId];
      const customFields = p?.settings?.customFields || p?.customFields;
      return Array.isArray(customFields) && customFields.length > 0;
    });
  }, [timesheet?.timeEntries, projectMap]);

  const backTarget = (location.state as any)?.from || (timesheet?.status === 'SUBMITTED' ? '/approvals' : '/team-timesheets');
  const backLabel = backTarget === '/team-timesheets' ? 'Back to Team Timesheets' : 'Back to Pending Approvals';

  const formatEntryDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const [y, m, d] = dateStr.split('-');
      if (y && m && d) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = Number(m) - 1;
        const dayNum = Number(d);
        if (mIdx >= 0 && mIdx < 12 && !isNaN(dayNum)) {
          return `${dayNum} ${months[mIdx]} ${y}`;
        }
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const loadMetadata = useCallback(async (tsData: any) => {
    try {
      const entries = tsData?.timeEntries ?? [];
      const usedProjectIds = [...new Set(entries.map((e: any) => e.projectId).filter(Boolean))] as string[];
      const usedTaskIds = [...new Set(entries.map((e: any) => e.taskId).filter(Boolean))] as string[];

      const pMap: Record<string, any> = {};
      const tMap: Record<string, any> = {};
      const aMap: Record<string, string> = {};
      
      const projsRes = await apiClient('/projects').catch(() => []);
      const projsList = Array.isArray(projsRes) ? projsRes : (projsRes?.data ?? []);
      if (Array.isArray(projsList)) {
        projsList.forEach((p: any) => {
          if (p?.id) {
            pMap[p.id] = {
              name: p.name,
              code: p.code,
              settings: p.settings,
              customFields: p.settings?.customFields || [],
            };
          }
        });
      }

      if (tsData?.employeeId) {
        apiClient(`/employees/${tsData.employeeId}`)
          .then((emp: any) => {
            if (emp) setEmployeeInfo({ name: emp.name, email: emp.email });
          })
          .catch(() => {});
      }

      await Promise.allSettled(
        usedProjectIds.map(async (pid) => {
          // Fetch tasks, activities, and individual project if settings not loaded
          const needsProj = !pMap[pid]?.settings;
          const [tasksData, activitiesData, projData] = await Promise.all([
            apiClient(`/projects/${pid}/tasks`).catch(() => []),
            apiClient(`/projects/${pid}/activities`).catch(() => []),
            needsProj ? apiClient(`/projects/${pid}`).catch(() => null) : Promise.resolve(null),
          ]);

          (Array.isArray(tasksData) ? tasksData : []).forEach((t: any) => { 
            if (t?.id) {
              tMap[t.id] = {
                name: t.name,
                ticketId: t.ticketId || t.id.slice(0, 8),
                metadata: t.metadata || {},
              };
            }
          });

          (Array.isArray(activitiesData) ? activitiesData : []).forEach((a: any) => { 
            if (a?.id) {
              aMap[a.id] = a.name;
            }
          });

          if (projData && projData.id) {
            pMap[pid] = {
              name: projData.name,
              code: projData.code,
              settings: projData.settings,
              customFields: projData.settings?.customFields || [],
            };
          }
        })
      );

      // Fetch any task not found in project tasks list (e.g. inactive or standalone)
      const missingTaskIds = usedTaskIds.filter(tid => !tMap[tid]);
      if (missingTaskIds.length > 0) {
        await Promise.allSettled(
          missingTaskIds.map(async (tid) => {
            const tData = await apiClient(`/tasks/${tid}`).catch(() => null);
            if (tData && tData.id) {
              tMap[tData.id] = {
                name: tData.name,
                ticketId: tData.ticketId || tData.id.slice(0, 8),
                metadata: tData.metadata || {},
              };
            }
          })
        );
      }

      setProjectMap(prev => ({ ...prev, ...pMap }));
      setTaskMap(prev => ({ ...prev, ...tMap }));
      setActivityMap(prev => ({ ...prev, ...aMap }));
    } catch (err) {
      console.error('Failed to load metadata', err);
    }
  }, []);

  useEffect(() => {
    if (timesheet && !loading) {
      loadMetadata(timesheet);
    }
  }, [timesheet, loading, loadMetadata]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setManagerProcessing(true);
      await approveTimesheetM(id).unwrap();
      showToast('Timesheet approved successfully', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    } finally {
      setManagerProcessing(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!id) return;
    const comment = rejectText.trim();
    if (!comment) {
      showToast('Rejection comment is required', 'error');
      return;
    }
    try {
      setManagerProcessing(true);
      await rejectTimesheetM({ id, comment }).unwrap();
      setRejectModalOpen(false);
      setRejectText('');
      showToast('Timesheet rejected', 'success');
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Rejection failed', 'error');
    } finally {
      setManagerProcessing(false);
    }
  };

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return formatDateRange(start, end);
  };

  const visibleColumns = useMemo(() => {
    return columnOrder.filter((colId) => columnVisibility[colId]);
  }, [columnOrder, columnVisibility]);

  const visibleColumnsCount = visibleColumns.length;

  const tableMinWidth = useMemo(() => {
    const sum = visibleColumns.reduce((acc, colId) => acc + (COLUMN_MIN_WIDTHS[colId] || 120), 0);
    const customFieldsWidth = hasAnyCustomFields ? 220 : 0;
    return `${Math.max(500, sum + customFieldsWidth)}px`;
  }, [visibleColumns, hasAnyCustomFields]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono font-medium">Loading timesheet review...</p>
      </div>
    );
  }

  if (error || !timesheet) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-9 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Timesheet Not Found</h2>
        <p className="text-sm text-rose-600">{error || 'The requested timesheet could not be retrieved.'}</p>
        <Link
          to={backTarget}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-medium hover:bg-slate-800 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
      </div>
    );
  }

  // Calculate day totals
  const dayTotals = [0,0,0,0,0,0,0];
  let grandTotal = 0;
  entries.forEach((e: any) => {
    const [y, m, d] = e.date.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
    dayTotals[dayIndex] += Number(e.hours);
    grandTotal += Number(e.hours);
  });

  const empName = timesheet?.employee?.name || employeeInfo?.name || 'Unknown Employee';
  const empEmail = timesheet?.employee?.email || employeeInfo?.email || '';

  const renderCustomFields = (entry: any, rowIndex: number) => {
    const p = projectMap[entry.projectId];
    const rawFields: any[] = p?.settings?.customFields || p?.customFields || [];

    // If project has no custom fields configured, show neutral dash
    if (!Array.isArray(rawFields) || rawFields.length === 0) {
      return <span className="text-slate-300 italic text-[13px]">—</span>;
    }

    // Supported types strictly: SHORT_TEXT, LONG_TEXT / TEXT_AREA, DROPDOWN
    const supportedFields = rawFields.filter(
      (f: any) => f && f.name && ['SHORT_TEXT', 'LONG_TEXT', 'TEXT_AREA', 'DROPDOWN'].includes(f.type)
    );

    if (supportedFields.length === 0) {
      return <span className="text-slate-300 italic text-[13px]">—</span>;
    }

    const t = taskMap[entry.taskId];
    const metadata = t?.metadata || {};

    // Match saved values by name, id, or previousNames
    const activeValues = supportedFields
      .map((f: any) => {
        const val = metadata[f.name]
          ?? (f.id ? metadata[f.id] : undefined)
          ?? (f.previousNames?.map((pn: string) => metadata[pn]).find((v: any) => v !== undefined));
        return { field: f, val };
      })
      .filter(({ val }) => val !== undefined && val !== null && String(val).trim() !== '');


    if (activeValues.length === 0) {
      return <span className="text-slate-300 italic text-[13px]">—</span>;
    }

    return (
      <div className="space-y-1.5 py-0.5 min-w-[200px] max-w-[280px]">
        {activeValues.map(({ field, val }) => {
          const strVal = String(val);
          const fieldKey = `${entry.id || rowIndex}_${field.id || field.name}`;
          const isLong = field.type === 'LONG_TEXT' || field.type === 'TEXT_AREA';
          const isDropdown = field.type === 'DROPDOWN';
          const isExpanded = Boolean(expandedFields[fieldKey]);
          const isTruncated = isLong && strVal.length > 80;

          return (
            <div key={field.id || field.name} className="text-[12px] leading-snug">
              <span className="font-semibold text-slate-700">{field.name}:</span>{' '}
              {isDropdown ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 border border-slate-200/70 font-mono">
                  {strVal}
                </span>
              ) : isLong ? (
                <span className="text-slate-800 break-words font-normal" title={strVal}>
                  {isTruncated && !isExpanded ? `${strVal.slice(0, 80)}…` : strVal}
                  {isTruncated && (
                    <button
                      type="button"
                      onClick={() => toggleFieldExpand(fieldKey)}
                      className="ml-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {isExpanded ? 'less' : 'more'}
                    </button>
                  )}
                </span>
              ) : (
                <span className="text-slate-900 font-mono font-medium">{strVal}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderColumnHeader = (colId: ColumnId) => {
    switch (colId) {
      case 'employee':
        return (
          <th key="employee" scope="col" className="px-5 py-3.5 w-[140px] min-w-[130px]">
            Employee
          </th>
        );
      case 'ticket':
        return (
          <th key="ticket" scope="col" className="px-5 py-3.5 w-[150px] min-w-[140px]">
            Task ID / Ticket
          </th>
        );
      case 'project':
        return (
          <th key="project" scope="col" className="px-5 py-3.5 w-[220px] min-w-[200px]">
            Project
          </th>
        );
      case 'task':
        return (
          <th key="task" scope="col" className="px-5 py-3.5 w-[190px] min-w-[170px]">
            Task
          </th>
        );
      case 'activity':
        return (
          <th key="activity" scope="col" className="px-5 py-3.5 w-[160px] min-w-[140px]">
            Activity
          </th>
        );
      case 'date':
        return (
          <th key="date" scope="col" className="px-5 py-3.5 w-[120px] min-w-[110px]">
            Date
          </th>
        );
      case 'hours':
        return (
          <th key="hours" scope="col" className="px-4 py-3.5 w-[90px] min-w-[80px] text-center">
            Hours
          </th>
        );
      case 'remarks':
        return (
          <th key="remarks" scope="col" className="px-5 py-3.5 min-w-[280px]">
            Remarks
          </th>
        );
      case 'status':
        return (
          <th key="status" scope="col" className="px-5 py-3.5 pr-6 w-[130px] min-w-[120px]">
            Status
          </th>
        );
    }
  };

  const renderColumnCell = (colId: ColumnId, entry: any) => {
    const p = projectMap[entry.projectId] || { name: 'Unknown Project', code: '??' };
    const t = taskMap[entry.taskId] || { name: 'Unknown Task', ticketId: entry.taskId };
    const aName = activityMap[entry.activityId] || 'Unknown';

    switch (colId) {
      case 'employee':
        return (
          <td key="employee" className="px-5 py-3.5 align-middle">
            <div className="font-semibold text-slate-900 text-[13px] whitespace-nowrap">
              {empName}
            </div>
          </td>
        );
      case 'ticket':
        return (
          <td key="ticket" className="px-5 py-3.5 align-middle">
            <div className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
              {entry.taskId ? entry.taskId.slice(0, 8) : '—'}
            </div>
            {t.ticketId && t.ticketId !== entry.taskId?.slice(0, 8) && (
              <div className="font-mono text-[11px] text-slate-500 mt-0.5 whitespace-nowrap" title={t.ticketId}>
                {t.ticketId}
              </div>
            )}
          </td>
        );
      case 'project':
        return (
          <td key="project" className="px-5 py-3.5 align-middle">
            <div className="font-semibold text-slate-900 text-[13px] leading-snug break-words" title={p.name}>
              {p.name}
            </div>
            {p.code && p.code !== '??' && (
              <div className="font-mono text-[11px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                {p.code}
              </div>
            )}
          </td>
        );
      case 'task':
        return (
          <td key="task" className="px-5 py-3.5 align-middle">
            <div className="font-medium text-slate-800 text-[13px] leading-snug break-words" title={t.name}>
              {t.name || '—'}
            </div>
          </td>
        );
      case 'activity':
        return (
          <td key="activity" className="px-5 py-3.5 align-middle">
            <div className="text-slate-700 text-[13px] leading-snug break-words" title={aName}>
              {aName || '—'}
            </div>
          </td>
        );
      case 'date':
        return (
          <td key="date" className="px-5 py-3.5 align-middle">
            <span className="whitespace-nowrap font-medium text-slate-800 text-[13px]">
              {formatEntryDate(entry.date)}
            </span>
          </td>
        );
      case 'hours':
        return (
          <td key="hours" className="px-4 py-3.5 align-middle text-center">
            <span className="inline-flex items-center justify-center font-mono font-bold text-xs text-slate-900 bg-slate-100/90 px-2.5 py-0.5 rounded border border-slate-200/70 whitespace-nowrap shadow-2xs">
              {entry.hours}h
            </span>
          </td>
        );
      case 'remarks':
        return (
          <td key="remarks" className="px-5 py-3.5 align-middle">
            {entry.remarks ? (
              <div
                className="text-slate-700 text-[13px] leading-relaxed break-words whitespace-normal"
                title={entry.remarks}
              >
                {entry.remarks}
              </div>
            ) : (
              <span className="text-slate-300 italic text-[13px]">—</span>
            )}
          </td>
        );
      case 'status':
        return (
          <td key="status" className="px-5 py-3.5 pr-6 align-middle">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono border shadow-2xs whitespace-nowrap ${
                timesheet?.status === 'APPROVED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : timesheet?.status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-700 border-rose-200/80'
                  : timesheet?.status === 'SUBMITTED'
                  ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                  : 'bg-slate-100 text-slate-700 border-slate-200/80'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  timesheet?.status === 'APPROVED'
                    ? 'bg-emerald-500'
                    : timesheet?.status === 'REJECTED'
                    ? 'bg-rose-500'
                    : timesheet?.status === 'SUBMITTED'
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              {timesheet?.status}
            </span>
          </td>
        );
    }
  };

  const renderColumnsPopover = () => {
    if (!isColumnsOpen) return null;

    const popoverContent = (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Customize Columns"
        style={{
          position: 'fixed',
          top: popoverCoords ? `${popoverCoords.top}px` : '100px',
          left: popoverCoords ? `${popoverCoords.left}px` : '20px',
        }}
        className="w-80 max-w-[calc(100vw-24px)] bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 p-4 transition-all"
      >
        <div className="mb-3">
          <h3 className="text-sm font-bold text-slate-900 font-display">Customize Columns</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Choose which columns to display and arrange their order.
          </p>
        </div>

        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 py-1">
          {columnOrder.map((colId, index) => {
            const isVisible = columnVisibility[colId];
            const isLastVisible = isVisible && visibleColumnsCount <= 1;

            return (
              <div
                key={colId}
                draggable
                onDragStart={(e) => {
                  setDraggedIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex === null || draggedIndex === index) return;
                  setColumnOrder((prev) => {
                    const next = [...prev];
                    const item = next.splice(draggedIndex, 1)[0];
                    next.splice(index, 0, item);
                    persistPreferences(next, columnVisibility);
                    return next;
                  });
                  setDraggedIndex(null);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all ${
                  draggedIndex === index
                    ? 'border-blue-400 bg-blue-50/50 opacity-60'
                    : isVisible
                    ? 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-200'
                    : 'border-transparent bg-transparent opacity-60 hover:opacity-90'
                }`}
              >
                <GripVertical
                  className="w-3.5 h-3.5 text-slate-400 shrink-0 cursor-grab active:cursor-grabbing"
                  aria-hidden="true"
                />
                <input
                  type="checkbox"
                  id={`col-toggle-${colId}`}
                  checked={isVisible}
                  disabled={isLastVisible}
                  onChange={() => handleToggleColumn(colId)}
                  className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-900 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor={`col-toggle-${colId}`}
                  className={`flex-1 text-xs font-medium cursor-pointer select-none truncate ${
                    isVisible ? 'text-slate-900 font-semibold' : 'text-slate-500'
                  }`}
                >
                  {COLUMN_LABELS[colId]}
                </label>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveColumn(index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move ${COLUMN_LABELS[colId]} up`}
                    title={`Move ${COLUMN_LABELS[colId]} up`}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveColumn(index, 'down')}
                    disabled={index === columnOrder.length - 1}
                    aria-label={`Move ${COLUMN_LABELS[colId]} down`}
                    title={`Move ${COLUMN_LABELS[colId]} down`}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={() => {
              setIsColumnsOpen(false);
              columnsButtonRef.current?.focus();
            }}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );

    return typeof document !== 'undefined'
      ? createPortal(popoverContent, document.body)
      : popoverContent;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-xs font-mono font-medium">Loading timesheet review...</p>
      </div>
    );
  }

  if (error || !timesheet) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-9 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 font-display">Timesheet Not Found</h2>
        <p className="text-sm text-rose-600">{error || 'The requested timesheet could not be retrieved.'}</p>
        <Link
          to="/approvals"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-sm font-medium hover:bg-slate-800 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Pending Approvals
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to={backTarget}
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-600 hover:text-slate-950 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {backLabel}
        </Link>
        <button
          onClick={() => refetch()}
          className="p-2 border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-[14px] p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-bold font-mono border shadow-2xs ${
                timesheet.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                timesheet.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200/80' :
                timesheet.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200/80' :
                'bg-slate-100 text-slate-700 border-slate-200/80'
              }`}>
                {timesheet.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {timesheet.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-950 mt-3 font-display tracking-tight">
              Timesheet Approval
            </h1>
            <div className="mt-2 text-sm text-slate-600 flex items-center gap-4">
              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                  {empName[0] || '?'}
                </div>
                {empName}
                <span className="text-slate-400 font-normal">({empEmail})</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-mono text-slate-600">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              {formatWeekRange(timesheet.startDate)}
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-[14px] border border-slate-200/80 shadow-2xs">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Expected</p>
              <p className="text-xl font-extrabold text-slate-700 font-display mt-0.5">
                {timesheet.summary?.expectedHours || 40}h
              </p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Logged</p>
              <p className="text-xl font-extrabold text-slate-950 font-display mt-0.5">
                {timesheet.summary?.loggedHours || grandTotal}h
              </p>
            </div>
            {timesheet.summary && (
              <>
                <div className="w-px h-10 bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Variance</p>
                  <p className={`text-xl font-extrabold font-display mt-0.5 ${
                    timesheet.summary.variance > 0 ? 'text-emerald-600' : timesheet.summary.variance < 0 ? 'text-rose-600' : 'text-slate-400'
                  }`}>
                    {timesheet.summary.variance > 0 ? '+' : ''}{timesheet.summary.variance}h
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {timesheet.status === 'REJECTED' && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Previously Rejected</h3>
            <p className="text-sm text-rose-700 mt-1">{timesheet.rejectionComment}</p>
          </div>
        )}

        {timesheet.status === 'SUBMITTED' && (
          currentEmployee?.id && timesheet.employeeId && currentEmployee.id === timesheet.employeeId ? (
            <div className="pt-6 border-t border-slate-100 flex items-center gap-3 p-4 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>This is your own timesheet. Self-approval is not permitted; this timesheet must be reviewed by an administrator.</span>
            </div>
          ) : (
            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { setRejectText(''); setRejectModalOpen(true); }}
                disabled={managerProcessing}
                className="inline-flex items-center gap-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-2xs disabled:opacity-50"
              >
                Reject Timesheet
              </button>
              <button
                onClick={handleApprove}
                disabled={managerProcessing}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-all shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {managerProcessing ? 'Processing...' : 'Approve Timesheet'}
              </button>
            </div>
          )
        )}
      </div>

      {/* DAILY SUMMARY */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-sm font-bold text-slate-900 font-display">Timesheet Daily Summary</h2>
        <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto text-sm pr-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <div key={day} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">{day}</span>
              <span className="font-extrabold text-slate-800 mt-0.5">{dayTotals[i] > 0 ? `${dayTotals[i]}h` : '-'}</span>
            </div>
          ))}
          <div className="w-px h-8 bg-slate-200" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-900 uppercase font-mono">Total</span>
            <span className="font-extrabold text-slate-950 mt-0.5">{grandTotal}h</span>
          </div>
        </div>
      </div>

      {/* RECORDED TIME ENTRIES */}
      <div className="bg-white border border-slate-200/90 rounded-[14px] overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900 font-display">Recorded Time Entries</h2>
            <button
              ref={columnsButtonRef}
              type="button"
              id="timesheet-columns-btn"
              aria-haspopup="dialog"
              aria-expanded={isColumnsOpen}
              onClick={() => setIsColumnsOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/20 ${
                isColumnsOpen
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Columns</span>
            </button>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-500">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {grandTotal}h total
          </span>
        </div>
        {renderColumnsPopover()}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm text-left border-collapse" style={{ minWidth: tableMinWidth }}>
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              <tr>
                {visibleColumns.map((colId) => (
                  <Fragment key={colId}>
                    {renderColumnHeader(colId)}
                    {colId === 'task' && hasAnyCustomFields && (
                      <th scope="col" className="px-5 py-3.5 w-[240px] min-w-[220px]">
                        Custom Fields
                      </th>
                    )}
                  </Fragment>
                ))}
                {!visibleColumns.includes('task') && hasAnyCustomFields && (
                  <th scope="col" className="px-5 py-3.5 w-[240px] min-w-[220px]">
                    Custom Fields
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (hasAnyCustomFields ? 1 : 0)}
                    className="px-5 py-12 text-center text-slate-500 text-sm"
                  >
                    No time entries found for this timesheet period.
                  </td>
                </tr>
              ) : (
                entries.map((entry: any, i: number) => {
                  const rowKey = entry.id || `${entry.taskId || 'task'}_${entry.date || 'date'}_${i}`;

                  return (
                    <tr key={rowKey} className="hover:bg-slate-50/70 transition-colors">
                      {visibleColumns.map((colId) => (
                        <Fragment key={colId}>
                          {renderColumnCell(colId, entry)}
                          {colId === 'task' && hasAnyCustomFields && (
                            <td className="px-5 py-3.5 align-middle">
                              {renderCustomFields(entry, i)}
                            </td>
                          )}
                        </Fragment>
                      ))}
                      {!visibleColumns.includes('task') && hasAnyCustomFields && (
                        <td className="px-5 py-3.5 align-middle">
                          {renderCustomFields(entry, i)}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={rejectModalOpen} 
        onClose={() => setRejectModalOpen(false)}
        title="Reject Timesheet"
        maxWidth="md"
      >
        <p className="text-xs sm:text-sm text-slate-500 mb-4">
          Provide a mandatory remark for rejection so the employee knows what to adjust before resubmitting.
        </p>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Rejection Remark *</label>
          <textarea
            autoFocus
            rows={3}
            value={rejectText}
            onChange={(e) => setRejectText(e.target.value)}
            placeholder="E.g. Missing task breakdown for Tuesday..."
            className="w-full border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none transition-all shadow-2xs resize-none"
          />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <button
            onClick={() => setRejectModalOpen(false)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRejectSubmit}
            disabled={managerProcessing}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99]"
          >
            {managerProcessing ? 'Rejecting...' : 'Reject Timesheet'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
