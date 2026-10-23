import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, FileText, CheckCircle2, AlertCircle,
  Users, UsersRound, Building, CalendarDays, CheckSquare,
  RefreshCw, Plus, ArrowRight,
  Mail, Briefcase, Calendar
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
import { formatDateRange, getThisMonday, getTodayString } from '../../utils/date';
import { getStatusBadgeClass } from '../../utils/status';

// ── Types ────────────────────────────────────────────────────────────────────

interface FormattedActivity {
  title: string;
  description: string;
  iconType: 'project' | 'time' | 'user' | 'team' | 'org' | 'default';
}

function formatAuditActivity(log: any): FormattedActivity {
  const action = (log?.action || '').toUpperCase();
  const details = log?.details || {};

  switch (action) {
    case 'PROJECT_CREATED':
      return {
        title: 'Project Created',
        description: details.name ? `Created project "${details.name}"` : 'Created a new project',
        iconType: 'project',
      };
    case 'PROJECT_UPDATED': {
      const fields = Array.isArray(details.updatedFields) ? details.updatedFields.join(', ') : '';
      return {
        title: 'Project Updated',
        description: fields ? `Updated ${fields}` : 'Updated project details',
        iconType: 'project',
      };
    }
    case 'PROJECT_ACTIVATED':
      return {
        title: 'Project Activated',
        description: 'Set project status to active',
        iconType: 'project',
      };
    case 'PROJECT_DEACTIVATED':
      return {
        title: 'Project Deactivated',
        description: 'Archived project from active list',
        iconType: 'project',
      };
    case 'EMPLOYEE_ASSIGNED_TO_PROJECT':
      return {
        title: 'Project Assignment',
        description: 'Assigned employee to project',
        iconType: 'project',
      };
    case 'EMPLOYEE_REMOVED_FROM_PROJECT':
      return {
        title: 'Project Assignment Removed',
        description: 'Removed employee from project',
        iconType: 'project',
      };
    case 'TIME_ENTRY_CREATED':
      return {
        title: 'Time Entry Logged',
        description: details.hours ? `Logged ${details.hours} hrs on time entry` : 'Logged a new time entry',
        iconType: 'time',
      };
    case 'TIME_ENTRY_UPDATED': {
      const fields = Array.isArray(details.updatedFields) ? details.updatedFields.join(', ') : '';
      return {
        title: 'Time Entry Updated',
        description: fields ? `Updated ${fields}` : 'Updated time entry details',
        iconType: 'time',
      };
    }
    case 'TIME_ENTRY_DELETED':
      return {
        title: 'Time Entry Removed',
        description: 'Removed logged time entry',
        iconType: 'time',
      };
    case 'TIMESHEET_SUBMITTED':
      return {
        title: 'Timesheet Submitted',
        description: 'Submitted weekly timesheet for manager review',
        iconType: 'time',
      };
    case 'TIMESHEET_APPROVED':
      return {
        title: 'Timesheet Approved',
        description: 'Weekly timesheet was approved',
        iconType: 'time',
      };
    case 'TIMESHEET_REJECTED':
      return {
        title: 'Timesheet Rejected',
        description: details.rejectionReason ? `Reason: ${details.rejectionReason}` : 'Timesheet was rejected',
        iconType: 'time',
      };
    case 'EMPLOYEE_INVITED':
      return {
        title: 'Employee Invited',
        description: details.email ? `Invited ${details.email} to join organization` : 'Sent team invitation',
        iconType: 'user',
      };
    case 'EMPLOYEE_ACTIVATED':
      return {
        title: 'Employee Activated',
        description: 'Employee status set to active',
        iconType: 'user',
      };
    case 'EMPLOYEE_DEACTIVATED':
      return {
        title: 'Employee Deactivated',
        description: 'Employee account deactivated',
        iconType: 'user',
      };
    case 'TEAM_CREATED':
      return {
        title: 'Team Created',
        description: details.name ? `Created team "${details.name}"` : 'Created a new organizational team',
        iconType: 'team',
      };
    case 'TEAM_UPDATED': {
      const fields = Array.isArray(details.updatedFields) ? details.updatedFields.join(', ') : '';
      return {
        title: 'Team Updated',
        description: fields ? `Updated ${fields}` : 'Updated team properties',
        iconType: 'team',
      };
    }
    case 'INVITATION_ACCEPTED':
      return {
        title: 'Invitation Accepted',
        description: 'New employee joined the organization',
        iconType: 'user',
      };
    case 'INVITATION_DECLINED':
      return {
        title: 'Invitation Declined',
        description: 'Employee invitation was declined',
        iconType: 'user',
      };
    case 'INVITATION_REVOKED':
      return {
        title: 'Invitation Revoked',
        description: 'Pending invitation was cancelled',
        iconType: 'user',
      };
    case 'INVITATION_RESENT':
      return {
        title: 'Invitation Resent',
        description: 'Resent invitation link to employee',
        iconType: 'user',
      };
    case 'ORGANIZATION_CREATED':
      return {
        title: 'Organization Created',
        description: 'Organization workspace initialized',
        iconType: 'org',
      };
    case 'ORGANIZATION_UPDATED':
    case 'ORGANIZATION_SETTINGS_UPDATED':
      return {
        title: 'Organization Updated',
        description: 'Company settings or configuration updated',
        iconType: 'org',
      };
    default: {
      const cleanTitle = action
        ? action
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
        : 'Activity Logged';
      const cleanDesc = details.comment
        ? `Note: ${details.comment}`
        : details.updatedFields && Array.isArray(details.updatedFields)
          ? `Updated ${details.updatedFields.join(', ')}`
          : log?.resourceType
            ? `Action performed on ${log.resourceType}`
            : 'System activity recorded';
      return {
        title: cleanTitle,
        description: cleanDesc,
        iconType: 'default',
      };
    }
  }
}

