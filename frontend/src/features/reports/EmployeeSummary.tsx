import { useState } from 'react';
import { PieChart, Clock, Calendar, Briefcase, CheckCircle2 } from 'lucide-react';
import { ReportLayout, ReportEmptyState } from './components/ReportLayout';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import {
  useGetEmployeeSummaryReportQuery,
  useGetEmployeesQuery
} from '../../store/apiSlice';
import { Select } from '../../components/ui/Select';

export const EmployeeSummary = () => {
  const { employee } = useCurrentEmployee();
  const isAdmin = employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN' || false;
  const isManager = employee?.roles?.includes('MANAGER') || employee?.role === 'MANAGER' || false;
  const canSelectOther = isAdmin || isManager;
  
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');

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

  const { data: employeesData, isLoading: employeesLoading } = useGetEmployeesQuery({ limit: 100 }, { skip: !canSelectOther });
  const employeeList = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);

  const isValidDateRange = startDate && endDate && endDate >= startDate;
  
  const queryParams: any = { startDate, endDate };
  if (canSelectOther && targetEmployeeId) {
    queryParams.targetEmployeeId = targetEmployeeId;
  } else if (!canSelectOther && employee?.id) {
    queryParams.targetEmployeeId = employee.id;
  }

  const { data: reportData, isLoading: reportLoading, error: reportError, refetch: refetchReport } = useGetEmployeeSummaryReportQuery(
    queryParams, 
    { skip: !isValidDateRange || !employee }
  );

  const loading = reportLoading || employeesLoading;
  const error = (endDate < startDate) ? 'End date cannot be before start date' : reportError ? 'Failed to fetch report' : '';
  const data = reportData || null;

  const fetchReport = () => {
    if (isValidDateRange) refetchReport();
  };

  const totalHrs = data?.totalHours || 0;
  const approvedHrs = data?.statusBreakdown?.APPROVED || 0;
  const approvalRate = totalHrs > 0 ? Math.round((approvedHrs / totalHrs) * 100) : 0;

  return (
    <ReportLayout
      title="Employee Time Summary"
      description={canSelectOther ? "View logged hours breakdown organization-wide or for a specific employee." : "View a detailed breakdown of your logged hours across projects and tasks."}
      icon={PieChart}
      loading={loading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={fetchReport}
      extraFilters={
        canSelectOther ? (
          <div className="space-y-1.5 min-w-[240px] flex-1 sm:max-w-xs">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">Employee</label>
            <Select
              value={targetEmployeeId}
              onChange={setTargetEmployeeId}
              options={[
                ...(isAdmin ? [{ value: '', label: 'All Employees (Organization-Wide)' }] : []),
                ...employeeList.map((emp: any) => ({
                  value: emp.id,
                  label: `${emp.name || (emp.firstName ? `${emp.firstName} ${emp.lastName || ''}`.trim() : emp.email)} ${emp.employeeCode || emp.code ? `(${emp.employeeCode || emp.code})` : ''}`.trim()
                }))
              ]}
            />
          </div>
        ) : undefined
      }
    >
      {!data ? (
        <ReportEmptyState message="No data to display. Adjust date range and refresh." />
      ) : (
        <div className="p-6 sm:p-7 space-y-7">
          {/* Executive Telemetry Row (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Recorded Hours */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Total Hours
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="my-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                    {totalHrs}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">hrs</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden flex mt-2">
                  <div className="bg-slate-950 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Recorded in date range</p>
            </div>

            {/* Card 2: Active Logging Days */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Days Active
                </span>
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="my-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                    {data.dailyTotals?.length || 0}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">days</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden flex mt-2">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (data.dailyTotals?.length || 0) * 5)}%` }} 
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Days with logged time</p>
            </div>

            {/* Card 3: Projects Contributed */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Projects Contributed
                </span>
                <Briefcase className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="my-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                    {data.projectBreakdown?.length || 0}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">initiatives</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden flex mt-2">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (data.projectBreakdown?.length || 0) * 20)}%` }} 
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Across all timesheet entries</p>
            </div>

            {/* Card 4: Approval Velocity */}
            <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Approval Ratio
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="my-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                    {approvalRate}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">approved</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden flex mt-2">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${approvalRate}%` }} 
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{approvedHrs}h approved by manager</p>
            </div>
          </div>

          {/* Timesheet Status Breakdown Strip */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono mb-3.5">
              Timesheet Status Breakdown
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Approved */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold font-mono text-emerald-800">Approved</span>
                </div>
                <p className="text-2xl font-bold font-mono text-emerald-700">{data.statusBreakdown?.APPROVED || 0}h</p>
              </div>

              {/* Submitted */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold font-mono text-amber-800">Submitted</span>
                </div>
                <p className="text-2xl font-bold font-mono text-amber-700">{data.statusBreakdown?.SUBMITTED || 0}h</p>
              </div>

              {/* Draft */}
              <div className="bg-slate-100/70 p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-xs font-bold font-mono text-slate-700">Draft</span>
                </div>
                <p className="text-2xl font-bold font-mono text-slate-800">{data.statusBreakdown?.DRAFT || 0}h</p>
              </div>

              {/* Rejected */}
              <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 shadow-2xs">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-xs font-bold font-mono text-rose-800">Rejected</span>
                </div>
                <p className="text-2xl font-bold font-mono text-rose-700">{data.statusBreakdown?.REJECTED || 0}h</p>
              </div>
            </div>
          </div>

          {/* Project Breakdown Ledger */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 ">Project Breakdown</h3>
              <span className="text-xs font-mono font-medium text-slate-500">
                {data.projectBreakdown?.length || 0} initiatives
              </span>
            </div>

            {data.projectBreakdown?.length === 0 ? (
              <ReportEmptyState message="No project time logged in this period." />
            ) : (
              <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                    <tr>
                      <th scope="col" className="px-6 py-4">Project Code</th>
                      <th scope="col" className="px-5 py-4">Project Name</th>
                      <th scope="col" className="px-5 py-4 text-right">Total Hours</th>
                      <th scope="col" className="px-6 py-4 text-right">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.projectBreakdown?.map((proj: any) => {
                      const percent = data.totalHours > 0 ? ((proj.hours / data.totalHours) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={proj.projectId} className="hover:bg-slate-50/70 transition-colors duration-150">
                          <td className="px-6 py-4 font-mono text-xs">
                            <span className="inline-block font-mono text-xs text-slate-700 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/80 font-medium">
                              {proj.projectId.substring(0, 8).toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-900 text-sm">
                            {proj.projectName}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="inline-flex items-center gap-1 font-bold font-mono text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs shadow-2xs">
                              {proj.hours || 0}h
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-slate-950 rounded-full transition-all duration-500" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-semibold text-slate-700 w-12 text-right">{percent}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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



