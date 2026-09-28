import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, UsersRound, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ReportLayout, ReportEmptyState } from './components/ReportLayout';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { useGetManagerDashboardReportQuery, useGetResourceAllocationReportQuery } from '../../store/apiSlice';

import { AiSummaryCard } from '../../components/AiSummaryCard';

export const ManagerDashboard = () => {
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

  const { data: reportData, isLoading, error: reportError, refetch } = useGetManagerDashboardReportQuery(
    { startDate, endDate },
    { skip: !isValidDateRange || !isManager }
  );

  const { data: workloadData, isLoading: workloadLoading, error: workloadError, refetch: refetchWorkload } = useGetResourceAllocationReportQuery(
    { startDate, endDate },
    { skip: !isValidDateRange || !isManager }
  );

  const loading = isLoading || workloadLoading;
  const error = !isManager ? 'You are not authorized to view the Manager Dashboard.' :
                (endDate < startDate) ? 'End date cannot be before start date' :
                (reportError || workloadError) ? 'Failed to fetch manager dashboard reports' : '';
  const data = reportData || null;

  const fetchReport = () => {
    if (isValidDateRange && isManager) {
      refetch();
      refetchWorkload();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <ReportLayout
      title="Manager Dashboard"
      description="Overview of your managed teams, member rosters, and timesheet approval statuses."
      icon={BarChart3}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={fetchReport}
    >
      {!data ? (
        <ReportEmptyState message="No data to display. Adjust date range and refresh." />
      ) : (
        <div className="p-6 space-y-6">
          <AiSummaryCard type="MANAGER" startDate={startDate} endDate={endDate} />

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Managed Teams</p>
                <UsersRound className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-950 font-display mt-2">
                {data.managedTeamsCount ?? (data.managedTeams?.length || 0)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Operational squads</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Team Members</p>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-950 font-display mt-2">{data.totalTeamMembers}</h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Direct reporting staff</p>
            </div>
            
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Pending Approvals</p>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-950 font-display mt-2">{data.pendingApprovalsCount || 0}</h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Awaiting review</p>
            </div>
            
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Finalized Hours</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-3xl font-extrabold text-slate-950 font-display mt-2">{data.teamWeeklyFinalizedHours || 0}h</h3>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Approved workload</p>
            </div>
          </div>

          {/* Managed Teams Details */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  Your Managed Teams
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Teams where you are assigned as operational manager.
                </p>
              </div>
              <Link
                to="/teams"
                className="text-xs font-mono font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-xl transition-colors border border-slate-200/80"
              >
                View Teams Roster <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!data.managedTeams || data.managedTeams.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <UsersRound className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-sm font-bold text-slate-800 font-display">No Teams Assigned</p>
                <p className="text-xs text-slate-400 mt-0.5">You are not currently assigned as manager for any team.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.managedTeams.map((team: any) => (
                  <div key={team.id} className="p-4 border border-slate-200/80 rounded-xl bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800 shadow-2xs">
                        {getInitials(team.name)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm font-display">{team.name}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}</p>
                      </div>
                    </div>
                    <Link
                      to="/employees"
                      className="px-3 py-1.5 text-xs font-mono font-semibold bg-white border border-slate-200/80 text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
                    >
                      Roster →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Workload & Capacity */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-display">
                  <BarChart3 className="w-4 h-4 text-slate-950" />
                  Team Workload & Capacity
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Factual breakdown of configured capacity versus actual hours logged for the selected period.
                </p>
              </div>
            </div>

            {!workloadData || workloadData.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p className="text-sm font-bold text-slate-800 font-display">No Workload Data</p>
                <p className="text-xs text-slate-400 mt-0.5">There is no team workload data available for this period.</p>
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200/80 rounded-xl shadow-2xs">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-xs uppercase font-bold text-slate-500 font-mono tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3 text-right">Period Capacity</th>
                      <th className="px-4 py-3 text-right">Active Backlog</th>
                      <th className="px-4 py-3 text-right">Deficit</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 bg-white">
                    {workloadData.map((row: any) => (
                      <tr key={row.employeeId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold font-mono text-[10px] flex items-center justify-center border border-slate-200">
                              {getInitials(row.employeeName)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 font-display">{row.employeeName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{row.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{row.availableCapacity}h</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{row.plannedDemand}h</td>
                        <td className={`px-4 py-3 text-right font-mono font-medium ${row.remainingCapacity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{row.remainingCapacity}h</td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          {row.isOverAllocated ? (
                            <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wider">Over-allocated</span>
                          ) : (
                            <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-xs uppercase tracking-wider">On track</span>
                          )}
                        </td>
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
