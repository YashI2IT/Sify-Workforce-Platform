import { AlertTriangle, AlertCircle } from 'lucide-react';
import { AiSummaryCard } from '@/components/AiSummaryCard';

interface ProjectOverviewTabProps {
  project: any;
  tasks: any[];
  assignedEmployees: any[];
  healthData?: any;
}

export const ProjectOverviewTab = ({
  project,
  tasks,
  assignedEmployees,
  healthData,
}: ProjectOverviewTabProps) => {
  const activeTasks = tasks.filter((t: any) => t.isActive);
  const doneTasks = tasks.filter((t: any) => t.status === 'DONE');
  const estimatedHours = tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 font-display">Project Information & Metrics</h3>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Detailed metrics and configuration parameters for {project.name}.
        </p>
      </div>

      <AiSummaryCard type="PROJECT" entityId={project.id} />

      {project.description && (
        <div className="p-4 bg-slate-50/50 border border-slate-200/80 rounded-xl shadow-2xs">
          <p className="text-[11px] font-bold text-slate-500 uppercase font-mono mb-1">Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {(project.startDate || project.endDate) && (
        <div className="flex gap-6">
          {project.startDate && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase font-mono mb-1">Start Date</p>
              <p className="text-sm font-semibold text-slate-900 font-display">
                {new Date(project.startDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {project.endDate && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase font-mono mb-1">End Date</p>
              <p className="text-sm font-semibold text-slate-900 font-display">
                {new Date(project.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase font-mono">Status</p>
          <p className="text-2xl font-extrabold text-slate-950 font-display mt-2">{project.status}</p>
        </div>
        <div className="p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase font-mono">Tasks</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-extrabold text-slate-950 font-display">{activeTasks.length}</p>
            <p className="text-xs text-slate-500 font-medium">({doneTasks.length} done)</p>
          </div>
        </div>
        <div className="p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-2xs flex flex-col justify-between">
          <p className="text-[11px] font-bold text-slate-500 uppercase font-mono">Team</p>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-slate-950 font-display">{assignedEmployees.length}</p>
            <p className="text-xs text-slate-500">Members</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl shadow-2xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase font-mono">Estimated Effort</p>
          <p className="text-2xl font-extrabold text-blue-950 font-display mt-2">
            {estimatedHours > 0 ? `${estimatedHours} hrs` : 'Not estimated'}
          </p>
        </div>
      </div>

      {/* Project Health Section */}
      {healthData && healthData.summary && (
        <div className="pt-4 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Project Intelligence</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Factual indicators derived from schedule, workload, and execution signals.
            </p>
          </div>

          <div className={`p-5 border rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-6 ${
            healthData.summary === 'At Risk' ? 'bg-red-50/50 border-red-200' :
            healthData.summary === 'Attention Needed' ? 'bg-amber-50/50 border-amber-200' :
            'bg-emerald-50/50 border-emerald-200'
          }`}>
            <div className="flex flex-col items-center justify-center shrink-0 min-w-[140px] text-center border-r border-slate-200/50 pr-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                healthData.summary === 'At Risk' ? 'bg-red-100 text-red-600' :
                healthData.summary === 'Attention Needed' ? 'bg-amber-100 text-amber-600' :
                'bg-emerald-100 text-emerald-600'
              }`}>
                {healthData.summary === 'At Risk' ? <AlertCircle className="w-6 h-6" /> :
                 healthData.summary === 'Attention Needed' ? <AlertTriangle className="w-6 h-6" /> :
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>}
              </div>
              <h4 className={`text-sm font-bold font-display ${
                healthData.summary === 'At Risk' ? 'text-red-900' :
                healthData.summary === 'Attention Needed' ? 'text-amber-900' :
                'text-emerald-900'
              }`}>
                {healthData.summary}
              </h4>
            </div>
            
            <div className="flex-1">
              <p className="text-[11px] font-bold text-slate-500 uppercase font-mono mb-3">Evidence & Signals</p>
              <ul className="space-y-2">
                {healthData.evidence.map((ev: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
