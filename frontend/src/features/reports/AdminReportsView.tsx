import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Download,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  ExternalLink,
  RotateCcw,
  Search,
  Filter,
  Check,
  UsersRound,
  ArrowUpRight,
} from 'lucide-react';
import { useGetAdminReportQuery } from '../../store/apiSlice';
import { DatePicker } from '../../components/ui/DatePicker';

type PeriodPreset = 'week' | 'month' | 'quarter' | 'custom';

// Helper to compute preset dates
function getPresetDateRange(preset: PeriodPreset): { startDate: string; endDate: string } {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (preset === 'week') {
    // Current week: Monday to Sunday
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: formatYMD(monday), endDate: formatYMD(sunday) };
  }

  if (preset === 'quarter') {
    const currentMonth = now.getMonth();
    const quarterIndex = Math.floor(currentMonth / 3);
    const startOfQuarter = new Date(now.getFullYear(), quarterIndex * 3, 1);
    const endOfQuarter = new Date(now.getFullYear(), (quarterIndex + 1) * 3, 0);
    return { startDate: formatYMD(startOfQuarter), endDate: formatYMD(endOfQuarter) };
  }

  // Default: This Month
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: formatYMD(firstDay), endDate: formatYMD(lastDay) };
}

// Client-side CSV Exporter
function exportReportAsCSV(data: any, period: { startDate: string; endDate: string }, filters: any) {
  const rows: string[][] = [];

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const addRow = (...cells: any[]) => {
    rows.push(cells.map(escapeCell));
  };

  const addEmptyRow = () => rows.push([]);

  // Header / Metadata
  addRow('SIFY WORKFORCE PLATFORM - ADMIN REPORT');
  addRow('Organization', data.organization?.name || 'Organization');
  addRow('Reporting Period', `${period.startDate} to ${period.endDate}`);
  addRow('Generated At', new Date().toISOString());
  addRow('Timezone', data.organization?.timeZone || 'UTC');
  addRow('Active Filters', [
    filters.projectId ? `Project: ${filters.projectId}` : null,
    filters.teamId ? `Team: ${filters.teamId}` : null,
    filters.employeeId ? `Employee: ${filters.employeeId}` : null,
    filters.status ? `Status: ${filters.status}` : null,
  ].filter(Boolean).join('; ') || 'None (All organization data)');
  addEmptyRow();

  // Summary KPIs
  addRow('SUMMARY KEY PERFORMANCE INDICATORS');
  addRow('Metric', 'Value', 'Context');
  addRow('Active Projects', data.summary?.activeProjects, `${data.summary?.completedProjects} completed projects (${data.summary?.totalProjects} total)`);
  addRow('Tasks Completed in Period', data.summary?.tasksCompletedInPeriod, 'Completed during selected period');
  addRow('Overdue Tasks', data.summary?.overdueTasks, `Open tasks with past due dates (${data.summary?.openTasks} open tasks total)`);
  addRow('Team Members', data.summary?.teamMembers, `Active employees across ${data.teamOverview?.totalTeams || 0} teams`);
  addRow('Total Logged Hours', `${data.summary?.totalLoggedHours}h`, `Approval Rate: ${data.summary?.approvalRate}%`);
  addRow('Approved Hours', `${data.summary?.approvedHours}h`, '');
  addRow('Submitted Hours', `${data.summary?.submittedHours}h`, '');
  addRow('Draft Hours', `${data.summary?.draftHours}h`, '');
  addRow('Rejected Hours', `${data.summary?.rejectedHours}h`, '');
  addEmptyRow();

  // Section A: Project Performance
  addRow('SECTION A: PROJECT PERFORMANCE');
  addRow('Project Code', 'Project Name', 'Status', 'Total Tasks', 'Completed Tasks', 'Open Tasks', 'Overdue Tasks', 'Progress %', 'Logged Hours (Period)', 'Start Date', 'End Date', 'Is Overdue');
  (data.projectPerformance?.projects || []).forEach((p: any) => {
    addRow(
      p.code || '',
      p.name,
      p.status,
      p.totalTasks,
      p.completedTasks,
      p.openTasks,
      p.overdueTasks,
      `${p.progressPct}%`,
      `${p.loggedHours}h`,
      p.startDate ? p.startDate.split('T')[0] : '',
      p.endDate ? p.endDate.split('T')[0] : '',
      p.isOverdue ? 'YES' : 'NO'
    );
  });
  addEmptyRow();

  // Section B: Task Progress
  addRow('SECTION B: TASK PROGRESS');
  addRow('Ticket ID', 'Task Name', 'Project Code', 'Project Name', 'Assignee', 'Team', 'Priority', 'Status', 'Due Date', 'Is Overdue', 'Actual Logged Hours', 'Completed At');
  (data.taskProgress?.tasks || []).forEach((t: any) => {
    addRow(
      t.ticketId || t.id,
      t.name,
      t.projectCode || '',
      t.projectName,
      t.assigneeName || 'Unassigned',
      t.teamName || '',
      t.priority,
      t.status,
      t.dueDate ? t.dueDate.split('T')[0] : '',
      t.isOverdue ? 'YES' : 'NO',
      t.actualHours || 0,
      t.completedAt ? t.completedAt.split('T')[0] : ''
    );
  });
  addEmptyRow();

  // Section C: Team Overview
  addRow('SECTION C: TEAM OVERVIEW');
  addRow('Team Name', 'Team Lead', 'Lead Email', 'Active Members', 'Open Tasks', 'Overdue Tasks', 'Logged Hours (Period)');
  (data.teamOverview?.teams || []).forEach((team: any) => {
    addRow(
      team.name,
      team.managerName || 'Unassigned',
      team.managerEmail || '',
      team.activeMemberCount,
      team.openTaskCount,
      team.overdueTaskCount,
      `${team.totalLoggedHours}h`
    );
  });
  addEmptyRow();

  // Section D: Work Hours Summary
  addRow('SECTION D: WORK HOURS BY PROJECT');
  addRow('Project Code', 'Project Name', 'Logged Hours', 'Share of Total %');
  (data.workHoursSummary?.byProject || []).forEach((p: any) => {
    addRow(p.projectCode || '', p.projectName, `${p.hours}h`, `${p.pct}%`);
  });
  addEmptyRow();

  addRow('SECTION D: WORK HOURS BY TEAM');
  addRow('Team Name', 'Logged Hours', 'Share of Total %');
  (data.workHoursSummary?.byTeam || []).forEach((t: any) => {
    addRow(t.teamName, `${t.hours}h`, `${t.pct}%`);
  });

  const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `sify-workforce-report-${period.startDate}-to-${period.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminReportsView() {
  const navigate = useNavigate();

  // Period state
  const [activePreset, setActivePreset] = useState<PeriodPreset>('month');
  const initialDates = useMemo(() => getPresetDateRange('month'), []);
  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);

  // Filters state
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Table search & filter states
  const [projectSearch, setProjectSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');

  // Preset selection handler
  const handleSelectPreset = (preset: PeriodPreset) => {
    setActivePreset(preset);
    if (preset !== 'custom') {
      const dates = getPresetDateRange(preset);
      setStartDate(dates.startDate);
      setEndDate(dates.endDate);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setActivePreset('custom');
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setActivePreset('custom');
  };

  const handleResetFilters = () => {
    setSelectedProject('');
    setSelectedTeam('');
    setSelectedEmployee('');
    setSelectedStatus('');
    setProjectSearch('');
    setTaskSearch('');
  };

  const hasActiveFilters = Boolean(
    selectedProject || selectedTeam || selectedEmployee || selectedStatus
  );

  const activeFiltersCount = [
    selectedProject,
    selectedTeam,
    selectedEmployee,
    selectedStatus
  ].filter(Boolean).length;

  // RTK Query hook
  const { data, isLoading, isFetching, isError, refetch } = useGetAdminReportQuery({
    startDate,
    endDate,
    projectId: selectedProject || undefined,
    teamId: selectedTeam || undefined,
    employeeId: selectedEmployee || undefined,
    status: selectedStatus || undefined,
  });

  // Filtered project list for search
  const displayedProjects = useMemo(() => {
    const list = data?.projectPerformance?.projects || [];
    if (!projectSearch.trim()) return list;
    const q = projectSearch.toLowerCase();
    return list.filter((p: any) =>
      p.name.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
    );
  }, [data?.projectPerformance?.projects, projectSearch]);

  // Filtered task list for search
  const displayedTasks = useMemo(() => {
    const list = data?.taskProgress?.tasks || [];
    if (!taskSearch.trim()) return list;
    const q = taskSearch.toLowerCase();
    return list.filter((t: any) =>
      t.name.toLowerCase().includes(q) ||
      (t.ticketId && t.ticketId.toLowerCase().includes(q)) ||
      (t.projectName && t.projectName.toLowerCase().includes(q)) ||
      (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
    );
  }, [data?.taskProgress?.tasks, taskSearch]);

  const handleExport = () => {
    if (!data) return;
    exportReportAsCSV(
      data,
      { startDate, endDate },
      {
        projectId: selectedProject,
        teamId: selectedTeam,
        employeeId: selectedEmployee,
        status: selectedStatus,
      }
    );
  };

  const formatDisplayDate = (dStr: string | null) => {
    if (!dStr) return '—';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">

      {/* 1. Page Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] leading-[34px] font-bold text-[#0B1738] tracking-tight">
              Reports
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8DB00] border border-emerald-600" />
              Live Telemetry
            </span>
          </div>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1">
            Organization-wide performance and activity.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isFetching ? 'animate-spin text-[#0B1738]' : 'text-slate-500'}`} />
            <span>{isLoading || isFetching ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isLoading || !data}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B1738] hover:bg-[#13224f] text-white rounded-[10px] text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
            title="Download CSV Report with applied filters"
          >
            <Download className="w-3.5 h-3.5 text-[#C8DB00]" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Toolbar: Reporting Period & Multi-Dimensional Filters */}
      <div className="bg-white border border-slate-200/80 rounded-[14px] p-4 sm:p-5 shadow-xs space-y-4">
        
        {/* Row 1: Reporting Period Presets & Date Pickers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Period:
            </span>
            <button
              type="button"
              onClick={() => handleSelectPreset('week')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activePreset === 'week'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('month')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activePreset === 'month'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('quarter')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activePreset === 'quarter'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              This Quarter
            </button>
            <button
              type="button"
              onClick={() => setActivePreset('custom')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activePreset === 'custom'
                  ? 'bg-[#0B1738] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Date Pickers with display */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span className="text-slate-400">From:</span>
              <div className="w-32 relative z-20">
                <DatePicker
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span className="text-slate-400">To:</span>
              <div className="w-32 relative z-10">
                <DatePicker
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="w-full"
                />
              </div>
            </div>
            {data?.organization?.timeZone && (
              <span className="text-[11px] text-slate-400 font-mono hidden xl:inline-block">
                ({data.organization.timeZone})
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Dimensional Filters (Project, Team, Assignee, Status) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters:</span>
            </div>

            {/* Project Filter */}
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-[8px] px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B1738]"
              title="Filter by Project"
            >
              <option value="">All Projects</option>
              {(data?.filterOptions?.projects || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ''}{p.name}
                </option>
              ))}
            </select>

            {/* Team Filter */}
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-[8px] px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B1738]"
              title="Filter by Team"
            >
              <option value="">All Teams</option>
              {(data?.filterOptions?.teams || []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Employee Filter */}
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-[8px] px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B1738]"
              title="Filter by Employee"
            >
              <option value="">All Assignees</option>
              {(data?.filterOptions?.employees || []).map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-[8px] px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0B1738]"
              title="Filter by Task Status"
            >
              <option value="">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {/* Reset Filters Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-[8px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters ({activeFiltersCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-[14px] flex items-center justify-between gap-3 text-rose-900 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-bold">Failed to load organization reports</p>
              <p className="text-xs text-rose-600 mt-0.5">Please check network connectivity or date parameters, then try again.</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-[8px] text-xs font-semibold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-[14px] p-5 shadow-xs animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-8 bg-slate-200 rounded w-16" />
                <div className="h-3 bg-slate-100 rounded w-32" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200/80 rounded-[14px] p-12 text-center shadow-xs">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Loading organization telemetry...</p>
            <p className="text-xs text-slate-400 mt-1">Aggregating live projects, tasks, teams, and logged hours.</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* 3. Summary KPI Cards (Real DB-backed values) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* KPI 1: Active Projects */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Active Projects
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#0B1738] flex items-center justify-center">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-[#0B1738] mt-2 tracking-tight">
                  {data.summary.activeProjects}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                  {data.summary.completedProjects} completed
                </span>
                <span className="text-slate-400 font-medium">
                  {data.summary.totalProjects} total
                </span>
              </div>
            </div>

            {/* KPI 2: Tasks Completed */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Tasks Completed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-[#0B1738] mt-2 tracking-tight">
                  {data.summary.tasksCompletedInPeriod}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  Completed in period
                </span>
                <span className="text-slate-400 font-medium">
                  {data.summary.totalTasks} tasks tracked
                </span>
              </div>
            </div>

            {/* KPI 3: Overdue Tasks */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Overdue Tasks
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    data.summary.overdueTasks > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <h3 className={`text-3xl font-bold mt-2 tracking-tight ${
                  data.summary.overdueTasks > 0 ? 'text-rose-600' : 'text-[#0B1738]'
                }`}>
                  {data.summary.overdueTasks}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                  data.summary.overdueTasks > 0
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                    : 'bg-emerald-50 text-emerald-700'
                }`}>
                  {data.summary.overdueTasks > 0 ? 'Requires attention' : 'All on track'}
                </span>
                <span className="text-slate-400 font-medium">
                  {data.summary.openTasks} open
                </span>
              </div>
            </div>

            {/* KPI 4: Team Members */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Team Members
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-[#0B1738] mt-2 tracking-tight">
                  {data.summary.teamMembers}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">
                  Active employees
                </span>
                <span className="text-slate-400 font-medium">
                  Across {data.teamOverview.totalTeams} teams
                </span>
              </div>
            </div>

          </div>

          {/* 4. Report Sections */}
          <div className="space-y-6">

            {/* ============================================================== */}
            {/* SECTION A: PROJECT PERFORMANCE                                 */}
            {/* ============================================================== */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#0B1738] text-white flex items-center justify-center text-xs font-bold">
                      A
                    </div>
                    <h2 className="text-lg font-bold text-[#0B1738]">
                      Project Performance
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Status overview, completion progress, overdue task indicators, and recorded hours.
                  </p>
                </div>

                {/* Status Breakdown Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                    Active: {data.projectPerformance.statusBreakdown.ACTIVE}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200/80">
                    In Progress: {data.projectPerformance.statusBreakdown.IN_PROGRESS}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200/80">
                    Planning: {data.projectPerformance.statusBreakdown.PLANNING}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                    On Hold: {data.projectPerformance.statusBreakdown.ON_HOLD}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                    Completed: {data.projectPerformance.statusBreakdown.COMPLETED}
                  </span>
                  {data.projectPerformance.overdueProjectsCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                      Overdue: {data.projectPerformance.overdueProjectsCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Table Search & Tools */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search project by name or code..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-[8px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B1738]"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {displayedProjects.length} of {data.projectPerformance.projects.length} projects
                </span>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200/80">
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 min-w-[160px]">Task Progress</th>
                      <th className="py-3 px-4">Overdue Tasks</th>
                      <th className="py-3 px-4">Schedule / Dates</th>
                      <th className="py-3 px-4 text-right">Logged Hours</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                          No matching projects found.
                        </td>
                      </tr>
                    ) : (
                      displayedProjects.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#0B1738]">{p.name}</div>
                            {p.code && (
                              <span className="font-mono text-[11px] text-slate-400">{p.code}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              p.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              p.status === 'PLANNING' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              p.status === 'ON_HOLD' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {p.status}
                            </span>
                            {p.isOverdue && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Overdue
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium text-slate-600">{p.progressPct}%</span>
                                <span className="text-slate-400">{p.completedTasks}/{p.totalTasks} done</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-[#0B1738] rounded-full transition-all duration-300"
                                  style={{ width: `${p.progressPct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {p.overdueTasks > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertTriangle className="w-3 h-3" />
                                {p.overdueTasks} overdue
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {p.startDate || p.endDate ? (
                              <div className="text-[11px]">
                                <span>{formatDisplayDate(p.startDate)}</span>
                                <span className="text-slate-400 mx-1">→</span>
                                <span>{formatDisplayDate(p.endDate)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#0B1738]">
                            {p.loggedHours}h
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => navigate(`/projects/${p.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#0B1738] hover:bg-slate-100 rounded-[6px] transition-colors cursor-pointer"
                              title="Open project details"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION B: TASK PROGRESS                                       */}
            {/* ============================================================== */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#0B1738] text-white flex items-center justify-center text-xs font-bold">
                        B
                      </div>
                      <h2 className="text-lg font-bold text-[#0B1738]">
                        Task Progress
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Distribution across supported workflow statuses, open workloads, and completion metrics.
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <div>
                      Open: <strong className="text-[#0B1738]">{data.taskProgress.totalOpenTasks}</strong>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div>
                      Completed in period: <strong className="text-emerald-700">{data.taskProgress.completedInPeriod}</strong>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div>
                      Overdue: <strong className={data.taskProgress.overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-700'}>{data.taskProgress.overdueTasksCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Proportional Stacked Status Bar */}
                <div className="mt-5 space-y-2">
                  <div className="w-full h-2.5 bg-slate-100 rounded-full flex overflow-hidden">
                    <div
                      style={{ width: `${data.taskProgress.distribution.TODO.pct}%` }}
                      className="bg-slate-400 h-full transition-all duration-300"
                      title={`To Do: ${data.taskProgress.distribution.TODO.count} (${data.taskProgress.distribution.TODO.pct}%)`}
                    />
                    <div
                      style={{ width: `${data.taskProgress.distribution.IN_PROGRESS.pct}%` }}
                      className="bg-blue-500 h-full transition-all duration-300"
                      title={`In Progress: ${data.taskProgress.distribution.IN_PROGRESS.count} (${data.taskProgress.distribution.IN_PROGRESS.pct}%)`}
                    />
                    <div
                      style={{ width: `${data.taskProgress.distribution.REVIEW.pct}%` }}
                      className="bg-purple-500 h-full transition-all duration-300"
                      title={`Review: ${data.taskProgress.distribution.REVIEW.count} (${data.taskProgress.distribution.REVIEW.pct}%)`}
                    />
                    <div
                      style={{ width: `${data.taskProgress.distribution.DONE.pct}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title={`Done: ${data.taskProgress.distribution.DONE.count} (${data.taskProgress.distribution.DONE.pct}%)`}
                    />
                  </div>

                  {/* 4 Clickable Status Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStatus(selectedStatus === 'TODO' ? '' : 'TODO')}
                      className={`p-2.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                        selectedStatus === 'TODO'
                          ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400'
                          : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-slate-600">To Do</div>
                      <div className="text-lg font-bold text-slate-800 mt-0.5">
                        {data.taskProgress.distribution.TODO.count}
                        <span className="text-[11px] font-normal text-slate-400 ml-1.5">
                          ({data.taskProgress.distribution.TODO.pct}%)
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStatus(selectedStatus === 'IN_PROGRESS' ? '' : 'IN_PROGRESS')}
                      className={`p-2.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                        selectedStatus === 'IN_PROGRESS'
                          ? 'bg-blue-100/80 border-blue-400 ring-1 ring-blue-400'
                          : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-blue-700">In Progress</div>
                      <div className="text-lg font-bold text-blue-900 mt-0.5">
                        {data.taskProgress.distribution.IN_PROGRESS.count}
                        <span className="text-[11px] font-normal text-blue-500 ml-1.5">
                          ({data.taskProgress.distribution.IN_PROGRESS.pct}%)
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStatus(selectedStatus === 'REVIEW' ? '' : 'REVIEW')}
                      className={`p-2.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                        selectedStatus === 'REVIEW'
                          ? 'bg-purple-100/80 border-purple-400 ring-1 ring-purple-400'
                          : 'bg-purple-50/50 border-purple-100 hover:bg-purple-50'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-purple-700">Review</div>
                      <div className="text-lg font-bold text-purple-900 mt-0.5">
                        {data.taskProgress.distribution.REVIEW.count}
                        <span className="text-[11px] font-normal text-purple-500 ml-1.5">
                          ({data.taskProgress.distribution.REVIEW.pct}%)
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStatus(selectedStatus === 'DONE' ? '' : 'DONE')}
                      className={`p-2.5 rounded-[10px] border text-left transition-all cursor-pointer ${
                        selectedStatus === 'DONE'
                          ? 'bg-emerald-100/80 border-emerald-400 ring-1 ring-emerald-400'
                          : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
                      }`}
                    >
                      <div className="text-[11px] font-bold text-emerald-700">Done</div>
                      <div className="text-lg font-bold text-emerald-900 mt-0.5">
                        {data.taskProgress.distribution.DONE.count}
                        <span className="text-[11px] font-normal text-emerald-600 ml-1.5">
                          ({data.taskProgress.distribution.DONE.pct}%)
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Task Search Bar */}
              <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="relative w-80">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search task by title, ticket ID, assignee..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-[8px] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B1738]"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Showing {displayedTasks.length} tasks
                </span>
              </div>

              {/* Tasks Table */}
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Task / Ticket</th>
                      <th className="py-3 px-4">Project</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actual Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                          No matching tasks found.
                        </td>
                      </tr>
                    ) : (
                      displayedTasks.slice(0, 100).map((t: any) => (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0B1738]">{t.name}</div>
                            {t.ticketId && (
                              <span className="font-mono text-[10px] text-slate-400">{t.ticketId}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="font-medium">{t.projectName}</span>
                          </td>
                          <td className="py-3 px-4">
                            {t.assigneeName ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                  {t.assigneeName.charAt(0).toUpperCase()}
                                </span>
                                <span className="text-slate-700 font-medium">{t.assigneeName}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                              t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                              t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.status === 'DONE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              t.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              t.status === 'REVIEW' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {t.dueDate ? (
                              <div className="flex items-center gap-1.5">
                                <span className={t.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                                  {formatDisplayDate(t.dueDate)}
                                </span>
                                {t.isOverdue && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                    Overdue
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#0B1738]">
                            {t.actualHours}h
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION C: TEAM OVERVIEW                                       */}
            {/* ============================================================== */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#0B1738] text-white flex items-center justify-center text-xs font-bold">
                      C
                    </div>
                    <h2 className="text-lg font-bold text-[#0B1738]">
                      Team Overview
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Organization-wide team leadership, headcount, active workloads, and logged hours.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/teams')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#0B1738] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-[8px] transition-colors cursor-pointer shrink-0"
                >
                  <UsersRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manage Teams</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              {/* Teams Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200/80">
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4">Team Lead</th>
                      <th className="py-3 px-4 text-center">Active Members</th>
                      <th className="py-3 px-4 text-center">Open Tasks</th>
                      <th className="py-3 px-4 text-center">Overdue Tasks</th>
                      <th className="py-3 px-4 text-right">Logged Hours in Period</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.teamOverview.teams.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                          No teams registered in the organization.
                        </td>
                      </tr>
                    ) : (
                      data.teamOverview.teams.map((team: any) => (
                        <tr key={team.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#0B1738]">
                            {team.name}
                          </td>
                          <td className="py-3.5 px-4">
                            {team.managerName ? (
                              <div>
                                <div className="font-semibold text-slate-800">{team.managerName}</div>
                                {team.managerEmail && (
                                  <div className="text-[11px] text-slate-400 font-mono">{team.managerEmail}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No Lead Assigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {team.activeMemberCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {team.openTaskCount}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {team.overdueTaskCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                {team.overdueTaskCount}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#0B1738]">
                            {team.totalLoggedHours}h
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => navigate('/teams')}
                              className="text-xs font-semibold text-slate-700 hover:text-[#0B1738] hover:underline cursor-pointer"
                            >
                              View Team
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION D: WORK HOURS SUMMARY                                  */}
            {/* ============================================================== */}
            <div className="bg-white border border-slate-200/80 rounded-[14px] shadow-xs overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#0B1738] text-white flex items-center justify-center text-xs font-bold">
                      D
                    </div>
                    <h2 className="text-lg font-bold text-[#0B1738]">
                      Work Hours Summary
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Organization timesheet recordings, verification states, and project/team distributions.
                  </p>
                </div>

                <div className="text-xs text-slate-500">
                  Total Logged: <strong className="text-lg font-bold text-[#0B1738] ml-1">{data.workHoursSummary.totalLoggedHours}h</strong>
                </div>
              </div>

              {/* 4 Approval Status Metric Cards */}
              <div className="p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

                  {/* Approved */}
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-[12px] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Approved</span>
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-950 mt-1">
                      {data.workHoursSummary.approvedHours}h
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      {data.summary.approvalRate}% of all recorded hours signed off.
                    </p>
                  </div>

                  {/* Submitted / Pending */}
                  <div className="bg-blue-50/60 border border-blue-100 rounded-[12px] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-800">Submitted (Pending)</span>
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-950 mt-1">
                      {data.workHoursSummary.submittedHours}h
                    </div>
                    <p className="text-[11px] text-blue-700 mt-1">
                      Awaiting manager sign-off.
                    </p>
                  </div>

                  {/* Draft */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-[12px] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Draft (Unsubmitted)</span>
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-800 mt-1">
                      {data.workHoursSummary.draftHours}h
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Logged by employee; not yet submitted.
                    </p>
                  </div>

                  {/* Rejected */}
                  <div className="bg-rose-50/60 border border-rose-100 rounded-[12px] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800">Rejected / Returned</span>
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    </div>
                    <div className="text-2xl font-bold text-rose-950 mt-1">
                      {data.workHoursSummary.rejectedHours}h
                    </div>
                    <p className="text-[11px] text-rose-700 mt-1">
                      Returned for employee revision.
                    </p>
                  </div>

                </div>

                {/* Side-by-side Project and Team Breakdowns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">

                  {/* Hours by Project */}
                  <div className="border border-slate-200/80 rounded-[12px] p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Hours by Project</span>
                      <span className="text-slate-400 normal-case font-medium">{data.workHoursSummary.byProject.length} Projects</span>
                    </h3>

                    {data.workHoursSummary.byProject.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No project hours logged in this period.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.workHoursSummary.byProject.slice(0, 8).map((p: any, idx: number) => (
                          <div key={p.projectId || idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                                {p.projectName}
                              </span>
                              <span className="text-slate-600 font-medium">
                                <strong className="text-[#0B1738]">{p.hours}h</strong> ({p.pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-[#0B1738] rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(2, p.pct))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Hours by Team */}
                  <div className="border border-slate-200/80 rounded-[12px] p-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Hours by Team</span>
                      <span className="text-slate-400 normal-case font-medium">{data.workHoursSummary.byTeam.length} Teams</span>
                    </h3>

                    {data.workHoursSummary.byTeam.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No team hours logged in this period.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.workHoursSummary.byTeam.slice(0, 8).map((t: any, idx: number) => (
                          <div key={t.teamId || idx} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                                {t.teamName}
                              </span>
                              <span className="text-slate-600 font-medium">
                                <strong className="text-[#0B1738]">{t.hours}h</strong> ({t.pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(2, t.pct))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Organization Config Context */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Organization Timezone: {data.organization.timeZone}</span>
                  <span>Date Format: {data.organization.dateFormat}</span>
                </div>
              </div>
            </div>

          </div>
        </>
      ) : null}

    </div>
  );
}
