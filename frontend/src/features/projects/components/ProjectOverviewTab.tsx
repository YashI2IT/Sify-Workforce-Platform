import { Clock, CheckSquare, Users, Calendar, AlertCircle, AlertTriangle, Timer, TrendingUp, Unlink } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d: string | null | undefined) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface ProjectOverviewTabProps {
  project: any;
  tasks: any[];
  assignedEmployees: any[];
  activities?: any[];
  onNavigateTab?: (tab: 'overview' | 'tasks' | 'activities' | 'time' | 'employees') => void;
  healthData?: any;
}

export const ProjectOverviewTab = ({
  project,
  tasks,
  assignedEmployees,
  activities,
  healthData,
}: ProjectOverviewTabProps) => {
  const activeTasks = tasks.filter((t: any) => t.isActive !== false);
  const doneTasks = tasks.filter((t: any) => (t.status === 'DONE' || t.status === 'COMPLETED') && t.isActive !== false);
  const estimatedHours = tasks.reduce((sum: number, t: any) => sum + (Number(t.estimatedHours) || 0), 0);
  const completionRate = activeTasks.length > 0 ? Math.round((doneTasks.length / activeTasks.length) * 100) : 0;

  const isInitialSetup =
    tasks.length === 0 ||
    assignedEmployees.length === 0 ||
    (activities && activities.length === 0) ||
    healthData?.summary === 'Setup Required';

  return (
    <div className="p-6 space-y-6">
      {/* ── Section Header ────────────────────────────────────────────── */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 font-sans">Project Information & Metrics</h3>
        <p className="text-xs text-slate-500 mt-1 font-sans">
          Detailed metrics and configuration parameters for {project.name}.
        </p>
      </div>

      {/* ── Project Description (if available) ────────────────────────── */}
      {project.description && (
        <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-[14px]">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans mb-1.5">Description</p>
          <p className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">{project.description}</p>
        </div>
      )}

      {/* ── Timeline Schedule (if available) ──────────────────────────── */}
      {(project.startDate || project.endDate) && (
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 p-4 bg-slate-50/50 border border-slate-200/80 rounded-[14px]">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">Timeline:</span>
          </div>
          {project.startDate && (
            <div className="text-xs font-medium text-slate-700 font-sans">
              <span className="text-slate-400 mr-1.5">Start:</span>
              <span className="font-semibold text-slate-900">
                {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
          {project.endDate && (
            <div className="text-xs font-medium text-slate-700 font-sans">
              <span className="text-slate-400 mr-1.5">Target End:</span>
              <span className="font-semibold text-slate-900">
                {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── 4 Primary Metric Cards (Unified 4-Col Grid) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Status */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-[14px] shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Status</p>
            <span className="w-2 h-2 rounded-full bg-slate-900" />
          </div>
          <div className="my-3">
            <p className="text-2xl font-bold text-slate-900 font-sans tracking-tight">{project.status}</p>
            <p className="text-xs text-slate-500 font-medium font-sans mt-1">
              {project.isActive ? 'Active initiative' : 'Archived initiative'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 font-sans">
            Lifecycle state
          </div>
        </div>

        {/* Card 2: Tasks */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-[14px] shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Tasks</p>
            <CheckSquare className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900 font-sans tracking-tight">{activeTasks.length}</p>
              <p className="text-xs text-slate-500 font-medium font-sans">
                (<span className="font-mono font-semibold text-slate-700">{doneTasks.length}</span> done)
              </p>
            </div>
            <p className="text-xs text-slate-500 font-medium font-sans mt-1">
              {activeTasks.length > 0
                ? <><span className="font-mono font-bold text-slate-900">{completionRate}%</span> completion rate</>
                : 'No active tasks yet'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 font-sans">
            Task execution
          </div>
        </div>

        {/* Card 3: Team */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-[14px] shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Team</p>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-slate-900 font-sans tracking-tight">{assignedEmployees.length}</p>
              <p className="text-xs text-slate-500 font-medium font-sans">
                {assignedEmployees.length === 1 ? 'member' : 'members'}
              </p>
            </div>
            <p className="text-xs text-slate-500 font-medium font-sans mt-1">
              {assignedEmployees.length > 0 ? 'Assigned contributors' : 'No members assigned'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 font-sans">
            Resource staffing
          </div>
        </div>

        {/* Card 4: Estimated Effort */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-[14px] shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">Estimated Effort</p>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-3">
            <p className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
              {estimatedHours > 0 ? (
                <>
                  <span className="font-mono">{estimatedHours}</span> <span className="text-base font-medium text-slate-600 font-sans">hrs</span>
                </>
              ) : 'Not estimated'}
            </p>
            <p className="text-xs text-slate-500 font-medium font-sans mt-1">
              {estimatedHours > 0 ? 'Total planned work' : 'No estimates logged'}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-400 font-sans">
            Capacity demand
          </div>
        </div>
      </div>

      {/* ── Project Intelligence (Health Section) ─────────────────────── */}
      <div className="pt-2 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 font-sans">Project Intelligence</h3>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Factual indicators derived from schedule, workload, and execution signals.
          </p>
        </div>

        <div className="p-5 bg-white border border-slate-200/80 rounded-[14px] shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-sans">
              Evidence & Signals
            </p>
            {!isInitialSetup && healthData?.summary && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-sans ${
                healthData.summary === 'At Risk'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                  : healthData.summary === 'Attention Needed'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  healthData.summary === 'At Risk'
                    ? 'bg-rose-500'
                    : healthData.summary === 'Attention Needed'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`} />
                {healthData.summary}
              </span>
            )}
          </div>

          <div className="space-y-5">
            {isInitialSetup ? (
              /* ── Empty / Setup project ─────────────────────────────── */
              <ul className="space-y-2.5">
                {tasks.length === 0 && (
                  <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                    <span>No tasks created yet — define project tasks, deadlines, and milestone deliverables.</span>
                  </li>
                )}
                {assignedEmployees.length === 0 && (
                  <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                    <span>No team members assigned — assign personnel to staff this project.</span>
                  </li>
                )}
                {(!activities || activities.length === 0) && (
                  <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                    <span>No activities configured — add activities to enable timesheet hour logging.</span>
                  </li>
                )}
                {tasks.length > 0 && estimatedHours === 0 && (
                  <li className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                    <span>No effort estimates logged — set estimated hours on tasks for workload forecasting.</span>
                  </li>
                )}
              </ul>
            ) : healthData?.signals ? (
              /* ── Configured project with rich signals ──────────────── */
              (() => {
                const sched = healthData.signals.schedule || {};
                const wl    = healthData.signals.workload  || {};
                const exec  = healthData.signals.execution || {};

                const overdue       = sched.overdueTasks           || [];
                const blocked       = exec.blockedTasks             || [];
                const depBlocked    = exec.dependencyBlockedTasks   || [];
                const dueSoon       = sched.dueSoonTasks            || [];
                const pastEnd       = sched.pastProjectEndTasks     || [];
                const endExposure   = sched.endOfProjectExposureTasks || [];
                const exceedEst     = exec.tasksExceedingEstimate   || [];
                const overalloc     = wl.overallocatedEmployees     || [];
                const rejectedHours = exec.timesheetStatusHours?.REJECTED || 0;
                const unassignedHrs = wl.unassignedHours            || 0;

                const hasAny = overdue.length + blocked.length + depBlocked.length +
                  dueSoon.length + pastEnd.length + endExposure.length +
                  exceedEst.length + overalloc.length + rejectedHours + unassignedHrs > 0;

                if (!hasAny) {
                  return (
                    <p className="text-xs sm:text-sm text-emerald-700 font-medium font-sans">
                      ✓ All schedule, workload, and execution signals are healthy.
                    </p>
                  );
                }

                /* ── reusable task-rows sub-component ── */
                const TaskRows = ({ items, dateLabel = 'Due' }: { items: any[]; dateLabel?: string }) => (
                  <div className="mt-2 rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs font-sans">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Task</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">{dateLabel} Date</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Est.</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Actual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {items.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3 py-2 text-slate-800 font-medium truncate max-w-[220px]">
                              <div className="flex items-center gap-2">
                                {t.ticketId && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200/80 shrink-0 shadow-2xs">
                                    {t.ticketId}
                                  </span>
                                )}
                                <span className="truncate">{t.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap font-sans">
                              {fmtDate(t.dueDate) ?? <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {t.estimatedHours ? `${t.estimatedHours}h` : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap font-mono text-[11px] font-medium">
                              {t.actualHours
                                ? <span className={t.actualHours > (t.estimatedHours || Infinity) ? 'text-rose-600 font-bold' : 'text-slate-700'}>{t.actualHours}h</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );

                return (
                  <>
                    {/* ── Overdue Tasks ─────────────────────── */}
                    {overdue.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <p className="text-xs font-semibold text-rose-700 font-sans">
                            {overdue.length} task{overdue.length > 1 ? 's' : ''} past due
                          </p>
                        </div>
                        <TaskRows items={overdue} />
                      </div>
                    )}

                    {/* ── Blocked Tasks ─────────────────────── */}
                    {blocked.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <p className="text-xs font-semibold text-amber-700 font-sans">
                            {blocked.length} task{blocked.length > 1 ? 's' : ''} marked as blocked
                          </p>
                        </div>
                        <TaskRows items={blocked} />
                      </div>
                    )}

                    {/* ── Dependency-Blocked Tasks ──────────── */}
                    {depBlocked.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Unlink className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <p className="text-xs font-semibold text-amber-700 font-sans">
                            {depBlocked.length} task{depBlocked.length > 1 ? 's' : ''} with incomplete predecessors
                          </p>
                        </div>
                        <TaskRows items={depBlocked} />
                      </div>
                    )}

                    {/* ── Past Project End Date ─────────────── */}
                    {pastEnd.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <p className="text-xs font-semibold text-rose-600 font-sans">
                            {pastEnd.length} task{pastEnd.length > 1 ? 's' : ''} due after project end date
                          </p>
                        </div>
                        <TaskRows items={pastEnd} />
                      </div>
                    )}

                    {/* ── Due Soon ──────────────────────────── */}
                    {dueSoon.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <p className="text-xs font-semibold text-amber-600 font-sans">
                            {dueSoon.length} task{dueSoon.length > 1 ? 's' : ''} due within the next 7 days
                          </p>
                        </div>
                        <TaskRows items={dueSoon} dateLabel="Due" />
                      </div>
                    )}

                    {/* ── Approaching End Date ──────────────── */}
                    {endExposure.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <p className="text-xs font-semibold text-amber-600 font-sans">
                            {endExposure.length} unfinished task{endExposure.length > 1 ? 's' : ''} approaching project end date
                          </p>
                        </div>
                        <TaskRows items={endExposure} dateLabel="Due" />
                      </div>
                    )}

                    {/* ── Exceeding Estimates ───────────────── */}
                    {exceedEst.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                          <p className="text-xs font-semibold text-violet-700 font-sans">
                            {exceedEst.length} task{exceedEst.length > 1 ? 's' : ''} with actual hours exceeding estimates
                          </p>
                        </div>
                        <TaskRows items={exceedEst} />
                      </div>
                    )}

                    {/* ── Over-Allocated Employees ──────────── */}
                    {overalloc.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <p className="text-xs font-semibold text-rose-600 font-sans">
                            {overalloc.length} assigned employee{overalloc.length > 1 ? 's' : ''} over-allocated during project window
                          </p>
                        </div>
                        <div className="mt-2 rounded-xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-xs font-sans">
                            <thead className="bg-slate-50 border-b border-slate-100">
                              <tr>
                                <th className="text-left px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Employee</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Capacity</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Demand</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {overalloc.map((emp: any) => (
                                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-3 py-2 text-slate-800 font-medium">{emp.name}</td>
                                  <td className="px-3 py-2 text-right text-slate-600 font-mono text-xs">{emp.capacity}h</td>
                                  <td className="px-3 py-2 text-right font-bold text-rose-600 font-mono text-xs">{emp.demand}h</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* ── Unassigned Work ───────────────────── */}
                    {unassignedHrs > 0 && (
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                        <span>{unassignedHrs}h of estimated work is currently unassigned across tasks.</span>
                      </div>
                    )}

                    {/* ── Rejected Timesheet Hours ─────────── */}
                    {rejectedHours > 0 && (
                      <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                        <span>{rejectedHours}h of logged work is in REJECTED status and needs resubmission.</span>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 font-sans">
                All schedule, workload, and execution signals are healthy.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
