import { RefreshCw, Building, UsersRound, ChevronRight, SlidersHorizontal, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useGetCurrentOrganizationQuery,
  useGetTeamsQuery,
  useGetEmployeesQuery,
} from '../../store/apiSlice';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';

export const OrganizationOverview = () => {
  const { employee } = useCurrentEmployee();
  const isAdmin = employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN';

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
      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 font-sans">
        <div className="animate-slideUpFade bg-white border border-slate-200/80 shadow-xs rounded-[14px] p-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-[#0B1738] rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading company information…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 font-sans">
      {/* 1. Header */}
      <div className="animate-slideUpFade flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-[#0B1738] tracking-tight">
            Company Information
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            Company details and team directory.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <>
              <Link
                to="/organization/profile"
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20"
                title="Edit Company"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Company</span>
              </Link>
              <Link
                to="/organization/settings"
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-[#0B1738] hover:bg-slate-800 text-white rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20"
                title="Company Settings"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
                <span>Settings</span>
              </Link>
            </>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B1738]/20"
            title="Refresh company information"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-500 ${
                loading ? 'animate-spin text-[#0B1738]' : ''
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Company Summary Card */}
      <div className="animate-slideUpFade-d1 bg-white border border-slate-200/80 shadow-xs rounded-[14px] p-6 transition-shadow duration-200 hover:shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#0B1738] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0 tracking-wider">
            {orgInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B1738] tracking-tight">
                {org?.name || 'Company'}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#0B1738] border border-slate-200/80">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                {industryLabels[org?.organizationType] || org?.organizationType || 'Technology'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mt-1.5 max-w-3xl">
              {org?.description || 'No company description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Team Directory Card */}
      <div className="animate-slideUpFade-d2 bg-white border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden transition-shadow duration-200 hover:shadow-sm">
        {/* Section Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-[#F7F8FA] flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0B1738] text-white flex items-center justify-center shadow-2xs shrink-0">
              <UsersRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B1738] tracking-tight">
                Teams
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Team leads and members.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-700 px-3 py-1 rounded-full bg-white border border-slate-200/80 shadow-2xs">
            {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
          </span>
        </div>

        {/* Teams Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">Team Lead</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">Members</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
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
                    <td className="px-6 py-3.5 text-[13px] leading-[20px] text-slate-700">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#0B1738] shrink-0" />
                        <span className="text-sm font-semibold text-[#0B1738]">
                          {team.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-[13px] leading-[20px] text-slate-700">
                      {manager ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{manager.name}</span>
                          <span className="text-xs text-slate-500">({manager.email})</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-3.5 text-[13px] leading-[20px] text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#0B1738] border border-slate-200/80">
                        {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-[13px] leading-[20px] text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        Active
                      </span>
                    </td>

                    <td className="px-6 py-3.5 text-[13px] leading-[20px] text-right">
                      <Link
                        to="/teams"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#0B1738] transition-colors"
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
                  <td colSpan={5} className="px-6 py-14 text-center text-slate-500 text-xs">
                    No teams configured yet.{' '}
                    <Link to="/teams" className="text-[#0B1738] font-semibold hover:underline ml-1">
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
