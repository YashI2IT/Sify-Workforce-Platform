import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useGetResourceAllocationReportQuery } from '../../../store/apiSlice';
import { ReportLayout } from '../components/ReportLayout';

const ReportEmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-xs border border-slate-200/60 mb-3">
      <Briefcase className="w-5 h-5 text-slate-400" />
    </div>
    <p className="text-sm font-medium text-slate-600">{message}</p>
  </div>
);

export function ResourceAllocation() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const isValidDateRange = startDate && endDate && endDate >= startDate;

  const { data, isLoading, error: reportError, refetch } = useGetResourceAllocationReportQuery(
    { startDate, endDate },
    { skip: !isValidDateRange }
  );

  const error = (endDate < startDate) ? 'End date cannot be before start date' :
                reportError ? 'Failed to fetch resource allocation report' : '';

  const renderContent = () => {
    if (!data || data.length === 0) {
      return <ReportEmptyState message="No capacity or resource allocation data found for the selected period." />;
    }

    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Employee</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Period Capacity</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Total Active Backlog</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Capacity Deficit</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Backlog / Capacity</th>
                  <th scope="col" className="px-5 py-3.5">Key Projects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((emp: any) => (
                  <tr key={emp.employeeId} className={`hover:bg-slate-50/50 transition-colors ${emp.isOverAllocated ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900">{emp.employeeName}</div>
                        {emp.isOverAllocated && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">
                            Over-allocated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-600">
                      {emp.availableCapacity}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-600">
                      {emp.plannedDemand}
                    </td>
                    <td className={`px-5 py-4 text-right font-bold ${emp.remainingCapacity < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {emp.remainingCapacity}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col gap-1.5 items-end">
                        <span className={`font-bold ${emp.utilizationPercentage > 100 ? 'text-rose-600' : emp.utilizationPercentage > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {emp.utilizationPercentage}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${emp.utilizationPercentage > 100 ? 'bg-rose-500' : emp.utilizationPercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(emp.utilizationPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1 text-xs">
                        {emp.projectDemand.length === 0 ? (
                          <span className="text-slate-400">None</span>
                        ) : (
                          emp.projectDemand.slice(0, 2).map((p: any) => (
                            <div key={p.projectId} className="flex justify-between gap-4">
                              <span className="text-slate-700 truncate max-w-[120px]" title={p.projectName}>{p.projectName}</span>
                              <span className="text-slate-500 font-medium">{p.demand}h</span>
                            </div>
                          ))
                        )}
                        {emp.projectDemand.length > 2 && (
                          <span className="text-slate-400 italic text-[10px]">+{emp.projectDemand.length - 2} more</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ReportLayout
      title="Resource Allocation"
      description="Compares selected period capacity against total active backlog demand."
      icon={Briefcase}
      loading={isLoading}
      error={error}
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      onRefresh={() => { refetch(); }}
    >
      {renderContent()}
    </ReportLayout>
  );
}
