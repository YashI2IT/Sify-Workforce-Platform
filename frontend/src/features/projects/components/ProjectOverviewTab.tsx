interface ProjectOverviewTabProps {
  project: any;
  tasks: any[];
  assignedEmployees: any[];
}

export const ProjectOverviewTab = ({
  project,
  tasks,
  assignedEmployees,
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
    </div>
  );
};
