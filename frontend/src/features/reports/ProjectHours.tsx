import { useState } from 'react';
import { Clock4, Users, CheckCircle2, Layers } from 'lucide-react';
import { ReportLayout, ReportEmptyState } from './components/ReportLayout';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useGetProjectHoursReportQuery, useGetProjectsQuery } from '../../store/apiSlice';

export const ProjectHours = () => {
  const { employee } = useCurrentEmployee();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
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

  const queryParams: any = { startDate, endDate };
  if (projectId) queryParams.projectId = projectId;

  const { data: reportData, isLoading: reportLoading, error: reportError, refetch } = useGetProjectHoursReportQuery(
    queryParams,
    { skip: !isValidDateRange || !isAdmin }
  );

  const loading = reportLoading || projectsLoading;
  const error = !isAdmin ? 'You are not authorized to view the Project Hours report.' :
                (endDate < startDate) ? 'End date cannot be before start date' :
                reportError ? 'Failed to fetch project hours report' : '';
  const data = reportData || null;

  const fetchReport = () => {
    if (isValidDateRange && isAdmin) refetch();
  };

  const projectFilter = (
    <div className="space-y-1.5 min-w-[220px] flex-1 sm:max-w-xs">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Filter by Project</label>
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        className="w-full px-3.5 py-2 text-xs sm:text-sm text-slate-900 bg-slate-50/50 hover:bg-white border border-slate-200/90 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-950/15 focus:border-slate-900 focus:outline-none transition-all shadow-2xs"
      >
        <option value="">All Projects</option>
        {projects.map((p: any) => (
          <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
        ))}
      </select>
    </div>
  );

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <ReportLayout
      title="Project Hours Breakdown"
      description="View how hours are distributed across different projects, team members, and task work packages."
      icon={Clock4}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={fetchReport}
      extraFilters={projectFilter}
    >
      {!data || (data.employeeBreakdown?.length === 0 && data.taskBreakdown?.length === 0) ? (
        <ReportEmptyState message="No data to display. Adjust date range and refresh." />
      ) : (
        <div className="p-6 sm:p-7 space-y-7">
          {/* Executive Overview Banner */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                  Verified Audit Hours
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight font-display">
                  Total Approved Hours: {data.totalApprovedHours}h
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-slate-600 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span><strong className="text-slate-900 font-semibold">{data.employeeBreakdown?.length || 0}</strong> contributors</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                <span><strong className="text-slate-900 font-semibold">{data.taskBreakdown?.length || 0}</strong> tasks</span>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-start">
            {/* Column 1: Employee Breakdown */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                  <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-mono">
                    Employee Breakdown
                  </h4>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {data.employeeBreakdown?.length || 0} members
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Employee Name</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.employeeBreakdown?.map((emp: any) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/70 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80">
                              {getInitials(emp.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 text-sm block truncate">
                                {emp.name}
                              </span>
                              <span className="font-mono text-xs text-slate-400">
                                {emp.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs shadow-2xs">
                            {emp.hours}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 2: Task Breakdown */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                  <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider font-mono">
                    Task Breakdown
                  </h4>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {data.taskBreakdown?.length || 0} tasks
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <tr>
                      <th scope="col" className="px-6 py-3.5 font-semibold">Task Name</th>
                      <th scope="col" className="px-6 py-3.5 font-semibold text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.taskBreakdown?.map((task: any) => (
                      <tr key={task.taskId} className="hover:bg-slate-50/70 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/80">
                              <Layers className="w-3.5 h-3.5 text-slate-500" />
                            </div>
                            <span className="font-semibold text-slate-900 text-sm truncate">
                              {task.taskName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs shadow-2xs">
                            {task.hours}h
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportLayout>
  );
};
