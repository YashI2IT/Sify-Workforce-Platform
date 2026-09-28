import { RefreshCw, Users, UsersRound, Briefcase, Building } from 'lucide-react';
import { 
  useGetCurrentOrganizationQuery,
  useGetEmployeesQuery,
  useGetTeamsQuery,
  useGetProjectsQuery
} from '../../store/apiSlice';

export const OrganizationOverview = () => {
  const { data: org, isLoading: orgLoading, refetch: refetchOrg } = useGetCurrentOrganizationQuery();
  const { data: employeesData, isLoading: empLoading, refetch: refetchEmp } = useGetEmployeesQuery({ limit: 100 });
  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams } = useGetTeamsQuery({ limit: 100 });
  const { data: projectsData, isLoading: projLoading, refetch: refetchProj } = useGetProjectsQuery();

  const loading = orgLoading || empLoading || teamsLoading || projLoading;

  const handleRefresh = () => {
    refetchOrg();
    refetchEmp();
    refetchTeams();
    refetchProj();
  };

  const employees = Array.isArray(employeesData?.data) ? employeesData.data : [];
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e: any) => e.isActive !== false).length;
  const inactiveEmployees = totalEmployees - activeEmployees;

  const teams = Array.isArray(teamsData?.data) ? teamsData.data : [];
  const totalTeams = teams.length;
  const teamsWithoutManager = teams.filter((t: any) => !t.managerId).length;

  const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);
  const totalProjects = projects.length;
  
  const projectStatusCounts = {
    ACTIVE: 0,
    IN_PROGRESS: 0,
    PLANNING: 0,
    ON_HOLD: 0,
    COMPLETED: 0
  };

  projects.forEach((p: any) => {
    if (projectStatusCounts[p.status as keyof typeof projectStatusCounts] !== undefined) {
      projectStatusCounts[p.status as keyof typeof projectStatusCounts]++;
    }
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight ">
              {org?.name || 'Organization Overview'}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Tenant
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-700 font-bold truncate">
              {org?.organizationType || 'TECHNOLOGY'}
            </span>
            {org?.description && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">{org.description}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 p-2.5 sm:px-3.5 sm:py-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-950 transition-all shadow-2xs cursor-pointer disabled:opacity-50 text-xs font-semibold font-mono"
            title="Refresh overview metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-950' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Organization Structure Snapshot */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="w-2 h-2 rounded-full bg-slate-950" />
          <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
            Structure Snapshot
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {/* Active Employees */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Employees
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                  {loading ? <span className="text-slate-300 font-mono">—</span> : activeEmployees}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">active</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {inactiveEmployees} inactive
              </p>
            </div>
          </div>

          {/* Active Teams */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Teams
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <UsersRound className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                  {loading ? <span className="text-slate-300 font-mono">—</span> : totalTeams}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">total</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${teamsWithoutManager > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                {teamsWithoutManager} without manager
              </p>
            </div>
          </div>
          
          {/* Projects Summary */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Projects
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                  {loading ? <span className="text-slate-300 font-mono">—</span> : totalProjects}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">total</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {projectStatusCounts.ACTIVE} active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Project Distribution */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
              Project Distribution
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 font-mono uppercase">Active</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {projectStatusCounts.ACTIVE}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 font-mono uppercase">In Progress</span>
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {projectStatusCounts.IN_PROGRESS}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 font-mono uppercase">Planning</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {projectStatusCounts.PLANNING}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 font-mono uppercase">On Hold</span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {projectStatusCounts.ON_HOLD}
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 font-mono uppercase">Completed</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {projectStatusCounts.COMPLETED}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

