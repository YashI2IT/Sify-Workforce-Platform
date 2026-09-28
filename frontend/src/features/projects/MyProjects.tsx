import { Link } from 'react-router-dom';
import { AlertCircle, RefreshCw, ArrowRight, CheckCircle2, Layers } from 'lucide-react';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useGetEmployeeProjectsQuery } from '../../store/apiSlice';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  isActive: boolean;
}

export const MyProjects = () => {
  const { employee, isLoading: empLoading } = useCurrentEmployee();
  const {
    data: projData,
    isLoading: projLoading,
    error: fetchError,
    refetch: fetchProjects
  } = useGetEmployeeProjectsQuery(employee?.id as string, { skip: !employee });

  const loading = empLoading || projLoading;
  const error = fetchError ? 'Failed to load projects' : '';
  const projects: Project[] = Array.isArray(projData) ? projData : (projData?.data ?? []);

  const activeProjects = projects.filter((p) => p.isActive);
  const inactiveProjects = projects.filter((p) => !p.isActive);
  const activeRate = projects.length > 0 ? Math.round((activeProjects.length / projects.length) * 100) : 0;

  const getInitials = (code: string, name: string) => {
    if (code) return code.slice(0, 3).toUpperCase();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight ">
                  My Projects
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                  {projects.length} {projects.length === 1 ? 'assigned' : 'assigned'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Initiatives and projects you are currently assigned to. Select a project to manage activities and track time.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchProjects}
            title="Refresh projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Executive Telemetry Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assigned */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Assigned Projects
            </span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : projects.length}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">initiatives</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div className="bg-slate-950 h-full rounded-full transition-all duration-500" style={{ width: '100%' }} />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">All assigned portfolio projects</p>
        </div>

        {/* Card 2: Active Initiatives */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Active Workspaces
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : activeProjects.length}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">active</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${activeRate}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Ready for time tracking</p>
        </div>

        {/* Card 3: Inactive / On Hold */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Inactive Initiatives
            </span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : inactiveProjects.length}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">archived</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-slate-300 h-full rounded-full transition-all duration-500" 
                style={{ width: `${100 - activeRate}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Completed or paused</p>
        </div>

        {/* Card 4: Vitality Ratio */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Allocation Vitality
            </span>
            <span className="text-xs font-mono font-bold text-slate-950">{activeRate}%</span>
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight ">
                {loading ? '—' : `${activeRate}%`}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">in execution</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex mt-2">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${activeRate}%` }} 
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">High project activity balance</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 space-y-3 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl">
          <LoadingSpinner size="md" />
          <p className="text-xs font-mono font-medium text-slate-500">Loading your project workspaces...</p>
        </div>
      ) : error ? (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
          <p className="font-semibold text-slate-800">Error loading projects</p>
          <p className="text-sm text-rose-600">{error}</p>
          <Button 
            onClick={fetchProjects} 
            className="mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl py-16 px-4 text-center text-slate-500 shadow-2xs">
          <svg className="w-20 h-20 mx-auto text-slate-300 mb-3" viewBox="0 0 120 120" fill="none">
            <rect x="22" y="26" width="76" height="68" rx="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M40 54H80M40 68H66" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
            <circle cx="88" cy="34" r="10" fill="#0F172A" />
            <path d="M84 34H92M88 30V38" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-base font-bold text-slate-900 ">No projects assigned yet</p>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Contact your organization administrator or project lead to be assigned to active projects.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeProjects.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Active Projects ({activeProjects.length})
                </h2>
                <span className="text-xs font-mono text-slate-400">Ready for logging</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeProjects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 hover:border-slate-400 hover:shadow-md transition-all duration-200 shadow-2xs h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-800 shadow-2xs">
                            {getInitials(p.code, p.name)}
                          </div>
                          <Badge variant={(!p.status || p.status === 'ACTIVE') ? 'default' : 'secondary'} className="font-mono">
                            {p.status || 'ACTIVE'}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-950 transition-colors line-clamp-1">
                          {p.name}
                        </h3>
                        <div className="mt-1.5">
                          <span className="inline-block font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                            {p.code}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">Workspace</span>
                        <span className="font-semibold text-slate-950 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          View details <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-950 transition-colors" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {inactiveProjects.length > 0 && (
            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Inactive / Archived Projects ({inactiveProjects.length})
                </h2>
                <span className="text-xs font-mono text-slate-400">Read only</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveProjects.map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="block group opacity-70 hover:opacity-100 transition-opacity">
                    <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-5 h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-600 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-300">
                            {getInitials(p.code, p.name)}
                          </div>
                          <Badge variant="outline" className="font-mono text-slate-600">
                            {p.status || 'INACTIVE'}
                          </Badge>
                        </div>
                        <h3 className="text-base font-bold text-slate-700 line-clamp-1">{p.name}</h3>
                        <div className="mt-1.5">
                          <span className="inline-block font-mono text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                            {p.code}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">Archived</span>
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          View details <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};




