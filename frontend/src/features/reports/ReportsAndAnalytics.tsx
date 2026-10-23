import { useState, useMemo } from 'react';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  Hourglass,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useGetAdvancedAnalyticsReportQuery } from '../../store/apiSlice';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { DatePicker } from '../../components/ui/DatePicker';
import { AdminReportsView } from './AdminReportsView';

export function ReportsAndAnalytics() {
  const { employee } = useCurrentEmployee();
  const isAdmin = employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN';

  if (isAdmin) {
    return <AdminReportsView />;
  }

  return <NonAdminReportsView />;
}

function NonAdminReportsView() {
  const { employee } = useCurrentEmployee();

  // Helper to format Date to YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Preset calculation
  const getPresetDates = (preset: '7d' | '30d' | 'month' | '90d') => {
    const end = new Date();
    const start = new Date();
    if (preset === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (preset === '30d') {
      start.setDate(end.getDate() - 30);
    } else if (preset === 'month') {
      start.setDate(1);
    } else if (preset === '90d') {
      start.setDate(end.getDate() - 90);
    }
    return { start: formatYMD(start), end: formatYMD(end) };
  };

  const defaultDates = useMemo(() => getPresetDates('30d'), []);
  const [activePreset, setActivePreset] = useState<'7d' | '30d' | 'month' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const handleSelectPreset = (preset: '7d' | '30d' | 'month' | '90d') => {
    setActivePreset(preset);
    const range = getPresetDates(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const isValidDateRange = Boolean(startDate && endDate && endDate >= startDate);

  const { data: reportData, isLoading, isFetching, error: reportError, refetch } = useGetAdvancedAnalyticsReportQuery(
    { startDate, endDate, interval: 'day' },
    { skip: !isValidDateRange || !employee }
  );

  // Compute aggregated report metrics
  const {
    totalHours,
    approvedHours,
    submittedHours,
    draftHours,
    rejectedHours,
    approvedPercent,
    submittedPercent,
    draftPercent,
    rejectedPercent,
    projectList,
    activeProjectsCount,
    taskComparisonList,
    totalTasksCount,
    percentageChange
  } = useMemo(() => {
    const trend = reportData?.trendData || [];
    let totH = 0;
    let appH = 0;
    let subH = 0;
    let drfH = 0;
    let rejH = 0;

    trend.forEach((t: any) => {
      totH += Number(t.totalHours || 0);
      appH += Number(t.APPROVED || 0);
      subH += Number(t.SUBMITTED || 0);
      drfH += Number(t.DRAFT || 0);
      rejH += Number(t.REJECTED || 0);
    });

    // Fallback if periodOverPeriod has currentPeriod total
    if (totH === 0 && reportData?.periodOverPeriod?.currentPeriod?.totalHours) {
      totH = Number(reportData.periodOverPeriod.currentPeriod.totalHours);
    }

    const appPct = totH > 0 ? Math.round((appH / totH) * 100) : 0;
    const subPct = totH > 0 ? Math.round((subH / totH) * 100) : 0;
    const drfPct = totH > 0 ? Math.round((drfH / totH) * 100) : 0;
    const rejPct = totH > 0 ? Math.round((rejH / totH) * 100) : 0;

    // Aggregate Project Hours
    const projMap = new Map<string, { id: string; name: string; hours: number }>();
    (reportData?.projectHoursTrend || []).forEach((item: any) => {
      const existing = projMap.get(item.projectId) || {
        id: item.projectId,
        name: item.projectName || 'Unnamed Project',
        hours: 0
      };
      existing.hours += Number(item.hours || 0);
      projMap.set(item.projectId, existing);
    });

    const pList = Array.from(projMap.values())
      .filter(p => p.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    // Tasks Comparison
    const tList = (reportData?.estimatedVsActual || []).slice(0, 8);

    return {
      totalHours: Math.round(totH * 10) / 10,
      approvedHours: Math.round(appH * 10) / 10,
      submittedHours: Math.round(subH * 10) / 10,
      draftHours: Math.round(drfH * 10) / 10,
      rejectedHours: Math.round(rejH * 10) / 10,
      approvedPercent: appPct,
      submittedPercent: subPct,
      draftPercent: drfPct,
      rejectedPercent: rejPct,
      projectList: pList,
      activeProjectsCount: pList.length,
      taskComparisonList: tList,
      totalTasksCount: (reportData?.estimatedVsActual || []).length,
      percentageChange: reportData?.periodOverPeriod?.percentageChange ?? null
    };
  }, [reportData]);

  const hasData = totalHours > 0 || projectList.length > 0 || taskComparisonList.length > 0;

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <div className="space-y-6">

        {/* Clean Page Header — Public Holidays Style, No SVG Boxes */}
        <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
                Workforce Reports
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Reports
              </span>
            </div>
            <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
              A simple overview of team working hours, project progress, and timesheet approvals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${isLoading || isFetching ? 'animate-spin text-slate-900' : 'text-slate-500'}`} />
              <span>{isLoading || isFetching ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Easy Date Range Toolbar with Quick Presets */}
        <div className="relative z-30 animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          {/* Quick Preset Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1.5">Period:</span>
            <button
              type="button"
              onClick={() => handleSelectPreset('7d')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${activePreset === '7d'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('30d')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${activePreset === '30d'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('month')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${activePreset === 'month'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('90d')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${activePreset === '90d'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
            >
              Last 90 Days
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>From:</span>
              <div className="w-32 relative z-20">
                <DatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    setActivePreset('custom');
                  }}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span>To:</span>
              <div className="w-32 relative z-10">
                <DatePicker
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val);
                    setActivePreset('custom');
                  }}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {reportError && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-[14px] flex items-center gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-bold">Unable to load report data</p>
              <p className="text-xs text-rose-600 mt-0.5">Please check your internet connection or verify the selected date range.</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white/95 border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Loading report insights…</span>
          </div>
        ) : (
          <>
            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Card 1: Total Hours Worked */}
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Total Hours Worked
                    </span>
                    <Clock className="w-4 h-4 text-slate-900" />
                  </div>
                  <h3 className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
                    {totalHours}h
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Total time worked by your team during this period.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {percentageChange !== null ? (
                    <span className={`inline-flex items-center gap-1 font-bold ${percentageChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                      {percentageChange >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {percentageChange >= 0 ? '+' : ''}{percentageChange}% vs prior period
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium font-sans">Standard period</span>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold font-sans bg-slate-100 text-slate-700 border border-slate-200/80">
                    {activePreset.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Card 2: Approved Hours */}
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Approved Hours
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-slate-900" />
                  </div>
                  <h3 className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
                    {approvedHours}h
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Hours reviewed and accepted by managers.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600">
                    {approvedPercent}% of all hours
                  </span>
                  <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                    Ready for payroll
                  </span>
                </div>
              </div>

              {/* Card 3: Pending Review */}
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Pending Review
                    </span>
                    <Hourglass className="w-4 h-4 text-slate-900" />
                  </div>
                  <h3 className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
                    {submittedHours}h
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Hours waiting for manager sign-off.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-600">
                    {submittedPercent}% awaiting check
                  </span>
                  <span className="text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                    Needs action
                  </span>
                </div>
              </div>

              {/* Card 4: Active Projects */}
              <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                      Active Projects
                    </span>
                    <FolderKanban className="w-4 h-4 text-slate-900" />
                  </div>
                  <h3 className="text-3xl font-semibold text-slate-900 mt-2 tracking-tight">
                    {activeProjectsCount}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Projects with work recorded.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    {totalTasksCount} tasks tracked
                  </span>
                  <span className="text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                    In progress
                  </span>
                </div>
              </div>

            </div>

            {/* If no data at all in the selected range */}
            {!hasData && (
              <div className="bg-white/95 border border-slate-200/80 rounded-[14px] p-10 text-center shadow-xs">
                <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No work hours found for this period</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  There are no timesheet entries recorded between {startDate} and {endDate}. You can change the dates above or check back once hours have been logged.
                </p>
              </div>
            )}

            {/* Visual Sections */}
            {hasData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Section 1: Work Hours by Project */}
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Work Hours by Project
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Shows how much time your team worked on each project.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        {projectList.length} Projects
                      </span>
                    </div>

                    {projectList.length === 0 ? (
                      <p className="text-xs text-slate-400 py-8 text-center">No project hours logged in this period.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 mt-2">
                        {projectList.map((project, idx) => {
                          const projectPercent = totalHours > 0 ? Math.round((project.hours / totalHours) * 100) : 0;
                          return (
                            <div key={project.id || idx} className="py-3.5 first:pt-2 last:pb-1">
                              <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-800 text-sm">{project.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-slate-900 text-sm">{project.hours}h</span>
                                  <span className="text-slate-400 ml-1.5 text-xs">({projectPercent}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full bg-slate-900 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(2, projectPercent))}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                    <span className="text-xs text-slate-500 font-medium">
                      Total Across Projects: <strong className="text-slate-900">{totalHours} hours</strong>
                    </span>
                  </div>
                </div>

                {/* Section 2: Timesheet Review Status */}
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-900">
                          Timesheet Review Status
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Shows whether employee work hours are approved, waiting for review, or need revision.
                        </p>
                      </div>
                    </div>

                    {/* Proportional Stacked Progress Bar */}
                    <div className="mt-4">
                      <div className="text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                        <span>Overall Approval Distribution</span>
                        <span>{totalHours}h Total</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
                        {approvedHours > 0 && (
                          <div
                            style={{ width: `${approvedPercent}%` }}
                            className="bg-emerald-500 h-full transition-all duration-500"
                            title={`Approved: ${approvedHours}h (${approvedPercent}%)`}
                          />
                        )}
                        {submittedHours > 0 && (
                          <div
                            style={{ width: `${submittedPercent}%` }}
                            className="bg-blue-500 h-full transition-all duration-500"
                            title={`Waiting Review: ${submittedHours}h (${submittedPercent}%)`}
                          />
                        )}
                        {draftHours > 0 && (
                          <div
                            style={{ width: `${draftPercent}%` }}
                            className="bg-slate-400 h-full transition-all duration-500"
                            title={`Draft: ${draftHours}h (${draftPercent}%)`}
                          />
                        )}
                        {rejectedHours > 0 && (
                          <div
                            style={{ width: `${rejectedPercent}%` }}
                            className="bg-rose-500 h-full transition-all duration-500"
                            title={`Needs Revision: ${rejectedHours}h (${rejectedPercent}%)`}
                          />
                        )}
                      </div>
                    </div>

                    {/* 4 Status Breakdown Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">

                      {/* Approved */}
                      <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800">Approved</span>
                          <span className="text-xs font-bold text-emerald-900 font-sans">{approvedHours}h</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Reviewed and signed off by managers.
                        </p>
                      </div>

                      {/* Waiting Review */}
                      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-800">Waiting for Review</span>
                          <span className="text-xs font-bold text-blue-900 font-sans">{submittedHours}h</span>
                        </div>
                        <p className="text-[11px] text-blue-700 mt-1">
                          Submitted by team, awaiting manager sign-off.
                        </p>
                      </div>

                      {/* Draft */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">In Progress (Draft)</span>
                          <span className="text-xs font-bold text-slate-900 font-sans">{draftHours}h</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          Logged by employee, not yet submitted.
                        </p>
                      </div>

                      {/* Needs Revision */}
                      <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-800">Needs Revision</span>
                          <span className="text-xs font-bold text-rose-900 font-sans">{rejectedHours}h</span>
                        </div>
                        <p className="text-[11px] text-rose-700 mt-1">
                          Returned by manager to be corrected.
                        </p>
                      </div>

                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Approval Rate</span>
                    <span className="font-bold text-emerald-600">{approvedPercent}% Approved</span>
                  </div>
                </div>

                {/* Section 3: Planned Time vs. Actual Time */}
                <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-[14px] p-6 shadow-xs lg:col-span-2">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Planned Time vs. Actual Time
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Compare how long tasks were planned to take versus how long they actually took.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                      Top {taskComparisonList.length} Tasks
                    </span>
                  </div>

                  {taskComparisonList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">
                      No task time comparisons available for this period.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {taskComparisonList.map((task: any) => {
                        const estimated = Number(task.estimatedHours || 0);
                        const actual = Number(task.actualHours || 0);
                        const isOver = estimated > 0 && actual > estimated;
                        const diff = Math.round(Math.abs(actual - estimated) * 10) / 10;
                        const maxVal = Math.max(estimated, actual, 1);
                        const estWidth = Math.round((estimated / maxVal) * 100);
                        const actWidth = Math.round((actual / maxVal) * 100);

                        return (
                          <div
                            key={task.taskId}
                            className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 hover:bg-white hover:border-slate-300 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate max-w-sm">
                                {task.taskName}
                              </span>

                              <div className="flex items-center gap-2">
                                {estimated === 0 ? (
                                  <span className="text-[11px] font-medium text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                                    No estimate set
                                  </span>
                                ) : isOver ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    Over plan by +{diff}h
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    On Track
                                  </span>
                                )}

                                <div className="text-xs font-medium text-slate-600">
                                  <span>Planned: <strong>{estimated}h</strong></span>
                                  <span className="mx-1.5 text-slate-300">|</span>
                                  <span>Actual: <strong className="text-slate-900">{actual}h</strong></span>
                                </div>
                              </div>
                            </div>

                            {/* Dual Comparison Bars */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-12">Plan:</span>
                                <div className="flex-1 bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-slate-400 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${estWidth}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-500 w-12">Actual:</span>
                                <div className="flex-1 bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${isOver ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                    style={{ width: `${actWidth}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
