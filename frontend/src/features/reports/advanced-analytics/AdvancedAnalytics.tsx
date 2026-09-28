import { useState } from 'react';
import { BarChart3, Filter } from 'lucide-react';
import { ReportLayout, ReportEmptyState } from '../components/ReportLayout';
import { useGetAdvancedAnalyticsReportQuery } from '../../../store/apiSlice';
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee';

export const AdvancedAnalytics = () => {
  const { employee } = useCurrentEmployee();
  
  const [interval, setInterval] = useState<'day' | 'week' | 'month'>('week');
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
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
  
  const isValidDateRange = startDate && endDate && endDate >= startDate;

  const { data: reportData, isLoading, error: reportError, refetch } = useGetAdvancedAnalyticsReportQuery(
    { startDate, endDate, interval },
    { skip: !isValidDateRange || !employee }
  );

  const error = (endDate < startDate) ? 'End date cannot be before start date' :
                reportError ? 'Failed to fetch advanced analytics report' : '';
  const data = reportData || null;

  const fetchReport = () => {
    if (isValidDateRange && employee) refetch();
  };

  const extraFilters = (
    <div className="space-y-1.5 ml-0 sm:ml-4">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Interval</label>
      <div className="relative">
        <Filter className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value as 'day' | 'week' | 'month')}
          className="pl-8.5 pr-3 py-2.5 text-xs sm:text-sm border border-slate-200/90 rounded-xl bg-slate-50/50 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
      </div>
    </div>
  );

  return (
    <ReportLayout
      title="Advanced Analytics"
      description="Historical insights into logged hours, status trends, and period-over-period comparisons."
      icon={BarChart3}
      loading={isLoading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={fetchReport}
      extraFilters={extraFilters}
    >
      {!data ? (
        <ReportEmptyState message="No data to display. Adjust dates and refresh." />
      ) : (
        <div className="p-6 space-y-6">
          {/* Period-over-Period Summary */}
          {data.periodOverPeriod && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Logged Hours</p>
                <div className="mt-2 flex items-baseline space-x-2">
                  <h3 className="text-3xl font-extrabold text-slate-950 font-display">
                    {data.periodOverPeriod.currentPeriod.totalHours}h
                  </h3>
                  {data.periodOverPeriod.percentageChange !== null ? (
                    <span className={`text-xs font-bold ${data.periodOverPeriod.percentageChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {data.periodOverPeriod.percentageChange >= 0 ? '+' : ''}{data.periodOverPeriod.percentageChange}% vs Prev
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      N/A (No prior data)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown Trend */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">Logged Hours by Parent Timesheet Status</h3>
              {!data.trendData || data.trendData.length === 0 ? (
                <ReportEmptyState message="No trend data available." />
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Period</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Apprv</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Subm</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Rej</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Draft</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.trendData.map((t: any) => (
                        <tr key={t.period} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">{t.period}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-emerald-600 text-xs">{t.APPROVED}h</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-600 text-xs">{t.SUBMITTED}h</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600 text-xs">{t.REJECTED}h</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-600 text-xs">{t.DRAFT}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Estimated vs Actual Hours */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">Estimated (Planning) vs Actual (Logged) Hours</h3>
              {!data.estimatedVsActual || data.estimatedVsActual.length === 0 ? (
                <ReportEmptyState message="No tasks logged in this period." />
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs max-h-96 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Task</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Est. (Planning)</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Actual (Logged)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.estimatedVsActual.map((task: any) => (
                        <tr key={task.taskId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-slate-800 text-xs truncate max-w-[150px]">{task.taskName}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-slate-500 text-xs">{task.estimatedHours}h</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs">{task.actualHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Project Hours Trends */}
            <div className="space-y-3 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 font-display">Project Hours Trends</h3>
              {!data.projectHoursTrend || data.projectHoursTrend.length === 0 ? (
                <ReportEmptyState message="No project hours logged in this period." />
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs max-h-96 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Period</th>
                        <th scope="col" className="px-5 py-3.5">Project</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.projectHoursTrend.map((p: any, idx: number) => (
                        <tr key={`${p.period}-${p.projectId}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">{p.period}</td>
                          <td className="px-5 py-3.5 font-medium text-slate-800 text-xs">{p.projectName}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs">{p.hours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Overdue Task Trend */}
            <div className="space-y-3 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 font-display">Overdue Task Pipeline (Based on Active Tasks & Due Dates)</h3>
              {!data.overdueTaskTrend || data.overdueTaskTrend.length === 0 ? (
                <ReportEmptyState message="No overdue tasks." />
              ) : (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <tr>
                        <th scope="col" className="px-5 py-3.5">Due Date Period</th>
                        <th scope="col" className="px-5 py-3.5 text-right">Active Tasks Past Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.overdueTaskTrend.map((o: any) => (
                        <tr key={o.period} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5 text-rose-600 font-mono font-bold text-xs">{o.period}</td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-xs">{o.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </ReportLayout>
  );
};
