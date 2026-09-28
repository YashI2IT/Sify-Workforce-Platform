import { useState } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import { ReportLayout, ReportEmptyState } from './components/ReportLayout';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useGetTeamUtilizationReportQuery } from '../../store/apiSlice';

export const TeamUtilization = () => {
  const { employee } = useCurrentEmployee();
  
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

  const isManager = employee?.roles?.includes('MANAGER');
  const isValidDateRange = startDate && endDate && endDate >= startDate;

  const { data: reportData, isLoading, error: reportError, refetch } = useGetTeamUtilizationReportQuery(
    { startDate, endDate },
    { skip: !isValidDateRange || !isManager }
  );

  const loading = isLoading;
  const error = !isManager ? 'You are not authorized to view the Team Utilization report.' :
                (endDate < startDate) ? 'End date cannot be before start date' :
                reportError ? 'Failed to fetch team utilization report' : '';
  const data = reportData || null;

  const fetchReport = () => {
    if (isValidDateRange && isManager) refetch();
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <ReportLayout
      title="Team Utilization"
      description="Track the total hours logged by each member of your team over the selected period."
      icon={TrendingUp}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={fetchReport}
    >
      {!data || !data.data ? (
        <ReportEmptyState message="No data to display. Adjust date range and refresh." />
      ) : (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 ">Member Utilization Breakdown</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Aggregated weekly allocations across reporting personnel</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-xs font-mono font-semibold border border-slate-200/80 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              {data.meta?.total || data.data.length} Members
            </div>
          </div>
          
          {data.data.length === 0 ? (
            <ReportEmptyState message="No utilization records found for this team." />
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">Employee Name</th>
                      <th scope="col" className="px-5 py-3.5">Employee Code</th>
                      <th scope="col" className="px-5 py-3.5 text-right">Approved</th>
                      <th scope="col" className="px-5 py-3.5 text-right">Submitted</th>
                      <th scope="col" className="px-5 py-3.5 text-right">Draft/Rejected</th>
                      <th scope="col" className="px-6 py-3.5 text-right">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map((member: any) => {
                      const approved = member.statusBreakdown?.APPROVED || 0;
                      const submitted = member.statusBreakdown?.SUBMITTED || 0;
                      const other = (member.statusBreakdown?.DRAFT || 0) + (member.statusBreakdown?.REJECTED || 0);
                      const totalHoursLogged = approved + submitted + other;
                      return (
                        <tr key={member.employeeId} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800 shadow-2xs">
                                {getInitials(member.name)}
                              </div>
                              <span className="font-semibold text-slate-900 text-xs sm:text-sm ">{member.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 font-bold text-slate-700">
                              {member.employeeCode}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right text-emerald-700 font-mono font-bold text-xs sm:text-sm">
                            {approved > 0 ? `${approved}h` : '—'}
                          </td>
                          <td className="px-5 py-4 text-right text-blue-600 font-mono font-semibold text-xs sm:text-sm">
                            {submitted > 0 ? `${submitted}h` : '—'}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-400 font-mono text-xs sm:text-sm">
                            {other > 0 ? `${other}h` : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs shadow-2xs">
                              {totalHoursLogged}h
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </ReportLayout>
  );
};



