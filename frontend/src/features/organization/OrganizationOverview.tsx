import { RefreshCw, Building, UsersRound, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useGetCurrentOrganizationQuery,
  useGetTeamsQuery,
  useGetEmployeesQuery
} from '../../store/apiSlice';

export const OrganizationOverview = () => {
  const { data: org, isLoading: orgLoading, refetch: refetchOrg } = useGetCurrentOrganizationQuery();
  const { data: teamsData, isLoading: teamsLoading, refetch: refetchTeams } = useGetTeamsQuery({ limit: 100 });
  const { data: employeesData, isLoading: empLoading, refetch: refetchEmp } = useGetEmployeesQuery({ limit: 100 });

  const loading = orgLoading || teamsLoading || empLoading;

  const handleRefresh = () => {
    refetchOrg();
    refetchTeams();
    refetchEmp();
  };

  const teams = Array.isArray(teamsData) ? teamsData : (teamsData?.data ?? []);
  const employees = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);

  const orgInitials = (org?.name || 'SW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('');

  const industryLabels: Record<string, string> = {
    TECHNOLOGY: 'Technology',
    EDUCATION: 'Education',
    HEALTHCARE: 'Healthcare / Medical',
    FINANCE: 'Finance / Banking',
    MANUFACTURING: 'Manufacturing',
    RETAIL: 'Retail',
    NGO: 'NGO / Non-Profit',
    GOVERNMENT: 'Government',
    OTHER: 'Other',
  };

  if (loading && !org) {
    return (
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div className="animate-slideUpFade bg-white/95 border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden p-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Loading organization profile…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* 1. Header with Slide-up Animation */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
            Organization Profile
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Essential organizational identity and team directory.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh organization profile"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Identity Hero Card */}
      <div className="animate-slideUpFade-d1 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-6 sm:p-7 transition-shadow duration-300 hover:shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-[14px] bg-slate-950 text-white flex items-center justify-center font-bold text-lg font-sans shadow-xs border border-slate-900 shrink-0 tracking-wider">
            {orgInitials}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
                {org?.name || 'Organization'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Tenant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80 font-sans">
                <Building className="w-3.5 h-3.5 text-slate-900" />
                {industryLabels[org?.organizationType] || org?.organizationType || 'Technology'}
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed font-normal mt-1.5 max-w-2xl font-sans">
              {org?.description || 'No organizational summary provided yet.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Departments & Teams Directory Card (Inspired by Public Holidays Table Style) */}
      <div className="animate-slideUpFade-d2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-300 hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center border border-slate-200/80 shrink-0">
              <UsersRound className="w-4 h-4 text-slate-900" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 font-sans tracking-tight">
                Departments & Functional Teams
              </h2>
              <p className="text-[11px] text-slate-500 font-medium font-sans">Organizational units and assigned supervisors</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-white border border-slate-200/80 font-sans">
            {teams.length} Teams Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider font-sans">Team / Unit</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider font-sans">Team Lead / Manager</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center font-sans">Workforce</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center font-sans">Status</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right font-sans">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.map((team: any, index: number) => {
                const manager = employees.find((e: any) => e.id === team.managerId);
                const memberCount = employees.filter((e: any) => e.teamId === team.id && e.isActive !== false).length;

                return (
                  <tr
                    key={team.id || index}
                    className="hover:bg-slate-50/60 transition-colors duration-150 group"
                  >
                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                        <span className="text-sm font-semibold text-slate-900 font-sans">
                          {team.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      {manager ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 font-sans">{manager.name}</span>
                          <span className="text-xs text-slate-500 font-sans">({manager.email})</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 font-sans">
                          Pending Assignment
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 font-sans">
                        {memberCount} Members
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50 font-sans">
                        Active
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[13px] leading-[20px] text-slate-700 border-b border-slate-100">
                      <Link
                        to="/teams"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors font-sans"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {!teams.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-slate-400 text-sm font-sans">
                    No functional teams configured yet.{' '}
                    <Link to="/teams" className="text-slate-900 font-semibold hover:underline ml-1">
                      Create a team in Teams →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
