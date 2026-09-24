import { useState, useEffect } from 'react';
import { PieChart, Filter } from 'lucide-react';
import { ReportLayout, ReportEmptyState } from './components/ReportLayout';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useGetProjectAnalysisReportQuery, useGetProjectsQuery } from '../../store/apiSlice';

export const ProjectAnalysis = () => {
  const { employee } = useCurrentEmployee();
  
  const [interval, setInterval] = useState<'week' | 'month'>('month');
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 365);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  const [projectId, setProjectId] = useState<string>('');
  const isAdmin = employee?.roles?.includes('ADMIN');
  const isValidDateRange = startDate && endDate && endDate >= startDate;

  const { data: projectsData, isLoading: projectsLoading } = useGetProjectsQuery(undefined, { skip: !isAdmin });
  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);

  // Default projectId to the first one if not set
  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const { data: reportData, isLoading: reportLoading, error: reportError, refetch } = useGetProjectAnalysisReportQuery(
    { projectId, startDate, endDate, interval },
    { skip: !isValidDateRange || !isAdmin || !projectId }
  );

  const loading = reportLoading || projectsLoading;
  const error = !isAdmin ? 'You are not authorized to view the Project Analysis report.' :
                (endDate < startDate) ? 'End date cannot be before start date' :
                reportError ? 'Failed to fetch project analysis report' : '';
  const data = reportData || null;

  const fetchReport = () => {
    if (isValidDateRange && isAdmin && projectId) refetch();
  };

  const extraFilters = (
    <>
      <div className="space-y-1.5 ml-0 sm:ml-4 flex-1 max-w-xs">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Select Project *</label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full text-xs sm:text-sm border border-slate-200/90 rounded-xl py-2.5 px-3.5 bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
        >
          <option value="" disabled>Select a project</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 ml-0 sm:ml-4">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Interval</label>
        <div className="relative">
          <Filter className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as 'week' | 'month')}
            className="pl-8.5 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200/90 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
          >
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>
    </>
  );

  return (
    <ReportLayout
      title="Project Analysis"
      description="Deep dive into a specific project's effort over time and activity breakdown."
      icon={PieChart}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={fetchReport}
      extraFilters={extraFilters}
    >
      {!projectId ? (
        <ReportEmptyState message="Please select a project to view its analysis." />
      ) : !data ? (
        <ReportEmptyState message="No data to display. Adjust filters and refresh." />
      ) : (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Project Hours</p>
              <h3 className="text-3xl font-extrabold text-slate-950 font-display mt-2">
                {data.hoursByActivity?.reduce((sum: number, a: any) => sum + (a.hours || 0), 0) || 0}h
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-2">Combined recorded work hours</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Date Range Span</p>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display mt-2">
                {
                  [startDate, endDate].map((dStr, i) => {
                    const [y, m, d] = dStr.split('-');
                    const date = new Date(Number(y), Number(m) - 1, Number(d));
                    return (
                      <span key={i}>
                        {i > 0 && ' to '}
                        {date.toLocaleDateString()}
                      </span>
                    );
                  })
                }
              </h3>
              <p className="text-[11px] text-slate-400 font-mono mt-2">{interval === 'week' ? 'Weekly increments' : 'Monthly increments'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">Hours by Task</h3>
              {!data.hoursByTask || data.hoursByTask.length === 0 ? (
                <ReportEmptyState message="No tasks logged in this period." />
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Task Name</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.hoursByTask?.map((task: any) => (
                        <tr key={task.taskId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-800 text-xs sm:text-sm">{task.taskName}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">{task.hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Activity Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">Hours by Activity</h3>
              {!data.hoursByActivity || data.hoursByActivity.length === 0 ? (
                <ReportEmptyState message="No activities logged in this period." />
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Activity Name</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.hoursByActivity?.map((act: any) => (
                        <tr key={act.activityId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-800 text-xs sm:text-sm">{act.activityName}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">{act.hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Time Series */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 font-display">Trend ({interval === 'week' ? 'Weekly' : 'Monthly'})</h3>
            {!data.trend || data.trend.length === 0 ? (
              <ReportEmptyState message="No trend data available." />
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">Period Start</th>
                      <th scope="col" className="px-5 py-3.5 text-right">Hours Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.trend?.map((ts: any) => (
                      <tr key={ts.period} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">{ts.period}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">{ts.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </ReportLayout>
  );
};
