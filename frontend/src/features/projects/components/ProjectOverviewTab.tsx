import { AlertTriangle, AlertCircle, Clock, TrendingUp } from 'lucide-react';

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
      {healthData && (
        <div className="pt-4 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Project Health</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Live factual indicators based on current tasks and time entries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {healthData.overdueTasksCount > 0 && (
              <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl shadow-2xs flex gap-4 items-start">
                <div className="mt-0.5 p-2 bg-red-100 text-red-600 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900">Overdue Tasks ({healthData.overdueTasksCount})</p>
                  <p className="text-xs text-red-700 mt-1">
                    Tasks that have passed their due date and are not yet completed.
                  </p>
                </div>
              </div>
            )}

            {healthData.blockedTasksCount > 0 && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl shadow-2xs flex gap-4 items-start">
                <div className="mt-0.5 p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900">Blocked Tasks ({healthData.blockedTasksCount})</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Tasks explicitly marked as BLOCKED by the team.
                  </p>
                </div>
              </div>
            )}

            {healthData.dueSoonTasksCount > 0 && (
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl shadow-2xs flex gap-4 items-start">
                <div className="mt-0.5 p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900">Due Soon ({healthData.dueSoonTasksCount})</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Incomplete work with due dates within the next 3 days.
                  </p>
                </div>
              </div>
            )}

            {healthData.tasksExceedingEstimateCount > 0 && (
              <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl shadow-2xs flex gap-4 items-start">
                <div className="mt-0.5 p-2 bg-purple-100 text-purple-600 rounded-lg">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-purple-900">Exceeding Estimates ({healthData.tasksExceedingEstimateCount})</p>
                  <p className="text-xs text-purple-700 mt-1">
                    Tasks where actual logged hours exceed the estimated hours.
                  </p>
                </div>
              </div>
            )}
            
            {healthData.overdueTasksCount === 0 && healthData.blockedTasksCount === 0 && healthData.dueSoonTasksCount === 0 && healthData.tasksExceedingEstimateCount === 0 && (
              <div className="col-span-full p-6 border border-dashed border-emerald-200 bg-emerald-50/50 rounded-xl flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-emerald-900">Project is Healthy</h4>
                <p className="text-xs text-emerald-700 mt-1 max-w-sm">
                  There are no overdue, blocked, due soon, or over-budget tasks detected.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