const StatSkeleton = () => (
  <span className="inline-block w-8 h-6 bg-slate-200/80 rounded animate-pulse align-middle" />
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADMIN DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminDashboardViewProps {
  employee: any;
  orgSummary: any;
  loading: boolean;
  fetchDashboardData: () => void;
  activeEmployees: number;
  inactiveEmployees?: number;
  totalEmployees?: number;
  auditLogs?: any[];
  totalTeams: number;
  teamsWithoutManager: number;
  activeProjectsCount: number;
  projectsData?: any[];
  projectStatusCounts?: {
    ACTIVE: number;
    IN_PROGRESS: number;
    PLANNING: number;
    ON_HOLD: number;
    COMPLETED: number;
  };
  pendingInvitationsCount: number;
  overdueTasksCount: number;
  pendingActionsCount?: number;
  getGreeting: () => string;
  dashboardError?: string | null;
}

export const AdminDashboardView = ({
  employee,
  orgSummary,
  loading,
  fetchDashboardData,
  activeEmployees,
  totalTeams,
  teamsWithoutManager,
  activeProjectsCount,
  pendingInvitationsCount,
  overdueTasksCount,
  getGreeting,
  dashboardError,
}: AdminDashboardViewProps) => {
  const attentionItems = [
    {
      id: 'overdue-tasks',
      label: 'Overdue Tasks',
      count: overdueTasksCount,
      unit: overdueTasksCount === 1 ? 'task' : 'tasks',
      description: 'Tasks past their due date and not completed',
      link: '/admin/projects',
      actionText: 'View overdue tasks',
      icon: AlertCircle,
      isUrgent: true,
    },
    {
      id: 'teams-without-lead',
      label: 'Teams Without a Lead',
      count: teamsWithoutManager,
      unit: teamsWithoutManager === 1 ? 'team' : 'teams',
      description: 'Teams without an assigned manager',
      link: '/teams',
      actionText: 'Assign lead',
      icon: UsersRound,
      isUrgent: false,
    },
    {
      id: 'pending-invitations',
      label: 'Pending Invitations',
      count: pendingInvitationsCount,
      unit: pendingInvitationsCount === 1 ? 'invite' : 'invites',
      description: 'Invitations awaiting response',
      link: '/employees',
      actionText: 'Manage invitations',
      icon: Mail,
      isUrgent: false,
    },
  ];

  const activeAttentionItems = attentionItems.filter((item) => item.count > 0);
  const totalAttentionIssues = overdueTasksCount + teamsWithoutManager + pendingInvitationsCount;

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {dashboardError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{dashboardError}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="text-amber-900 font-bold hover:underline cursor-pointer ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1. Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
              Admin Dashboard
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Administrator
            </span>
            {orgSummary?.name ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                <Building className="w-3 h-3 text-slate-400" />
                {orgSummary.name}
              </span>
            ) : null}
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            <span>{getGreeting()}, <span className="font-semibold text-slate-700">{employee?.name?.split(' ')[0] || employee?.name}</span></span>
            <span className="mx-2 text-slate-300">•</span>
            <span>Your company at a glance.</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-600">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Summary Metrics (Level 1: Three Essential Cards) ────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Active Employees */}
          <Link
            to="/employees"
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Employees</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <StatSkeleton /> : activeEmployees}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>Directory</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Active Projects */}
          <Link
            to="/admin/projects"
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Active Projects</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <Briefcase className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <StatSkeleton /> : activeProjectsCount}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>Projects</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Total Teams */}
          <Link
            to="/teams"
            className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Teams</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <UsersRound className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="my-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <StatSkeleton /> : totalTeams}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>Teams</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. Needs Attention (Level 2: Action Tray) ─────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                !loading && totalAttentionIssues === 0 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Needs Attention
            </h2>
          </div>
          {!loading && totalAttentionIssues > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              {totalAttentionIssues} {totalAttentionIssues === 1 ? 'Action Item' : 'Action Items'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-3" />
                <div className="h-7 bg-slate-100 rounded w-1/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : totalAttentionIssues === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center flex flex-col items-center justify-center shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-slate-900">
              Nothing needs your attention.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All tasks, team leadership assignments, and pending invitations are up to date.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              activeAttentionItems.length === 1
                ? 'sm:grid-cols-1 max-w-md'
                : activeAttentionItems.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-3'
            } gap-3.5 sm:gap-4`}
          >
            {activeAttentionItems.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                className={`bg-white p-4 rounded-xl border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group ${
                  item.isUrgent
                    ? 'border-rose-200/90 hover:border-rose-300'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">{item.label}</span>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        item.isUrgent
                          ? 'bg-rose-50 text-rose-600 border border-rose-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="my-2.5 flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl font-bold tracking-tight leading-none ${
                        item.isUrgent ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {item.count}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{item.unit}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {item.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover:text-slate-900">
                  <span className="text-[11px] text-slate-400">Action</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    {item.actionText} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. MANAGER DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

export interface ManagerDashboardViewProps {
  employee: any;
  loading: boolean;
  fetchDashboardData: () => void;
  getGreeting: () => string;
  managerTeams: any[];
  managerProjects: any[];
  approvalsCount: number;
  managerApprovalsList?: any[];
  dashboardError?: string | null;
  managerReport: {
    totalTeamMembers: number;
    managedTeamsCount: number;
    activeProjectsCount?: number;
    projectStatusCounts?: any;
    managedTeams?: { id: string; name: string; memberCount: number }[];
    teamWeeklyFinalizedHours?: number;
    pendingApprovalsCount?: number;
  } | null;
  managerOverdueTasks: number;
  overdueTasksList?: any[];
  projectTasksMap?: Record<string, { total: number; overdue: number; open: number }>;
  auditLogs: any[];
}

export const ManagerDashboardView = ({
  employee,
  loading,
  fetchDashboardData,
  getGreeting,
  managerTeams,
  managerProjects,
  approvalsCount,
  managerApprovalsList,
  dashboardError,
  managerReport,
  managerOverdueTasks,
  overdueTasksList,
  projectTasksMap,
  auditLogs,
}: ManagerDashboardViewProps) => {
  // ── Team Overview Metrics ───────────────────────────────────────────────────
  const teamsCount = managerReport?.managedTeamsCount ?? managerTeams.length;
  const teamMembersCount = managerReport?.totalTeamMembers
    ?? managerTeams.reduce((acc, t) => acc + (t.memberCount || 0), 0);
  const activeProjectsCount = managerReport?.activeProjectsCount
    ?? managerProjects.filter(p => p.isActive !== false && p.status !== 'COMPLETED').length;
  const teamWeeklyFinalizedHours = Number(managerReport?.teamWeeklyFinalizedHours) || 0;
  const pendingHours = (managerApprovalsList || []).reduce((acc: number, ts: any) => acc + (Number(ts.totalHours) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {dashboardError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{dashboardError}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="text-amber-900 font-bold hover:underline cursor-pointer ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1. Simplified Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
              {getGreeting()}, {employee?.name ? employee.name.split(' ')[0] : 'Manager'}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Manager
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            Here's what needs your attention today.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-600">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Primary Statistics Cards (Four Compact KPI Cards) ────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Team overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 — Teams I Manage */}
          <Link
            to="/teams"
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Managed teams</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <UsersRound className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                  {loading ? <StatSkeleton /> : teamsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {teamsCount === 1 ? 'team' : 'teams'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>Teams I Manage</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-slate-700 font-semibold">
                View <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Card 2 — Team Members */}
          <Link
            to="/employees"
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Team members</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                  {loading ? <StatSkeleton /> : teamMembersCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {teamMembersCount === 1 ? 'person' : 'people'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>Across managed teams</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-slate-700 font-semibold">
                Directory <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Card 3 — Pending Approvals */}
          <Link
            to="/approvals"
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Pending approvals</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold tracking-tight leading-none ${approvalsCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                  {loading ? <StatSkeleton /> : approvalsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {approvalsCount === 1 ? 'submission' : 'submissions'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>{approvalsCount > 0 ? 'Awaiting your review' : 'Queue clear'}</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-slate-700 font-semibold">
                Review <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>

          {/* Card 4 — Active Projects */}
          <Link
            to="/projects"
            className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Active projects</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                  {loading ? <StatSkeleton /> : activeProjectsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {activeProjectsCount === 1 ? 'project' : 'projects'}
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
              <span>Team initiatives</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-slate-700 font-semibold">
                Open <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. Needs Your Attention ────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Needs your attention
            </h2>
            {(managerOverdueTasks > 0 || approvalsCount > 0) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                {(managerOverdueTasks > 0 ? 1 : 0) + (approvalsCount > 0 ? 1 : 0)} action {((managerOverdueTasks > 0 ? 1 : 0) + (approvalsCount > 0 ? 1 : 0)) === 1 ? 'area' : 'areas'}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Overdue Tasks */}
          <div className={`rounded-xl border transition-all ${
            managerOverdueTasks > 0
              ? 'bg-rose-50/30 border-rose-200/90 shadow-2xs'
              : 'bg-white border-slate-200/80 shadow-2xs'
          } p-4 sm:p-5 flex flex-col justify-between`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${managerOverdueTasks > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <h3 className="text-sm font-bold text-slate-900">Overdue tasks</h3>
                </div>
                {managerOverdueTasks > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {managerOverdueTasks} overdue
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All on schedule
                  </span>
                )}
              </div>

              {managerOverdueTasks > 0 ? (
                <div>
                  <p className="text-xs text-rose-800 font-medium">
                    Tasks that have exceeded their target deadline across your assigned projects.
                  </p>
                  {overdueTasksList && overdueTasksList.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {overdueTasksList.slice(0, 3).map((task) => (
                        <Link
                          key={task.id}
                          to={`/projects/${task.projectId}`}
                          className="block p-3 rounded-lg bg-white border border-rose-200/80 hover:border-rose-300 shadow-2xs transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-rose-700 transition-colors line-clamp-1">
                              {task.name}
                            </p>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 shrink-0 mt-0.5" />
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-medium text-slate-700">{task.projectName}</span>
                            <span>•</span>
                            <span className="text-rose-600 font-semibold">
                              Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-xs text-slate-500">
                    All project tasks are currently on track. No tasks are past their due date.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Projects</span>
              <Link
                to="/projects"
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 group"
              >
                <span>View all projects</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className={`rounded-xl border transition-all ${
            approvalsCount > 0
              ? 'bg-amber-50/30 border-amber-200/90 shadow-2xs'
              : 'bg-white border-slate-200/80 shadow-2xs'
          } p-4 sm:p-5 flex flex-col justify-between`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${approvalsCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <h3 className="text-sm font-bold text-slate-900">Pending approvals</h3>
                </div>
                {approvalsCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {approvalsCount} waiting
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> All caught up
                  </span>
                )}
              </div>

              {approvalsCount > 0 ? (
                <div>
                  <p className="text-xs text-amber-800 font-medium">
                    Timesheets submitted by your team members awaiting your review and approval.
                  </p>
                  {managerApprovalsList && managerApprovalsList.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {managerApprovalsList.slice(0, 3).map((ts) => (
                        <Link
                          key={ts.id}
                          to="/approvals"
                          className="block p-3 rounded-lg bg-white border border-amber-200/80 hover:border-amber-300 shadow-2xs transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                              {ts.employee?.name || ts.employeeName || 'Team member'}
                            </p>
                            <span className="text-xs font-bold text-slate-800">
                              {ts.totalHours ?? 0} hrs
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {ts.startDate && ts.endDate ? formatDateRange(ts.startDate, ts.endDate) : 'Weekly timesheet'}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="py-2">
                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>No approvals waiting.</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Your approval queue is clear. New timesheet submissions will appear here.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Timesheets</span>
              <Link
                to="/approvals"
                className={`text-xs font-semibold inline-flex items-center gap-1 group ${
                  approvalsCount > 0 ? 'text-amber-900 font-bold hover:underline' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <span>{approvalsCount > 0 ? `Review ${approvalsCount} ${approvalsCount === 1 ? 'timesheet' : 'timesheets'}` : 'Open approvals'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Team and Project Status ─────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Team and project status
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Main Column (2 columns): Active Projects & Team Work Summary */}
          <div className="lg:col-span-2 space-y-5">
            {/* Active Projects Portfolio */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Projects</h3>
                  <span className="text-xs text-slate-400 font-medium">({managerProjects.length})</span>
                </div>
                <Link
                  to="/projects"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {managerProjects.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {managerProjects.slice(0, 5).map((project) => {
                    const taskStats = projectTasksMap?.[project.id];
                    return (
                      <div
                        key={project.id}
                        className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/projects/${project.id}`}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                            >
                              {project.name}
                            </Link>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusBadgeClass(project.status || 'ACTIVE')}`}>
                              {project.status || 'ACTIVE'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            {project.startDate && project.endDate && (
                              <span>{formatDateRange(project.startDate, project.endDate)}</span>
                            )}
                            {taskStats && (
                              <span className="text-slate-500">
                                {taskStats.total} {taskStats.total === 1 ? 'task' : 'tasks'}
                                {taskStats.open > 0 ? ` (${taskStats.open} open)` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {taskStats && taskStats.overdue > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              {taskStats.overdue} overdue
                            </span>
                          ) : null}
                          <Link
                            to={`/projects/${project.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="View project details"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-xs text-slate-400">
                  No projects assigned to you.
                </div>
              )}
            </div>

            {/* Team Work Summary */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Team Work Summary</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Current week cycle
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                    <p className="text-xs font-medium text-slate-500">Approved hours this cycle</p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-slate-900">
                        {loading ? <StatSkeleton /> : teamWeeklyFinalizedHours.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">hrs</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Finalized and approved for managed teams
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/70">
                    <p className="text-xs font-medium text-slate-500">Pending review hours</p>
                    <div className="mt-1.5 flex items-baseline gap-1.5">
                      <span className={`text-xl font-bold ${approvalsCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                        {loading ? <StatSkeleton /> : pendingHours.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">hrs</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Across {approvalsCount} {approvalsCount === 1 ? 'submission' : 'submissions'} awaiting review
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] text-slate-400">
                    Reporting period: Monday – Sunday. Only approved time entries are counted toward finalized totals.
                  </p>
                  <Link
                    to="/approvals"
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 group"
                  >
                    <span>Timesheet approvals</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Side Column (1 column): Managed Teams & Recent Activity */}
          <div className="space-y-5">
            {/* Managed Teams */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Teams</h3>
                  <span className="text-xs text-slate-400 font-medium">({managerTeams.length})</span>
                </div>
                <Link
                  to="/teams"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {managerTeams.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {managerTeams.slice(0, 5).map((team) => (
                    <div
                      key={team.id}
                      className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/teams"
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors block truncate"
                        >
                          {team.name}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {team.memberCount ?? 0} {(team.memberCount ?? 0) === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                      <Link
                        to="/teams"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Manage team"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-xs text-slate-400">
                  No teams assigned to you.
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
                </div>
              </div>

              {auditLogs && auditLogs.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 5).map((log) => {
                    const activity = formatAuditActivity(log);
                    return (
                      <div key={log.id} className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            {activity.iconType === 'project' && <Briefcase className="w-3.5 h-3.5" />}
                            {activity.iconType === 'time' && <Clock className="w-3.5 h-3.5" />}
                            {activity.iconType === 'user' && <Users className="w-3.5 h-3.5" />}
                            {activity.iconType === 'team' && <UsersRound className="w-3.5 h-3.5" />}
                            {activity.iconType === 'org' && <Building className="w-3.5 h-3.5" />}
                            {activity.iconType === 'default' && <Clock className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{activity.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{activity.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-semibold text-slate-700">
                            {log.actorName || log.actorEmail || 'System'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 px-4 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    No recent activity. New timesheet submissions, task updates, and approvals will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. EMPLOYEE DASHBOARD VIEW
// ─────────────────────────────────────────────────────────────────────────────

export interface EmployeeDashboardViewProps {
  employee: any;
  loading: boolean;
  dashboardError?: string | null;
  fetchDashboardData: () => void;
  getGreeting: () => string;
  projectsData: any[];
  weeklyHours: number;
  todayHours: number;
  weeklyPacePct: number;
  currentTimesheetStatus: string | null;
  recentTimesheets: any[];
  recentEntries: any[];
  formatWeekRange: (startStr: string) => string;
  assignedTasks?: any[];
  currentTimesheet?: any | null;
}

function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  if (typeof dateStr !== 'string') {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getTaskDeadlineInfo(dueDateStr?: string | null) {
  const due = parseLocalDate(dueDateStr);
  if (!due) {
    return { isOverdue: false, isDueToday: false, isDueSoon: false, daysDiff: null };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const msDiff = dueDay.getTime() - today.getTime();
  const daysDiff = Math.round(msDiff / (1000 * 60 * 60 * 24));

  return {
    isOverdue: daysDiff < 0,
    isDueToday: daysDiff === 0,
    isDueSoon: daysDiff > 0 && daysDiff <= 7,
    daysDiff,
  };
}

function formatTaskDueDate(dueDateStr?: string | null): string {
  const d = parseLocalDate(dueDateStr);
  if (!d) return 'No due date';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEntryDate(dateStr?: string | null): string {
  const d = parseLocalDate(dateStr);
  if (!d) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPriorityBadgeClass(priority?: string | null): string {
  const p = (priority || '').toUpperCase();
  switch (p) {
    case 'URGENT':
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    case 'HIGH':
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    case 'MEDIUM':
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    case 'LOW':
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200/80';
  }
}

function getTaskStatusBadgeClass(status?: string | null): string {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'IN_PROGRESS':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    case 'IN_REVIEW':
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    case 'DONE':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    case 'TODO':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200/80';
  }
}

export const EmployeeDashboardView = ({
  employee,
  loading,
  dashboardError,
  fetchDashboardData,
  getGreeting,
  projectsData,
  weeklyHours,
  todayHours,
  weeklyPacePct,
  currentTimesheetStatus,
  recentTimesheets,
  recentEntries,
  formatWeekRange,
  assignedTasks = [],
  currentTimesheet = null,
}: EmployeeDashboardViewProps) => {
  const thisWeekStart = getThisMonday();
  const weekLabel = formatWeekRange(thisWeekStart);

  // 1. Task metrics
  const openTasks = (assignedTasks || []).filter(
    (t: any) => t.isActive !== false && t.status !== 'DONE' && t.status !== 'COMPLETED'
  );
  const overdueTasks = openTasks.filter((t: any) => getTaskDeadlineInfo(t.dueDate).isOverdue);
  const dueSoonTasks = openTasks.filter((t: any) => {
    const info = getTaskDeadlineInfo(t.dueDate);
    return info.isDueToday || info.isDueSoon;
  });

  const primaryTaskDestination = overdueTasks[0]
    ? `/projects/${overdueTasks[0].projectId}?taskId=${overdueTasks[0].id}`
    : dueSoonTasks[0]
      ? `/projects/${dueSoonTasks[0].projectId}?taskId=${dueSoonTasks[0].id}`
      : openTasks[0]
        ? `/projects/${openTasks[0].projectId}?taskId=${openTasks[0].id}`
        : '/projects';

  // 2. Needs Attention items
  const attentionItems: {
    id: string;
    kind: 'rejected_timesheet' | 'overdue_task' | 'due_soon_task' | 'draft_timesheet';
    badge: { text: string; className: string };
    title: string;
    description: string;
    actionText: string;
    actionUrl: string;
    actionButtonClass: string;
  }[] = [];

  // 2.1 Rejected Timesheets (highest priority)
  recentTimesheets.forEach((ts: any) => {
    if (ts.status === 'REJECTED') {
      attentionItems.push({
        id: `ts-rej-${ts.id}`,
        kind: 'rejected_timesheet',
        badge: { text: 'Rejected', className: 'bg-rose-100 text-rose-800 border-rose-200' },
        title: `Timesheet Rejected (${formatWeekRange(ts.startDate)})`,
        description: ts.rejectionComment ? `Reason: "${ts.rejectionComment}"` : 'Timesheet was rejected and requires entry revision.',
        actionText: 'Fix Timesheet',
        actionUrl: `/timesheets/${ts.id}`,
        actionButtonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
      });
    }
  });

  // 2.2 Overdue Tasks
  overdueTasks.forEach((t: any) => {
    const { daysDiff } = getTaskDeadlineInfo(t.dueDate);
    attentionItems.push({
      id: `task-overdue-${t.id}`,
      kind: 'overdue_task',
      badge: { text: 'Overdue', className: 'bg-rose-100 text-rose-800 border-rose-200' },
      title: `${t.ticketId ? `${t.ticketId}: ` : ''}${t.name}`,
      description: `${t.projectName || 'Project'} • Due ${formatTaskDueDate(t.dueDate)} (${Math.abs(daysDiff || 0)} ${Math.abs(daysDiff || 0) === 1 ? 'day' : 'days'} overdue)`,
      actionText: 'Open Task',
      actionUrl: `/projects/${t.projectId}?taskId=${t.id}`,
      actionButtonClass: 'bg-[#0B1738] hover:bg-slate-800 text-white',
    });
  });

  // 2.3 Tasks Due Soon (due today or within 3 days)
  openTasks.forEach((t: any) => {
    const { isDueToday, isDueSoon, daysDiff } = getTaskDeadlineInfo(t.dueDate);
    if (isDueToday || (isDueSoon && daysDiff !== null && daysDiff <= 3)) {
      attentionItems.push({
        id: `task-due-${t.id}`,
        kind: 'due_soon_task',
        badge: {
          text: isDueToday ? 'Due Today' : `Due in ${daysDiff}d`,
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        },
        title: `${t.ticketId ? `${t.ticketId}: ` : ''}${t.name}`,
        description: `${t.projectName || 'Project'} • Deadline: ${isDueToday ? 'Today' : formatTaskDueDate(t.dueDate)}`,
        actionText: 'Open Task',
        actionUrl: `/projects/${t.projectId}?taskId=${t.id}`,
        actionButtonClass: 'bg-[#0B1738] hover:bg-slate-800 text-white',
      });
    }
  });

  // 2.4 Draft Timesheet Pending Submission
  if (currentTimesheet?.status === 'DRAFT' && (weeklyHours > 0 || Number(currentTimesheet?.summary?.loggedHours || 0) > 0)) {
    attentionItems.push({
      id: `ts-draft-cur-${currentTimesheet.id}`,
      kind: 'draft_timesheet',
      badge: { text: 'Draft Pending', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      title: `Current Timesheet (${formatWeekRange(currentTimesheet.startDate)})`,
      description: `${Number(currentTimesheet?.summary?.loggedHours || weeklyHours).toFixed(1)} hrs recorded in draft. Ready to submit for manager approval.`,
      actionText: 'Submit Timesheet',
      actionUrl: `/timesheets/${currentTimesheet.id}`,
      actionButtonClass: 'bg-[#0B1738] hover:bg-slate-800 text-white',
    });
  }

  // 2.5 Past unsubmitted timesheets
  recentTimesheets.forEach((ts: any) => {
    if (ts.status === 'DRAFT' && ts.id !== currentTimesheet?.id && Number(ts.totalHours || ts.summary?.loggedHours || 0) > 0) {
      attentionItems.push({
        id: `ts-draft-past-${ts.id}`,
        kind: 'draft_timesheet',
        badge: { text: 'Draft Overdue', className: 'bg-amber-100 text-amber-800 border-amber-200' },
        title: `Past Timesheet (${formatWeekRange(ts.startDate)})`,
        description: `${Number(ts.totalHours || ts.summary?.loggedHours || 0).toFixed(1)} hrs recorded. Requires submission.`,
        actionText: 'Submit Timesheet',
        actionUrl: `/timesheets/${ts.id}`,
        actionButtonClass: 'bg-amber-700 hover:bg-amber-800 text-white',
      });
    }
  });

  // 3. Prioritized tasks for My Active Work
  const prioritizedTasks = [...openTasks].sort((a: any, b: any) => {
    const aInfo = getTaskDeadlineInfo(a.dueDate);
    const bInfo = getTaskDeadlineInfo(b.dueDate);
    if (aInfo.isOverdue && !bInfo.isOverdue) return -1;
    if (!aInfo.isOverdue && bInfo.isOverdue) return 1;
    if (aInfo.isDueToday && !bInfo.isDueToday) return -1;
    if (!aInfo.isDueToday && bInfo.isDueToday) return 1;
    if (aInfo.daysDiff !== null && bInfo.daysDiff !== null) {
      return aInfo.daysDiff - bInfo.daysDiff;
    }
    if (aInfo.daysDiff !== null) return -1;
    if (bInfo.daysDiff !== null) return 1;
    const priorityOrder: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const aP = priorityOrder[(a.priority || '').toUpperCase()] || 0;
    const bP = priorityOrder[(b.priority || '').toUpperCase()] || 0;
    return bP - aP;
  }).slice(0, 5);

  const displayTimesheetStatus = currentTimesheetStatus || currentTimesheet?.status || 'NOT CREATED';

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {dashboardError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{dashboardError}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="text-amber-900 font-bold hover:underline cursor-pointer ml-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 1. Page Header (Compact & Actionable) ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-none">
              {getGreeting()}, {employee?.name?.split(' ')[0]}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              Employee
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium">
            Your work, hours, and upcoming deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-600">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/time-entries"
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3.5 bg-[#0B1738] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-[#C8DB00]" strokeWidth={2.5} />
            <span>Log Time</span>
          </Link>
        </div>
      </div>

      {/* ── 2. Summary Metrics Ribbon (The 3 Focused Cards) ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Tasks to Complete */}
        <Link
          to={primaryTaskDestination}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tasks to Complete</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
              <CheckSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <StatSkeleton /> : openTasks.length}
              </span>
              <span className="text-xs text-slate-400 font-medium">open</span>
            </div>
            <div className="text-[11px] mt-1.5 truncate">
              {overdueTasks.length > 0 ? (
                <span className="text-rose-600 font-semibold">
                  {overdueTasks.length} overdue
                  {dueSoonTasks.length > 0 ? ` • ${dueSoonTasks.length} due soon` : ''}
                </span>
              ) : dueSoonTasks.length > 0 ? (
                <span className="text-amber-700 font-medium">
                  {dueSoonTasks.length} due soon • all on track
                </span>
              ) : openTasks.length > 0 ? (
                <span className="text-slate-500 font-medium">
                  {openTasks.length} in progress • all on schedule
                </span>
              ) : (
                <span className="text-slate-400 font-medium">No open tasks assigned</span>
              )}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
            <span>{overdueTasks.length > 0 ? 'Urgent Tasks' : 'My Work'}</span>
            <span className="font-semibold text-slate-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              {overdueTasks.length > 0 ? 'Review Overdue' : 'View Tasks'} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Card 2: Hours Logged Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hours Logged Today</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <StatSkeleton /> : todayHours.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-medium">hrs</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Actual recorded hours today</p>
            {/* Progress bar towards 8h daily target */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#0B1738] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((todayHours / 8) * 100))}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Daily Target (8h)</span>
            <span className={`font-semibold ${todayHours >= 8 ? 'text-emerald-700' : 'text-slate-800'}`}>
              {todayHours >= 8 ? '8.0h Target Met' : `${(8 - todayHours).toFixed(1)}h remaining`}
            </span>
          </div>
        </div>

        {/* Card 3: This Week */}
        <Link
          to={currentTimesheet?.id ? `/timesheets/${currentTimesheet.id}` : '/timesheets'}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">This Week</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#0B1738] group-hover:text-white transition-colors">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
                {loading ? <StatSkeleton /> : weeklyHours.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-medium">hrs</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 truncate">Current cycle ({weekLabel})</p>
            {/* Progress bar towards 40h weekly target */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#0B1738] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, weeklyPacePct)}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-500 group-hover:text-slate-900">
            <span>Pace (40h target)</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              {weeklyPacePct}% ({Math.max(0, 40 - weeklyHours).toFixed(1)}h left) <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* ── 3. Needs Your Attention Section ─────────────────────────────────── */}
      {attentionItems.length > 0 ? (
        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Needs Attention
              </h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              {attentionItems.length} {attentionItems.length === 1 ? 'Action Item' : 'Action Items'}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${item.badge.className}`}>
                      {item.badge.text}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 truncate">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {item.description}
                  </p>
                </div>
                <Link
                  to={item.actionUrl}
                  className={`inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] shrink-0 self-start sm:self-auto cursor-pointer ${item.actionButtonClass}`}
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                You're all caught up.
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                No overdue tasks, rejected timesheets, or pending submissions requiring your attention.
              </p>
            </div>
          </div>
          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 shrink-0 self-start sm:self-auto group"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}

      {/* ── 4. Main 2-Column Work Canvas ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Left Column: My Active Work & Recent Time Entries (2 columns) */}
        <div className="lg:col-span-2 space-y-5">
          {/* My Active Work */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">My Active Work</h3>
                <span className="text-xs text-slate-400 font-medium">
                  ({assignedTasks.length > 0 ? openTasks.length : projectsData.length})
                </span>
              </div>
              <Link
                to="/projects"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {assignedTasks.length > 0 ? (
              openTasks.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {prioritizedTasks.map((t: any) => {
                    const deadline = getTaskDeadlineInfo(t.dueDate);
                    return (
                      <div
                        key={t.id}
                        className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {t.ticketId && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
                                {t.ticketId}
                              </span>
                            )}
                            <Link
                              to={`/projects/${t.projectId}?taskId=${t.id}`}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                            >
                              {t.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-medium text-slate-600">{t.projectName}</span>
                            {t.priority && (
                              <>
                                <span>•</span>
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${getPriorityBadgeClass(t.priority)}`}>
                                  {t.priority}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            {deadline.isOverdue ? (
                              <span className="text-rose-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Overdue ({formatTaskDueDate(t.dueDate)})
                              </span>
                            ) : deadline.isDueToday ? (
                              <span className="text-amber-700 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due today
                              </span>
                            ) : deadline.isDueSoon ? (
                              <span className="text-slate-600 font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due {formatTaskDueDate(t.dueDate)}
                              </span>
                            ) : t.dueDate ? (
                              <span className="text-slate-500">
                                Due {formatTaskDueDate(t.dueDate)}
                              </span>
                            ) : (
                              <span className="text-slate-400">No deadline</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getTaskStatusBadgeClass(t.status)}`}>
                            {t.status || 'TODO'}
                          </span>
                          <Link
                            to={`/projects/${t.projectId}?taskId=${t.id}`}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Open task details"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-800">All open tasks completed</p>
                  <p className="text-slate-400 mt-0.5">You have no active pending deliverables.</p>
                </div>
              )
            ) : projectsData.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {projectsData.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                        >
                          {p.name}
                        </Link>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeClass(p.status || 'ACTIVE')}`}>
                          {p.status || 'ACTIVE'}
                        </span>
                      </div>
                      {p.description && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-md">{p.description}</p>
                      )}
                    </div>
                    <Link
                      to={`/projects/${p.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                      title="View project tasks"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-slate-400">
                No active projects assigned to you.
              </div>
            )}
          </div>

          {/* Recent Time Entries */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Recent Time Entries</h3>
              </div>
              <Link
                to="/time-entries"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            {recentEntries.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentEntries.slice(0, 5).map((entry: any) => (
                  <div key={entry.id} className="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {entry.projectName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatEntryDate(entry.date)}
                        {entry.taskName && <span> • {entry.taskName}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {Number(entry.hours).toFixed(1)} hrs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                <p>No recent time entries recorded.</p>
                <Link
                  to="/time-entries"
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1738] hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                >
                  <Plus className="w-3 h-3 text-[#C8DB00]" />
                  <span>Log Time</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Consolidated My Timesheet Panel (1 column) */}
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">My Timesheet</h3>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(displayTimesheetStatus)}`}>
                {displayTimesheetStatus}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Reporting Period
                </span>
                <p className="text-xs font-bold text-slate-800 mt-0.5">
                  {weekLabel}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-500">Recorded Hours</span>
                  <span className="font-bold text-slate-900">{weeklyHours.toFixed(1)} / 40.0 hrs</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0B1738] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, weeklyPacePct)}%` }}
                  />
                </div>
              </div>

              {/* Status Note & Next Action */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                <p className="font-bold text-slate-800">
                  {displayTimesheetStatus === 'REJECTED'
                    ? 'Revision Required'
                    : displayTimesheetStatus === 'DRAFT'
                      ? 'In Progress'
                      : displayTimesheetStatus === 'SUBMITTED'
                        ? 'Under Review'
                        : displayTimesheetStatus === 'APPROVED'
                          ? 'Approved Cycle'
                          : 'Not Started'}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {displayTimesheetStatus === 'REJECTED'
                    ? 'This timesheet was rejected. Review manager feedback and resubmit.'
                    : displayTimesheetStatus === 'DRAFT'
                      ? 'You have recorded hours in draft. When complete, submit for manager approval.'
                      : displayTimesheetStatus === 'SUBMITTED'
                        ? 'Timesheet submitted. Awaiting manager review and sign-off.'
                        : displayTimesheetStatus === 'APPROVED'
                          ? 'Timesheet approved by manager. All recorded hours are finalized.'
                          : 'No hours recorded for this cycle yet. Start logging time to begin.'}
                </p>
              </div>

              {/* Context-Sensitive Action Button */}
              <div>
                {displayTimesheetStatus === 'REJECTED' ? (
                  <Link
                    to={currentTimesheet?.id ? `/timesheets/${currentTimesheet.id}` : '/timesheets'}
                    className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs transition-all active:scale-[0.98]"
                  >
                    <span>Fix Timesheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : displayTimesheetStatus === 'DRAFT' && weeklyHours > 0 ? (
                  <Link
                    to={currentTimesheet?.id ? `/timesheets/${currentTimesheet.id}` : '/timesheets'}
                    className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold bg-[#0B1738] hover:bg-slate-800 text-white shadow-2xs transition-all active:scale-[0.98]"
                  >
                    <span>Submit Timesheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : displayTimesheetStatus === 'SUBMITTED' || displayTimesheetStatus === 'APPROVED' ? (
                  <Link
                    to={currentTimesheet?.id ? `/timesheets/${currentTimesheet.id}` : '/timesheets'}
                    className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-2xs transition-all active:scale-[0.98]"
                  >
                    <span>View Timesheet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <Link
                    to="/time-entries"
                    className="w-full h-9 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold bg-[#0B1738] hover:bg-slate-800 text-white shadow-2xs transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C8DB00]" strokeWidth={2.5} />
                    <span>Log Time</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>All Timesheets</span>
              <Link
                to="/timesheets"
                className="font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 group"
              >
                <span>View history</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const Dashboard = () => {
  const { employee, isLoading: empLoading, error: empError } = useCurrentEmployee();
  const [approvalsCount, setApprovalsCount] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [currentTimesheetStatus, setCurrentTimesheetStatus] = useState<string | null>(null);
  const [currentTimesheet, setCurrentTimesheet] = useState<any | null>(null);
  const [employeeAssignedTasks, setEmployeeAssignedTasks] = useState<any[]>([]);
  const [recentTimesheets, setRecentTimesheets] = useState<any[]>([]);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);

  // Manager Dashboard State
  const [managerTeams, setManagerTeams] = useState<any[]>([]);
  const [managerProjects, setManagerProjects] = useState<any[]>([]);
  const [managerReport, setManagerReport] = useState<any>(null);
  const [managerOverdueTasks, setManagerOverdueTasks] = useState(0);
  const [managerApprovalsList, setManagerApprovalsList] = useState<any[]>([]);
  const [managerOverdueTasksList, setManagerOverdueTasksList] = useState<any[]>([]);
  const [managerProjectTasksMap, setManagerProjectTasksMap] = useState<Record<string, { total: number; overdue: number; open: number }>>({});

  // Admin Dashboard State
  const [orgSummary, setOrgSummary] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_org_name');
      return cached ? { name: cached } : null;
    } catch {
      return null;
    }
  });
  const [employeesData, setEmployeesData] = useState<any>(null);
  const [teamsData, setTeamsData] = useState<any>(null);
  const [projectsData, setProjectsData] = useState<any[]>([]);
  const [invitationsData, setInvitationsData] = useState<any[]>([]);
  const [overdueTasksCount, setOverdueTasksCount] = useState<number>(0);
  const [empCount, setEmpCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [adminDashboardData, setAdminDashboardData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const roleAdmin = Boolean(employee?.roles?.includes('ADMIN') || employee?.role === 'ADMIN');
  const roleManager = Boolean(employee?.roles?.includes('MANAGER') || employee?.role === 'MANAGER');
  const roleEmployee = Boolean(employee?.roles?.includes('EMPLOYEE') || employee?.role === 'EMPLOYEE');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchDashboardData = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    try {
      const promises: Promise<any>[] = [];
      const thisWeekStart = getThisMonday();
      const monDate = new Date(thisWeekStart + 'T00:00:00');
      const sunDate = new Date(monDate);
      sunDate.setDate(sunDate.getDate() + 6);
      const yEnd = sunDate.getFullYear();
      const mEnd = String(sunDate.getMonth() + 1).padStart(2, '0');
      const dEnd = String(sunDate.getDate()).padStart(2, '0');
      const thisWeekEnd = `${yEnd}-${mEnd}-${dEnd}`;

      if (roleEmployee) {
        promises.push(
          apiClient(`/employees/${employee.id}/projects`),
          apiClient(`/timesheets/my-timesheets`),
          apiClient(`/employees/${employee.id}/time-entries?limit=100`),
          apiClient(`/reports/employee-summary?targetEmployeeId=${employee.id}&startDate=${thisWeekStart}&endDate=${thisWeekEnd}`)
        );
      } else {
        promises.push(Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve(null));
      }

      if (roleManager) {
        promises.push(
          apiClient(`/timesheets/approvals`),
          apiClient(`/teams?limit=100`),
          apiClient(`/projects`),
          apiClient(`/working-times`),
          apiClient(`/reports/manager-dashboard`),
          apiClient(`/reports/team-utilization`),
          apiClient(`/reports/manager-overdue-tasks`)
        );
      } else {
        promises.push(
          Promise.resolve([]), Promise.resolve([]), Promise.resolve([]), Promise.resolve(null), Promise.resolve(null), Promise.resolve(null), Promise.resolve(null)
        );
      }

      if (roleAdmin) {
        promises.push(
          apiClient(`/organizations/current`),
          apiClient(`/employees?limit=100`),
          apiClient(`/teams?limit=100`),
          apiClient(`/projects`),
          apiClient(`/employee-invitations`),
          Promise.resolve([]),
          apiClient(`/reports/admin-dashboard`),
          apiClient(`/audit-logs?limit=6`)
        );
      } else {
        promises.push(
          Promise.resolve(null),
          Promise.resolve(null),
          Promise.resolve(null),
          Promise.resolve([]),
          Promise.resolve([]),
          Promise.resolve([]),
          Promise.resolve([]),
          Promise.resolve(null),
          roleManager ? apiClient(`/audit-logs?limit=6`) : Promise.resolve([])
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
      const employeeSummaryData = extract(3, null);
      const approvals = extract(4, []);
      const managerTeamsList = extract(5, []);
      const managerProjectsList = extract(6, []);
      const mgrDashboardReport = extract(8, null);
      const mgrOverdueTasksReq = extract(10, null);
      const org = extract(11, null);
      const employeesList = extract(12, null);
      const teamsList = extract(13, null);
      const projectsList = extract(14, []);
      const invitationsList = extract(15, []);
      const adminDashboardReq = extract(17, null);
      const auditLogsReq = extract(18, []);

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

        entryArr.forEach((e: any) => {
          const h = Number(e.hours) || 0;
          if (e.date >= thisWeekStart && e.date <= thisWeekEnd) {
            wHours += h;
          }
          if (e.date === todayStr) {
            tHours += h;
          }
        });

        if (employeeSummaryData) {
          setWeeklyHours(employeeSummaryData.totalHours || 0);
          const todayItem = employeeSummaryData.dailyTotals?.find((d: any) => d.date === todayStr);
          setTodayHours(todayItem ? todayItem.hours : 0);
        } else {
          setWeeklyHours(wHours);
          setTodayHours(tHours);
        }

        const currentTs = tsArr.find((ts: any) => {
          if (!ts?.startDate) return false;
          const tsDateStr = typeof ts.startDate === 'string' ? ts.startDate.slice(0, 10) : new Date(ts.startDate).toISOString().slice(0, 10);
          return tsDateStr === thisWeekStart;
        });
        setCurrentTimesheet(currentTs || null);
        setCurrentTimesheetStatus(currentTs ? currentTs.status : 'NOT CREATED');
        setRecentTimesheets(tsArr.slice(0, 10));

        // Fetch tasks for active projects assigned to the employee
        const activeEmpProjects = projectArr.filter((p: any) => p.isActive !== false && p.status !== 'COMPLETED');
        let empTasks: any[] = [];
        if (activeEmpProjects.length > 0) {
          try {
            const taskResponses = await Promise.allSettled(
              activeEmpProjects.map((p: any) => apiClient(`/projects/${p.id}/tasks`).catch(() => []))
            );
            taskResponses.forEach((res, idx) => {
              const proj = activeEmpProjects[idx];
              if (res.status === 'fulfilled' && proj) {
                const tasks = Array.isArray(res.value) ? res.value : (res.value?.data ?? []);
                tasks.forEach((t: any) => {
                  if (t.isActive !== false) {
                    if (t.assigneeId === employee.id) {
                      empTasks.push({
                        ...t,
                        projectId: proj.id,
                        projectName: proj.name,
                        projectCode: proj.code,
                      });
                    }
                  }
                });
              }
            });
          } catch {
            // graceful fallback
          }
        }
        setEmployeeAssignedTasks(empTasks);

        const entriesWithProjects = entryArr.slice(0, 5).map((e: any) => {
          const p = projectArr.find((p: any) => p.id === e.projectId);
          const t = empTasks.find((task: any) => task.id === e.taskId);
          return {
            ...e,
            projectName: p?.name || 'General Project',
            taskName: e.taskName || e.task?.name || t?.name || null,
            ticketId: t?.ticketId || null,
          };
        });
        setRecentEntries(entriesWithProjects);
        setProjectsData(projectArr);
      }

      if (roleManager) {
        const appArr = Array.isArray(approvals) ? approvals : (approvals?.data ?? []);
        const aCount = approvals?.meta?.total !== undefined ? approvals.meta.total : appArr.length;
        setApprovalsCount(aCount);
        setManagerApprovalsList(appArr);

        const mTeams = Array.isArray(managerTeamsList) ? managerTeamsList : (managerTeamsList?.data ?? []);
        setManagerTeams(mTeams);
        const mProjects = Array.isArray(managerProjectsList) ? managerProjectsList : (managerProjectsList?.data ?? []);
        setManagerProjects(mProjects);

        if (mgrDashboardReport) setManagerReport(mgrDashboardReport);

        if (auditLogsReq) {
          setAuditLogs(Array.isArray(auditLogsReq) ? auditLogsReq : (auditLogsReq.data || []));
        }

        const activeMgrProjects = mProjects.filter((p: any) => p.isActive !== false && p.status !== 'COMPLETED').slice(0, 10);
        const overdueList: any[] = [];
        const taskMap: Record<string, { total: number; overdue: number; open: number }> = {};
        let calculatedOverdueCount = 0;

        if (activeMgrProjects.length > 0) {
          try {
            const taskResponses = await Promise.allSettled(
              activeMgrProjects.map((p: any) => apiClient(`/projects/${p.id}/tasks`).catch(() => []))
            );
            const nowMs = Date.now();
            taskResponses.forEach((res, idx) => {
              const proj = activeMgrProjects[idx];
              if (res.status === 'fulfilled' && proj) {
                const tasks = Array.isArray(res.value) ? res.value : (res.value?.data ?? []);
                let pOverdue = 0;
                let pOpen = 0;
                tasks.forEach((t: any) => {
                  if (t.isActive !== false && t.status !== 'DONE' && t.status !== 'COMPLETED') {
                    pOpen++;
                    if (t.dueDate && new Date(t.dueDate).getTime() < nowMs) {
                      pOverdue++;
                      calculatedOverdueCount++;
                      overdueList.push({
                        ...t,
                        projectId: proj.id,
                        projectName: proj.name,
                      });
                    }
                  }
                });
                taskMap[proj.id] = {
                  total: tasks.length,
                  open: pOpen,
                  overdue: pOverdue,
                };
              }
            });
          } catch {
            // graceful fallback
          }
        }

        setManagerProjectTasksMap(taskMap);
        setManagerOverdueTasksList(overdueList);
        setManagerOverdueTasks(
          mgrOverdueTasksReq?.totalOverdue !== undefined
            ? mgrOverdueTasksReq.totalOverdue
            : calculatedOverdueCount
        );
      }

      if (roleAdmin) {
        setOrgSummary(org);
        if (org?.name) {
          try {
            localStorage.setItem('cached_org_name', org.name);
          } catch {
            // ignore
          }
        }
        setEmployeesData(employeesList);
        setEmpCount(employeesList?.meta?.total || (Array.isArray(employeesList) ? employeesList.length : 0));
        setTeamsData(teamsList);
        setTeamCount(teamsList?.meta?.total || (Array.isArray(teamsList) ? teamsList.length : 0));

        const pList = Array.isArray(projectsList) ? projectsList : (projectsList?.data ?? []);
        setProjectsData(pList);

        const iList = Array.isArray(invitationsList) ? invitationsList : (invitationsList?.data ?? []);
        setInvitationsData(iList);

        if (adminDashboardReq) {
          setEmpCount(adminDashboardReq.totalEmployees || 0);
          setTeamCount(adminDashboardReq.totalTeams || 0);
          setAdminDashboardData(adminDashboardReq);
        }
        if (auditLogsReq) {
          setAuditLogs(Array.isArray(auditLogsReq) ? auditLogsReq : (auditLogsReq.data || []));
        }

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

  // Reset role-specific dashboard states on employee change / account switch
  useEffect(() => {
    setOrgSummary(null);
    setEmployeesData(null);
    setTeamsData(null);
    setProjectsData([]);
    setInvitationsData([]);
    setAdminDashboardData(null);
    setAuditLogs([]);
    setEmpCount(0);
    setTeamCount(0);
    setOverdueTasksCount(0);
    setManagerTeams([]);
    setManagerProjects([]);
    setManagerReport(null);
    setManagerOverdueTasks(0);
    setManagerApprovalsList([]);
    setManagerOverdueTasksList([]);
    setManagerProjectTasksMap({});
    setRecentTimesheets([]);
    setRecentEntries([]);
    setEmployeeAssignedTasks([]);
    setCurrentTimesheet(null);
    setApprovalsCount(0);
    setWeeklyHours(0);
    setTodayHours(0);
    setCurrentTimesheetStatus(null);
    setDashboardError(null);
  }, [employee?.id]);

  useEffect(() => {
    if (empLoading || !employee) return;
    fetchDashboardData();
  }, [employee, empLoading, fetchDashboardData]);

  const formatWeekRange = (startStr: string) => {
    const start = new Date(startStr);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return formatDateRange(start, end);
  };

  if (!employee && !empLoading) {
    if (empError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Connection Interrupted</h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md">
            {empError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-4 border border-slate-200">
          <UsersRound className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">No User Profile Selected</h2>
        <p className="text-xs text-slate-500 mt-1.5 max-w-md">
          Please select an authenticated employee context to access your operational dashboard.
        </p>
      </div>
    );
  }

  const weeklyPacePct = Math.min(100, Math.round((weeklyHours / 40) * 100));
  const employeeList = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);
  const totalEmployees = empCount > 0 ? empCount : (employeesData?.meta?.total ?? (employeeList.length > 0 ? employeeList.length : 0));
  const activeEmployees = adminDashboardData?.activeEmployees ?? (employeeList.length > 0 ? employeeList.filter((e: any) => e.isActive !== false).length : totalEmployees);
  const inactiveEmployees = adminDashboardData?.inactiveEmployees ?? Math.max(0, totalEmployees - activeEmployees);

  const teamList = Array.isArray(teamsData) ? teamsData : (teamsData?.data ?? []);
  const totalTeams = teamCount > 0 ? teamCount : (teamsData?.meta?.total ?? (teamList.length > 0 ? teamList.length : 0));
  const teamsWithoutManager = adminDashboardData?.teamsWithoutManager ?? teamList.filter((t: any) => !t.managerId).length;
  const activeProjectsCount = projectsData.filter((p: any) => p.status === 'ACTIVE').length;
  const projectStatusCounts = {
    ACTIVE: projectsData.filter((p: any) => p.status === 'ACTIVE').length,
    IN_PROGRESS: projectsData.filter((p: any) => p.status === 'IN_PROGRESS').length,
    PLANNING: projectsData.filter((p: any) => p.status === 'PLANNING').length,
    ON_HOLD: projectsData.filter((p: any) => p.status === 'ON_HOLD').length,
    COMPLETED: projectsData.filter((p: any) => p.status === 'COMPLETED').length,
  };
  const pendingInvitationsCount = invitationsData.length;
  const adminPendingActionsCount = pendingInvitationsCount + teamsWithoutManager + overdueTasksCount;

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
          auditLogs={auditLogs}
          totalTeams={totalTeams}
          teamsWithoutManager={teamsWithoutManager}
          activeProjectsCount={activeProjectsCount}
          projectsData={projectsData}
          projectStatusCounts={projectStatusCounts}
          pendingInvitationsCount={pendingInvitationsCount}
          overdueTasksCount={overdueTasksCount}
          pendingActionsCount={adminPendingActionsCount}
          getGreeting={getGreeting}
        />
      ) : roleManager ? (
        <ManagerDashboardView
          employee={employee}
          loading={loading}
          fetchDashboardData={fetchDashboardData}
          getGreeting={getGreeting}
          managerTeams={managerTeams}
          managerProjects={managerProjects}
          approvalsCount={approvalsCount}
          managerApprovalsList={managerApprovalsList}
          dashboardError={dashboardError}
          managerReport={managerReport}
          managerOverdueTasks={managerOverdueTasks}
          overdueTasksList={managerOverdueTasksList}
          projectTasksMap={managerProjectTasksMap}
          auditLogs={auditLogs}
        />
      ) : (
        <EmployeeDashboardView
          employee={employee}
          loading={loading}
          dashboardError={dashboardError}
          fetchDashboardData={fetchDashboardData}
          getGreeting={getGreeting}
          projectsData={projectsData}
          weeklyHours={weeklyHours}
          todayHours={todayHours}
          weeklyPacePct={weeklyPacePct}
          currentTimesheetStatus={currentTimesheetStatus}
          recentTimesheets={recentTimesheets}
          recentEntries={recentEntries}
          formatWeekRange={formatWeekRange}
          assignedTasks={employeeAssignedTasks}
          currentTimesheet={currentTimesheet}
        />
      )}
    </div>
  );
};

export default Dashboard;
