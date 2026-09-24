import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, FileText, CheckCircle2, TrendingUp, AlertCircle, 
  ArrowRight, Users, UsersRound, Building, CalendarDays, 
  ArrowUpRight, RefreshCw, Copy, ChevronRight, Plus,
  UserPlus, Mail, Briefcase
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDateRange, getThisMonday, getTodayString } from '../../utils/date';
import { getStatusBadgeClass } from '../../utils/status';

interface AdminDashboardViewProps {
  employee: any;
  orgSummary: any;
  loading: boolean;
  fetchDashboardData: () => void;
  activeEmployees: number;
  inactiveEmployees: number;
  totalEmployees: number;
  totalTeams: number;
  teamsWithoutManager: number;
  activeProjectsCount: number;
  projectsData: any[];
  projectStatusCounts: {
    ACTIVE: number;
    IN_PROGRESS: number;
    PLANNING: number;
    ON_HOLD: number;
    COMPLETED: number;
  };
  pendingInvitationsCount: number;
  pendingApprovalsCount: number;
  overdueTasksCount: number;
  pendingActionsCount: number;
  getGreeting: () => string;
  dashboardError?: string | null;
}

const AdminDashboardView = ({
  employee,
  orgSummary,
  loading,
  fetchDashboardData,
  activeEmployees,
  inactiveEmployees,
  totalEmployees,
  totalTeams,
  teamsWithoutManager,
  activeProjectsCount,
  projectsData,
  projectStatusCounts,
  pendingInvitationsCount,
  pendingApprovalsCount,
  overdueTasksCount,
  pendingActionsCount,
  getGreeting,
  dashboardError,
}: AdminDashboardViewProps) => {
  return (
    <div className="space-y-7">
      {dashboardError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{dashboardError}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="text-amber-900 font-semibold hover:underline cursor-pointer ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
              Admin Dashboard
            </h1>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-slate-900 text-white font-mono shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ADMIN
              </span>
              {employee?.roles?.filter((r: string) => r !== 'ADMIN').map((role: string) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-800 border border-slate-200/90 font-mono"
                >
                  {role}
                </span>
              ))}
            </div>

            <span className="text-xs text-slate-400 font-mono hidden sm:inline">•</span>
            <span className="text-xs text-slate-500 font-mono">
              {getGreeting()}, {employee?.name?.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
            <Building className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-950 font-bold font-display truncate">
              {orgSummary?.name || 'Sify Workforce Platform'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">Executive Control Center</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center gap-2 p-2.5 sm:px-3.5 sm:py-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-950 transition-all shadow-2xs cursor-pointer disabled:opacity-50 text-xs font-semibold font-mono"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-950' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

          <Link
            to="/employees"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer font-mono"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-600" />
            <span>Invite Employee</span>
          </Link>
          <Link
            to="/teams"
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer font-mono"
          >
            <UsersRound className="w-3.5 h-3.5 text-slate-600" />
            <span>Create Team</span>
          </Link>
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer font-mono"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Project</span>
          </Link>
        </div>
      </div>

      {/* 2. Organization Snapshot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-950" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Organization Snapshot
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Real-time operational telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Active Employees */}
          <Link
            to="/employees"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Active Employees
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? <span className="text-slate-300 font-mono">—</span> : activeEmployees}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">members</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {inactiveEmployees > 0 ? `${inactiveEmployees} inactive records` : 'Active organizational members'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium group-hover:text-slate-900">
              <span>Directory</span>
              <span className="font-semibold text-slate-800">Manage Roster →</span>
            </div>
          </Link>

          {/* Active Teams */}
          <Link
            to="/teams"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Active Teams
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                <UsersRound className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? <span className="text-slate-300 font-mono">—</span> : totalTeams}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">teams</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {teamsWithoutManager > 0 ? `${teamsWithoutManager} without manager` : 'Functional team structures'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium group-hover:text-slate-900">
              <span>Structures</span>
              <span className="font-semibold text-slate-800">Manage Teams →</span>
            </div>
          </Link>

          {/* Active Projects */}
          <Link
            to="/admin/projects"
            className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                Active Projects
              </span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                  {loading ? <span className="text-slate-300 font-mono">—</span> : activeProjectsCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">initiatives</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                {projectStatusCounts.COMPLETED > 0 ? `${projectStatusCounts.COMPLETED} completed` : 'Current operations'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium group-hover:text-slate-900">
              <span>Portfolio</span>
              <span className="font-semibold text-slate-800">Projects List →</span>
            </div>
          </Link>

          {/* Pending Actions */}
          <div
            className={`p-5 rounded-2xl border shadow-2xs transition-all flex flex-col justify-between ${
              !loading && pendingActionsCount > 0
                ? 'bg-amber-50/40 border-amber-200/90'
                : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
                !loading && pendingActionsCount > 0 ? 'text-amber-800' : 'text-slate-500'
              }`}>
                Pending Actions
              </span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                !loading && pendingActionsCount > 0
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {!loading && pendingActionsCount > 0 ? (
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold tracking-tight font-display ${
                  !loading && pendingActionsCount > 0 ? 'text-amber-950' : 'text-slate-950'
                }`}>
                  {loading ? <span className="text-slate-300 font-mono">—</span> : pendingActionsCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">unresolved</span>
              </div>
              <p className={`text-[11px] font-medium mt-1 ${
                !loading && pendingActionsCount > 0 ? 'text-amber-800' : 'text-slate-500'
              }`}>
                {!loading && pendingActionsCount > 0
                  ? 'Requires administrative attention'
                  : 'Operational workflow up to date'}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Operational backlog</span>
              <span className="font-semibold text-slate-800">See Below ↓</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. NEEDS ATTENTION */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
              Needs Attention
            </h2>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
            {pendingActionsCount} Action Item{pendingActionsCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* A. Pending Invitations */}
          <Link
            to="/employees"
            className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Pending Invitations
                </span>
                <Mail className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold font-display ${
                  pendingInvitationsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}>
                  {loading ? '—' : pendingInvitationsCount}
                </span>
                <span className="text-[11px] font-mono text-slate-400">invites</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pendingInvitationsCount > 0 ? 'Candidates awaiting acceptance' : 'No pending employee invites'}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover:text-slate-900">
              <span>Employees</span>
              <span className="font-semibold flex items-center gap-1 font-mono text-[11px]">
                Review <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>

          {/* B. Teams Without Manager */}
          <Link
            to="/teams"
            className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Teams Without Manager
                </span>
                <UsersRound className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold font-display ${
                  teamsWithoutManager > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}>
                  {loading ? '—' : teamsWithoutManager}
                </span>
                <span className="text-[11px] font-mono text-slate-400">squads</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {teamsWithoutManager > 0 ? 'Leadership unassigned' : 'All teams have assigned managers'}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover:text-slate-900">
              <span>Teams</span>
              <span className="font-semibold flex items-center gap-1 font-mono text-[11px]">
                Assign <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>

          {/* C. Pending Timesheet Approvals */}
          <Link
            to="/approvals"
            className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold font-display ${
                  pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}>
                  {loading ? '—' : pendingApprovalsCount}
                </span>
                <span className="text-[11px] font-mono text-slate-400">timesheets</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pendingApprovalsCount > 0 ? 'Submitted cycles awaiting review' : 'No timesheets pending review'}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover:text-slate-900">
              <span>Approvals Queue</span>
              <span className="font-semibold flex items-center gap-1 font-mono text-[11px]">
                Open <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>

          {/* D. Overdue Project Work */}
          <Link
            to="/admin/projects"
            className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Overdue Project Work
                </span>
                <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold font-display ${
                  overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}>
                  {loading ? '—' : overdueTasksCount}
                </span>
                <span className="text-[11px] font-mono text-slate-400">tasks</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {overdueTasksCount > 0 ? 'Active tasks past deadline' : 'No active tasks overdue'}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover:text-slate-900">
              <span>Project Workspaces</span>
              <span className="font-semibold flex items-center gap-1 font-mono text-[11px]">
                View <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. WORKFORCE & PROJECT HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
        {/* Workforce Status: 5 Columns */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-950" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                Workforce Status
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              Total: {totalEmployees}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active Employees
                </span>
                <span className="font-bold text-slate-900">
                  {activeEmployees} ({totalEmployees > 0 ? Math.round((activeEmployees / totalEmployees) * 100) : 100}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalEmployees > 0 ? (activeEmployees / totalEmployees) * 100 : 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Inactive Employees
                </span>
                <span className="font-bold text-slate-900">
                  {inactiveEmployees} ({totalEmployees > 0 ? Math.round((inactiveEmployees / totalEmployees) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${totalEmployees > 0 ? (inactiveEmployees / totalEmployees) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Project Status: 7 Columns */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                Project Status
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
              Portfolio: {projectsData.length} Initiatives
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 font-mono uppercase">Active</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-display mt-1 block">
                {projectStatusCounts.ACTIVE}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Live execution</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 font-mono uppercase">In Progress</span>
                <span className="w-2 h-2 rounded-full bg-blue-600" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-display mt-1 block">
                {projectStatusCounts.IN_PROGRESS}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Sprint underway</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 font-mono uppercase">Planning</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-display mt-1 block">
                {projectStatusCounts.PLANNING}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Scoping & backlog</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 font-mono uppercase">On Hold</span>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-display mt-1 block">
                {projectStatusCounts.ON_HOLD}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Paused initiatives</span>
            </div>

            <div className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-800 font-mono uppercase">Completed</span>
                <span className="w-2 h-2 rounded-full bg-purple-500" />
              </div>
              <span className="text-2xl font-extrabold text-slate-900 font-display mt-1 block">
                {projectStatusCounts.COMPLETED}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Delivered projects</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. RECENT ACTIVITY */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-slate-950" />
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
              Recent Activity
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            Organization Audit Stream
          </span>
        </div>

        <div className="py-12 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200/80">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 font-display">
            Organization activity will appear here once system activity tracking is enabled.
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            System-wide operational audit ledger and event streaming will automatically populate security, workforce, and governance actions as they occur.
          </p>
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const { employee, isLoading: empLoading, error: empError } = useCurrentEmployee();
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [currentTimesheetStatus, setCurrentTimesheetStatus] = useState<string | null>(null);
  const [recentTimesheets, setRecentTimesheets] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [dailyHoursMap, setDailyHoursMap] = useState<Record<string, number>>({});
  
  // Admin Dashboard State
  const [orgSummary, setOrgSummary] = useState<any>(null);
  const [employeesData, setEmployeesData] = useState<any>(null);
  const [teamsData, setTeamsData] = useState<any>(null);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [invitationsData, setInvitationsData] = useState<any[]>([]);
  const [overdueTasksCount, setOverdueTasksCount] = useState<number>(0);
  const [empCount, setEmpCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const roleAdmin = Boolean(employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN');
  const roleManager = Boolean(employee?.roles?.includes('MANAGER') || employee?.role === 'MANAGER');
  const roleEmployee = Boolean(employee?.roles?.includes('EMPLOYEE') || employee?.role === 'EMPLOYEE');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Generate 7 days for current week (Mon-Sun)
  const weekDays = useMemo(() => {
    const mondayStr = getThisMonday();
    const monday = new Date(mondayStr + 'T00:00:00');
    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayStr = getTodayString();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayDate = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dayDate}`;
      
      days.push({
        dateStr,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const promises: Promise<any>[] = [];
      
      if (roleEmployee) {
        promises.push(
          apiClient(`/employees/${employee.id}/projects`),
          apiClient(`/timesheets/my-timesheets`),
          apiClient(`/employees/${employee.id}/time-entries?limit=100`)
        );
      } else {
        promises.push(Promise.resolve([]), Promise.resolve([]), Promise.resolve([]));
      }

      if (roleManager) {
        promises.push(apiClient(`/timesheets/approvals`));
      } else {
        promises.push(Promise.resolve([]));
      }

      if (roleAdmin) {
        promises.push(
          apiClient(`/organizations/current`),
          apiClient(`/employees?limit=100`),
          apiClient(`/teams?limit=100`),
          apiClient(`/projects`),
          apiClient(`/employee-invitations`),
          apiClient(`/timesheets/approvals`)
        );
      } else {
        promises.push(
          Promise.resolve(null), 
          Promise.resolve(null), 
          Promise.resolve(null),
          Promise.resolve([]),
          Promise.resolve([]),
          Promise.resolve([])
        );
      }

      const results = await Promise.allSettled(promises);
      
      let hasPartialError = false;
      const extract = (index: number, defaultValue: any) => {
        const res = results[index];
        if (res.status === 'fulfilled') {
          return res.value;
        } else {
          hasPartialError = true;
          return defaultValue;
        }
      };

      const projects = extract(0, []);
      const timesheets = extract(1, []);
      const entries = extract(2, []);
      const approvals = extract(3, []);
      const org = extract(4, null);
      const employeesList = extract(5, null);
      const teamsList = extract(6, null);
      const projectsList = extract(7, []);
      const invitationsList = extract(8, []);
      const approvalsList = extract(9, []);

      if (hasPartialError) {
        setDashboardError("Some dashboard metrics could not be loaded. Please refresh.");
      } else {
        setDashboardError(null);
      }

      if (roleEmployee) {
        const projectArr = Array.isArray(projects) ? projects : (projects?.data ?? []);
        const tsArr: any[] = Array.isArray(timesheets) ? timesheets : (timesheets?.data ?? []);
        const entryArr: any[] = Array.isArray(entries) ? entries : (entries?.data ?? []);
        
        const thisWeekStart = getThisMonday();
        const todayStr = getTodayString();
        const monDate = new Date(thisWeekStart + 'T00:00:00');
        const sunDate = new Date(monDate);
        sunDate.setDate(sunDate.getDate() + 6);
        const yEnd = sunDate.getFullYear();
        const mEnd = String(sunDate.getMonth() + 1).padStart(2, '0');
        const dEnd = String(sunDate.getDate()).padStart(2, '0');
        const thisWeekEnd = `${yEnd}-${mEnd}-${dEnd}`;
        
        let wHours = 0;
        let tHours = 0;
        const dMap: Record<string, number> = {};

        entryArr.forEach((e: any) => {
          const h = Number(e.hours) || 0;
          if (e.date >= thisWeekStart && e.date <= thisWeekEnd) {
            wHours += h;
            dMap[e.date] = (dMap[e.date] || 0) + h;
          }
          if (e.date === todayStr) {
            tHours += h;
          }
        });
        
        setWeeklyHours(wHours);
        setTodayHours(tHours);
        setDailyHoursMap(dMap);
        
        const currentTs = tsArr.find((ts: any) => {
          if (!ts?.startDate) return false;
          const tsDateStr = typeof ts.startDate === 'string' ? ts.startDate.slice(0, 10) : new Date(ts.startDate).toISOString().slice(0, 10);
          return tsDateStr === thisWeekStart;
        });
        setCurrentTimesheetStatus(currentTs ? currentTs.status : 'NOT CREATED');
        
        setRecentTimesheets(tsArr.slice(0, 4));
        
        const entriesWithProjects = entryArr.slice(0, 5).map((e: any) => {
          const p = projectArr.find((p: any) => p.id === e.projectId);
          return { ...e, projectName: p?.name || 'General Project' };
        });
        setRecentEntries(entriesWithProjects);
      }

      if (roleManager) {
        const appArr = Array.isArray(approvals) ? approvals : (approvals?.data ?? []);
        setApprovalsCount(appArr.length);
      }

      if (roleAdmin) {
        setOrgSummary(org);
        setEmployeesData(employeesList);
        setEmpCount(employeesList?.meta?.total || (Array.isArray(employeesList) ? employeesList.length : 0));
        setTeamsData(teamsList);
        setTeamCount(teamsList?.meta?.total || (Array.isArray(teamsList) ? teamsList.length : 0));

        const pList = Array.isArray(projectsList) ? projectsList : (projectsList?.data ?? []);
        setProjectsData(pList);

        const iList = Array.isArray(invitationsList) ? invitationsList : (invitationsList?.data ?? []);
        setInvitationsData(iList);

        const aList = Array.isArray(approvalsList) ? approvalsList : (approvalsList?.data ?? []);
        const aCount = approvalsList?.meta?.total !== undefined ? approvalsList.meta.total : aList.length;
        setApprovalsCount(aCount);

        // Derive real overdue active tasks across active projects
        const activeProjects = pList.filter((p: any) => p.isActive !== false && p.status !== 'COMPLETED');
        let overdueCount = 0;
        if (activeProjects.length > 0) {
          try {
            const taskResponses = await Promise.allSettled(
              activeProjects.map((p: any) => apiClient(`/projects/${p.id}/tasks`).catch(() => []))
            );
            const nowMs = Date.now();
            taskResponses.forEach((res) => {
              if (res.status === 'fulfilled') {
                const tasks = Array.isArray(res.value) ? res.value : (res.value?.data ?? []);
                tasks.forEach((t: any) => {
                  if (t.dueDate && t.status !== 'DONE' && t.status !== 'COMPLETED' && t.isActive !== false) {
                    if (new Date(t.dueDate).getTime() < nowMs) {
                      overdueCount++;
                    }
                  }
                });
              }
            });
          } catch {
            // graceful fallback
          }
        }
        setOverdueTasksCount(overdueCount);
      }

    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  }, [employee, roleAdmin, roleEmployee, roleManager]);

  useEffect(() => {
    if (empLoading || !employee) return;
    fetchDashboardData();
  }, [employee, empLoading, fetchDashboardData]);

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return formatDateRange(start, end);
  };

  // Sparkline coordinates for Weekly Card
  const sparklinePoints = useMemo(() => {
    const values = weekDays.map((d) => dailyHoursMap[d.dateStr] || 0);
    const maxVal = Math.max(8, ...values);
    return values.map((val, idx) => {
      const x = (idx / 6) * 80;
      const y = 24 - (val / maxVal) * 20;
      return `${x},${y}`;
    }).join(' ');
  }, [weekDays, dailyHoursMap]);

  if (!employee && !empLoading) {
    if (empError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-display">Connection Interrupted</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
            {empError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium transition-all shadow-xs cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4 border border-slate-200">
          <UsersRound className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 font-display">No User Profile Selected</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
          Please select an authenticated employee context to access your operational dashboard.
        </p>
      </div>
    );
  }

  const weeklyPacePct = Math.min(100, Math.round((weeklyHours / 40) * 100));
  const dailyTargetPct = Math.min(100, Math.round((todayHours / 8) * 100));
  const circleCircumference = 2 * Math.PI * 16; // radius 16 -> ~100.5
  const circleOffset = circleCircumference - (circleCircumference * (dailyTargetPct / 100));

  const employeeList = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);
  const totalEmployees = employeesData?.meta?.total ?? (employeeList.length > 0 ? employeeList.length : empCount);
  const activeEmployees = employeeList.length > 0 ? employeeList.filter((e: any) => e.isActive !== false).length : totalEmployees;
  const inactiveEmployees = Math.max(0, totalEmployees - activeEmployees);
  const teamList = Array.isArray(teamsData) ? teamsData : (teamsData?.data ?? []);
  const totalTeams = teamsData?.meta?.total ?? (teamList.length > 0 ? teamList.length : teamCount);
  const teamsWithoutManager = teamList.filter((t: any) => !t.managerId).length;
  const activeProjectsCount = projectsData.filter((p: any) => p.isActive !== false).length;
  const projectStatusCounts = {
    ACTIVE: projectsData.filter((p: any) => p.status === 'ACTIVE').length,
    IN_PROGRESS: projectsData.filter((p: any) => p.status === 'IN_PROGRESS').length,
    PLANNING: projectsData.filter((p: any) => p.status === 'PLANNING').length,
    ON_HOLD: projectsData.filter((p: any) => p.status === 'ON_HOLD').length,
    COMPLETED: projectsData.filter((p: any) => p.status === 'COMPLETED').length,
  };
  const pendingInvitationsCount = invitationsData.length;
  const pendingApprovalsCount = approvalsCount;
  const pendingActionsCount = pendingInvitationsCount + teamsWithoutManager + pendingApprovalsCount + overdueTasksCount;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7 pb-20 animate-fadeIn">
      {roleAdmin ? (
        <AdminDashboardView
          employee={employee}
          orgSummary={orgSummary}
          loading={loading}
          dashboardError={dashboardError}
          fetchDashboardData={fetchDashboardData}
          activeEmployees={activeEmployees}
          inactiveEmployees={inactiveEmployees}
          totalEmployees={totalEmployees}
          totalTeams={totalTeams}
          teamsWithoutManager={teamsWithoutManager}
          activeProjectsCount={activeProjectsCount}
          projectsData={projectsData}
          projectStatusCounts={projectStatusCounts}
          pendingInvitationsCount={pendingInvitationsCount}
          pendingApprovalsCount={pendingApprovalsCount}
          overdueTasksCount={overdueTasksCount}
          pendingActionsCount={pendingActionsCount}
          getGreeting={getGreeting}
        />
      ) : (
        <>
          {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
              {getGreeting()}, {employee?.name?.split(' ')[0]}
            </h1>
            
            {/* Architectural Role Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {employee?.roles?.map((role: string) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-800 border border-slate-200/90 font-mono"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                  {role}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Workforce operations, logged hours velocity, and timesheet review workflow.
          </p>
        </div>

        {/* Action Dock */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-semibold text-slate-700 font-mono">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={() => fetchDashboardData()}
            className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-950 transition-all shadow-2xs cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-950' : ''}`} />
          </button>

          {roleEmployee && (
            <Link
              to="/time-entries"
              className="inline-flex items-center gap-2 bg-slate-950 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Time
            </Link>
          )}
        </div>
      </div>

      {dashboardError && (
        <div className="bg-amber-50/80 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-center gap-3 text-xs sm:text-sm shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <p className="flex-1 font-medium">{dashboardError}</p>
          <button 
            onClick={() => fetchDashboardData()} 
            className="underline font-bold hover:text-amber-950 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Grid: High-density Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {roleEmployee && (
          <>
            {/* Card 1: Weekly Hours with Vector SVG Sparkline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative group flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Weekly Logged Hours
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                  40h standard
                </span>
              </div>

              <div className="my-3 flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                      {loading ? <span className="text-slate-300 font-mono">—</span> : weeklyHours.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-semibold">hrs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {weeklyPacePct}% of standard 40h target
                  </p>
                </div>

                {/* SVG Micro Sparkline Trend */}
                <div className="shrink-0 w-20 h-9 flex items-center justify-center">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 80 24">
                    <defs>
                      <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0F172A" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <polyline
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePoints}
                    />
                  </svg>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${weeklyPacePct}%` }}
                />
              </div>
            </div>

            {/* Card 2: Today's Hours with Vector SVG Ring Gauge */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative group flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Today's Activity
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                  8h daily pace
                </span>
              </div>

              <div className="my-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                      {loading ? <span className="text-slate-300 font-mono">—</span> : todayHours.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-semibold">hrs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {todayHours >= 8 
                      ? 'Daily target reached' 
                      : `${Math.max(0, 8 - todayHours).toFixed(1)}h remaining today`}
                  </p>
                </div>

                {/* SVG Circular Ring Gauge */}
                <div className="shrink-0 w-11 h-11 relative flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="#E2E8F0"
                      strokeWidth="3.5"
                      fill="none"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="#0F172A"
                      strokeWidth="3.5"
                      fill="none"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={circleOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-bold text-slate-800">
                    {dailyTargetPct}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-900 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${dailyTargetPct}%` }}
                />
              </div>
            </div>

            {/* Card 3: Current Timesheet Status */}
            <Link
              to="/timesheets"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Weekly Timesheet
                </span>
                <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="my-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${getStatusBadgeClass(currentTimesheetStatus || 'NOT CREATED')}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {loading ? '...' : (currentTimesheetStatus || 'NOT CREATED')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-2">
                  Cycle: {formatDateRange(getThisMonday(), new Date(new Date(getThisMonday() + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000))}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-slate-900 font-medium transition-colors">
                <span>Manage cycle review</span>
                <span className="font-semibold text-slate-800">Review & Submit →</span>
              </div>
            </Link>
          </>
        )}

        {/* Manager Approvals Card */}
        {roleManager && (
          <Link
            to="/approvals"
            className={`p-5 rounded-2xl border shadow-2xs hover:shadow-xs transition-all relative group flex flex-col justify-between cursor-pointer ${
              !loading && approvalsCount > 0
                ? 'bg-rose-50/30 border-rose-200/90 hover:border-rose-300'
                : 'bg-white border-slate-200/90 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider font-mono ${
                !loading && approvalsCount > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}>
                Pending Approvals
              </span>
              <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>

            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-extrabold tracking-tight font-display ${
                  !loading && approvalsCount > 0 ? 'text-rose-900' : 'text-slate-950'
                }`}>
                  {loading ? <span className="text-slate-300 font-mono">—</span> : approvalsCount}
                </span>
                <span className="text-xs text-slate-400 font-mono font-medium">submissions</span>
              </div>
              <p className={`text-[11px] font-medium mt-1 flex items-center gap-1.5 ${
                !loading && approvalsCount > 0 ? 'text-rose-700 font-semibold' : 'text-slate-500'
              }`}>
                {!loading && approvalsCount > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    Awaiting your review
                  </>
                ) : (
                  'All team timesheets processed'
                )}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Approval inbox</span>
              <span className="font-semibold text-slate-800">Open Queue →</span>
            </div>
          </Link>
        )}

        {/* Admin Operational Cards */}
        {roleAdmin && (
          <>
            <Link
              to="/employees"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Organization Roster
                </span>
                <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                    {loading ? <span className="text-slate-300 font-mono">—</span> : empCount}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">employees</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Active organizational members
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Manage directory</span>
                <span className="font-semibold text-slate-800">Directory →</span>
              </div>
            </Link>

            <Link
              to="/teams"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Operational Teams
                </span>
                <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                    {loading ? <span className="text-slate-300 font-mono">—</span> : teamCount}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-medium">teams</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  Functional team structures
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Manage rosters</span>
                <span className="font-semibold text-slate-800">Team Structure →</span>
              </div>
            </Link>

            <Link
              to="/organization"
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all relative group flex flex-col justify-between cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  Tenant Profile
                </span>
                <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>

              <div className="my-3">
                <h3 className="text-xl font-bold text-slate-950 truncate font-display" title={orgSummary?.name}>
                  {loading ? <span className="text-slate-300 font-mono">—</span> : (orgSummary?.name || 'Sify Organization')}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-1 font-mono">
                  Type: {orgSummary?.organizationType || 'ENTERPRISE'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Tenant configuration</span>
                <span className="font-semibold text-slate-800">Settings →</span>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Main Operational Workspace: 12-Column Balanced Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-start">
        
        {/* Primary Operational Feed: 8 Columns */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-7">
          
          {/* Weekly Work Distribution: Pure SVG Chart Component */}
          {roleEmployee && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-950" />
                    <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                      Weekly Velocity & Work Distribution
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daily logged hours distribution across the current Monday–Sunday cycle
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-md border border-slate-200/80">
                    Total: {weeklyHours.toFixed(1)}h / 40.0h
                  </span>
                </div>
              </div>

              {/* Vector SVG Multi-Day Bar Histogram */}
              <div className="pt-2 pb-1">
                <svg className="w-full h-44 overflow-visible" viewBox="0 0 700 170" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="primaryBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F172A" />
                      <stop offset="100%" stopColor="#334155" />
                    </linearGradient>
                    <linearGradient id="todayBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" />
                      <stop offset="100%" stopColor="#1E40AF" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline Grids */}
                  <line x1="40" y1="20" x2="680" y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="30" y="24" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">8h</text>
                  
                  <line x1="40" y1="55" x2="680" y2="55" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="30" y="59" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">6h</text>

                  <line x1="40" y1="90" x2="680" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="30" y="94" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">4h</text>

                  <line x1="40" y1="125" x2="680" y2="125" stroke="#E2E8F0" strokeWidth="1" />
                  <text x="30" y="129" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">0h</text>

                  {/* Bars for 7 days */}
                  {weekDays.map((day, idx) => {
                    const hours = dailyHoursMap[day.dateStr] || 0;
                    const maxScale = 8;
                    const barHeight = Math.min(105, Math.max(hours > 0 ? 8 : 2, (hours / maxScale) * 105));
                    const x = 70 + idx * 88;
                    const y = 125 - barHeight;

                    return (
                      <g key={day.dateStr} className="group cursor-pointer">
                        {/* Background track column */}
                        <rect
                          x={x}
                          y="20"
                          width="44"
                          height="105"
                          rx="6"
                          fill={day.isToday ? "#F8FAFC" : "#FAFAFA"}
                          stroke={day.isToday ? "#CBD5E1" : "transparent"}
                          strokeWidth="1"
                        />

                        {/* Active filled bar */}
                        <rect
                          x={x + 4}
                          y={y}
                          width="36"
                          height={barHeight}
                          rx="5"
                          fill={day.isToday ? "url(#todayBarGrad)" : hours > 0 ? "url(#primaryBarGrad)" : "#E2E8F0"}
                          className="transition-all duration-500 ease-out"
                        />

                        {/* Top Hours Label */}
                        <text
                          x={x + 22}
                          y={y - 6}
                          fill={day.isToday ? "#2563EB" : "#334155"}
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="JetBrains Mono"
                          textAnchor="middle"
                        >
                          {hours > 0 ? `${hours}h` : ''}
                        </text>

                        {/* Bottom Day Label */}
                        <text
                          x={x + 22}
                          y="146"
                          fill={day.isToday ? "#2563EB" : "#475569"}
                          fontSize="12"
                          fontWeight={day.isToday ? "800" : "600"}
                          fontFamily="Inter"
                          textAnchor="middle"
                        >
                          {day.dayName}
                        </text>

                        {/* Date Number */}
                        <text
                          x={x + 22}
                          y="160"
                          fill="#94A3B8"
                          fontSize="10"
                          fontFamily="JetBrains Mono"
                          textAnchor="middle"
                        >
                          {day.dayNum}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Sub-chart status ribbon */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-900" />
                    Standard Logged
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                    Today's Session
                  </span>
                </div>
                <span className="font-mono text-slate-700">
                  {weeklyHours >= 40 ? 'Weekly 40h standard completed' : `${(40 - weeklyHours).toFixed(1)}h remaining in cycle`}
                </span>
              </div>
            </div>
          )}

          {/* Recent Time Entries Ledger Table */}
          {roleEmployee && (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                    Recent Time Entries
                  </h2>
                </div>
                <Link 
                  to="/time-entries" 
                  className="text-xs text-slate-600 hover:text-slate-950 font-semibold flex items-center gap-1 group transition-colors font-mono"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {loading ? (
                <div className="py-14 text-center">
                  <LoadingSpinner size="md" />
                  <p className="text-xs text-slate-400 mt-2 font-mono">Loading ledger...</p>
                </div>
              ) : recentEntries.length === 0 ? (
                <div className="py-14 text-center text-slate-500 px-4">
                  {/* Clean Vector SVG Empty State */}
                  <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" viewBox="0 0 64 64" fill="none">
                    <rect x="14" y="10" width="36" height="46" rx="4" stroke="currentColor" strokeWidth="2" fill="#F8FAFC" />
                    <line x1="22" y1="22" x2="42" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="22" y1="30" x2="38" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="22" y1="38" x2="32" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="44" cy="44" r="10" fill="#0F172A" />
                    <path d="M44 39v6l3 2" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm font-bold text-slate-900 font-display">No time entries recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Record your project task hours to establish your daily ledger and weekly timesheets.
                  </p>
                  <Link
                    to="/time-entries"
                    className="mt-4 inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log First Entry
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm text-left">
                    <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider font-semibold font-mono">
                      <tr>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Project Assignment</th>
                        <th className="px-5 py-3 font-center">Hours</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 font-mono text-xs">
                              {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-900 truncate max-w-[240px] block" title={entry.projectName}>
                                {entry.projectName}
                              </span>
                            </div>
                            {entry.note && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[240px] block mt-0.5 ml-3.5">
                                {entry.note}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-900 border border-slate-200/80">
                              {Number(entry.hours).toFixed(1)} hrs
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              to={`/time-entries?reuse=${entry.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-lg transition-all font-mono shadow-2xs"
                              title="Duplicate entry"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Reuse</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Recent Timesheet Cycles */}
          {roleEmployee && (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                    Recent Timesheets
                  </h2>
                </div>
                <Link 
                  to="/timesheets" 
                  className="text-xs text-slate-600 hover:text-slate-950 font-semibold flex items-center gap-1 group transition-colors font-mono"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <LoadingSpinner size="md" />
                </div>
              ) : recentTimesheets.length === 0 ? (
                <div className="py-10 text-center text-slate-500 px-4">
                  <p className="text-xs font-mono text-slate-400">No timesheet records found for this period.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentTimesheets.map((ts) => (
                    <Link
                      key={ts.id}
                      to={`/timesheets/${ts.id}`}
                      className="flex items-center justify-between p-4 sm:px-5 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-200 transition-colors shrink-0">
                          <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-950 group-hover:text-blue-700 transition-colors font-mono">
                            {formatWeekRange(ts.startDate)}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {ts.totalHours ? `${Number(ts.totalHours).toFixed(1)} hrs total` : 'Mon–Sun cycle'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold font-mono border ${getStatusBadgeClass(ts.status)}`}>
                          {ts.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secondary Column: Command Center & Quick Workflows (4 Columns) */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-7">
          
          {/* Quick Actions Command Hub */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-950" />
                <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider font-mono">
                  Quick Actions
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Shortcuts</span>
            </div>

            <div className="space-y-2">
              {roleEmployee && (
                <>
                  <Link
                    to="/time-entries"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950">Log Time Entry</p>
                      <p className="text-[11px] text-slate-400 truncate">Book daily hours against active tasks</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  <Link
                    to="/timesheets"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950">View Timesheets</p>
                      <p className="text-[11px] text-slate-400 truncate">Submit weekly cycle for review</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                </>
              )}

              {roleManager && (
                <Link
                  to="/approvals"
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950">Pending Approvals</p>
                      {approvalsCount > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-rose-600 text-white rounded-md">
                          {approvalsCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">Validate team submissions</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              )}

              {roleAdmin && (
                <>
                  <Link
                    to="/employees"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950">Employees</p>
                      <p className="text-[11px] text-slate-400 truncate">Manage roles and invitations</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  <Link
                    to="/organization"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                      <Building className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950">Organization Settings</p>
                      <p className="text-[11px] text-slate-400 truncate">Configure tenant & departments</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                </>
              )}

              <Link
                to="/reports/employee-summary"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center group-hover:bg-slate-950 group-hover:text-white transition-colors shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950">Operational Analytics</p>
                  <p className="text-[11px] text-slate-400 truncate">Hours utilization & capacity metrics</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            </div>
          </div>

          {/* Operational Policy Card */}
          <div className="bg-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#27F087] uppercase tracking-wider font-mono">
                Workforce Standard
              </span>
              <span className="w-2 h-2 rounded-full bg-[#27F087] animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-bold font-display text-white">40h Weekly Baseline</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Timesheets close every Sunday at 23:59. Ensure daily entries are attributed to accurate deliverables.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Current Status: Active</span>
              <Link to="/timesheets" className="text-[#27F087] font-semibold hover:underline flex items-center gap-1 font-mono">
                Cycle Guide →
              </Link>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
