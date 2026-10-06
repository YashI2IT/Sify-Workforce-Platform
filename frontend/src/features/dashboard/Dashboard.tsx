import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, FileText, CheckCircle2, AlertCircle,
  Users, UsersRound, Building, CalendarDays,
  RefreshCw, Plus, ArrowRight,
  Mail, Briefcase
} from 'lucide-react';
import { apiClient } from '../../lib/apiClient';
import { useCurrentEmployee } from '../../hooks/useCurrentEmployee';
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
  auditLogs: any[];
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
        description: fields ? `Updated ${fields}` : 'Modified time entry details',
        iconType: 'time',
      };
    }
    case 'TIME_ENTRY_DELETED':
      return {
        title: 'Time Entry Deleted',
        description: 'Deleted time entry record',
        iconType: 'time',
      };
    case 'TIMESHEET_SUBMITTED':
    case 'SUBMISSION_CREATED':
      return {
        title: 'Timesheet Submitted',
        description: details.weekStart
          ? `Submitted timesheet for week of ${details.weekStart}`
          : details.date
            ? `Submitted timesheet for ${details.date}`
            : 'Submitted timesheet for manager review',
        iconType: 'time',
      };
    case 'TIMESHEET_APPROVED':
    case 'SUBMISSION_APPROVED':
      return {
        title: 'Timesheet Approved',
        description: 'Timesheet approved by manager',
        iconType: 'time',
      };
    case 'TIMESHEET_REJECTED':
    case 'SUBMISSION_REJECTED':
      return {
        title: 'Timesheet Rejected',
        description: details.comment ? `Rejected: "${details.comment}"` : 'Timesheet rejected for revision',
        iconType: 'time',
      };
    case 'TEAM_CREATED':
      return {
        title: 'Team Created',
        description: details.name ? `Created team "${details.name}"` : 'Created a new team',
        iconType: 'team',
      };
    case 'TEAM_UPDATED': {
      const fields = Array.isArray(details.updatedFields) ? details.updatedFields.join(', ') : '';
      return {
        title: 'Team Updated',
        description: fields ? `Updated ${fields}` : 'Updated team information',
        iconType: 'team',
      };
    }
    case 'TEAM_MANAGER_ASSIGNED':
      return {
        title: 'Team Manager Assigned',
        description: 'Assigned manager to lead team',
        iconType: 'team',
      };
    case 'TEAM_MANAGER_REMOVED':
      return {
        title: 'Team Manager Removed',
        description: 'Removed manager from team',
        iconType: 'team',
      };
    case 'EMPLOYEE_CREATED':
      return {
        title: 'Employee Added',
        description: details.name ? `Added ${details.name} to directory` : 'Added new employee to organization',
        iconType: 'user',
      };
    case 'EMPLOYEE_UPDATED': {
      const fields = Array.isArray(details.updatedFields) ? details.updatedFields.join(', ') : '';
      return {
        title: 'Employee Updated',
        description: fields ? `Updated ${fields}` : 'Modified employee account details',
        iconType: 'user',
      };
    }
    case 'EMPLOYEE_ACTIVATED':
      return {
        title: 'Employee Activated',
        description: 'Activated employee account access',
        iconType: 'user',
      };
    case 'EMPLOYEE_DEACTIVATED':
      return {
        title: 'Employee Deactivated',
        description: 'Deactivated employee account access',
        iconType: 'user',
      };
    case 'INVITATION_CREATED':
      return {
        title: 'Invitation Sent',
        description: details.invitedEmail ? `Sent invite to ${details.invitedEmail}` : 'Sent invitation to new team member',
        iconType: 'user',
      };
    case 'INVITATION_ACCEPTED':
      return {
        title: 'Invitation Accepted',
        description: 'New member accepted invite and joined',
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

const AdminDashboardView = ({
  employee,
  orgSummary,
  loading,
  fetchDashboardData,
  activeEmployees,
  inactiveEmployees,
  totalEmployees,
  auditLogs,
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
  const totalProjects = projectsData.length;

  return (
    <div className="space-y-7">
      {dashboardError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-[14px] text-xs text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
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

      {/* ── 1. Page Header ──────────────────────────────────────────────── */}
      <div className="animate-slideUpFade flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-[14px] leading-[21px] text-slate-500 font-medium mt-1.5">
            <span>{getGreeting()}, <span className="font-semibold text-slate-700">{employee?.name?.split(' ')[0] || employee?.name}</span></span>
            {orgSummary?.name ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {orgSummary.name}
                </span>
              </>
            ) : loading ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-block w-36 h-4 bg-slate-200/70 rounded-md animate-pulse align-middle" />
              </>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-xs text-[13.5px] font-semibold text-slate-700">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>

          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Organization Snapshot (Level 1: Key Metrics) ─────────────── */}
      <div className="space-y-3.5 animate-slideUpFade">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-900"></span>
            </span>
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Overview
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Key metrics across your organization
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Active Employees */}
          <Link
            to="/employees"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Employees
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {loading ? '—' : activeEmployees}
                </span>
                <span className="text-xs text-slate-400 font-medium">active</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {inactiveEmployees > 0 ? `${inactiveEmployees} inactive` : `Total: ${totalEmployees} employees`}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Directory</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Employees <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* Active Teams */}
          <Link
            to="/teams"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Teams
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                <UsersRound className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {loading ? '—' : totalTeams}
                </span>
                <span className="text-xs text-slate-400 font-medium">teams</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {teamsWithoutManager > 0 ? `${teamsWithoutManager} without manager` : 'All teams have managers'}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Teams</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Teams <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* Active Projects */}
          <Link
            to="/admin/projects"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Projects
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                  {loading ? '—' : activeProjectsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">projects</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {projectStatusCounts.COMPLETED > 0 ? `${projectStatusCounts.COMPLETED} completed` : `Total: ${totalProjects} projects`}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Projects</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Projects <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* Pending Actions */}
          <div
            className={`p-5 rounded-[14px] border shadow-xs transition-all duration-200 flex flex-col justify-between ${!loading && pendingActionsCount > 0
              ? 'bg-amber-50/40 border-amber-200/80'
              : 'bg-white/95 backdrop-blur-md border-slate-200/80'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${!loading && pendingActionsCount > 0 ? 'text-amber-800' : 'text-slate-500'
                }`}>
                Pending Actions
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${!loading && pendingActionsCount > 0
                ? 'bg-amber-100 text-amber-900 border border-amber-200/80'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
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
                <span className={`text-3xl font-bold tracking-tight ${!loading && pendingActionsCount > 0 ? 'text-amber-950' : 'text-slate-950'
                  }`}>
                  {loading ? '—' : pendingActionsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">pending</span>
              </div>
              <p className={`text-xs font-medium mt-1 ${!loading && pendingActionsCount > 0 ? 'text-amber-800' : 'text-slate-500'
                }`}>
                {!loading && pendingActionsCount > 0
                  ? 'Items requiring your attention'
                  : 'All workflows are up to date'}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-500">Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${!loading && pendingActionsCount > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                }`}>
                {!loading && pendingActionsCount > 0 ? 'Review below ↓' : 'All Clear'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Needs Attention (Level 2: Unified Operational Tray) ─────── */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Needs Attention
            </h2>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${pendingActionsCount > 0
            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            }`}>
            {pendingActionsCount} {pendingActionsCount === 1 ? 'Action Item' : 'Action Items'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* A. Pending Invitations */}
          <Link
            to="/employees"
            className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Invitations
                </span>
                <Mail className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${pendingInvitationsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                  {loading ? '—' : pendingInvitationsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">pending</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {pendingInvitationsCount > 0 ? 'Invites awaiting employee acceptance' : 'No pending invitations'}
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Invitations</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* B. Teams Without Manager */}
          <Link
            to="/teams"
            className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Teams Without Manager
                </span>
                <UsersRound className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${teamsWithoutManager > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                  {loading ? '—' : teamsWithoutManager}
                </span>
                <span className="text-xs text-slate-400 font-medium">teams</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {teamsWithoutManager > 0 ? 'Teams without an assigned manager' : 'All teams have assigned managers'}
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Teams</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Assign <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* C. Pending Approvals */}
          <Link
            to="/approvals"
            className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${pendingApprovalsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                  {loading ? '—' : pendingApprovalsCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">timesheets</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {pendingApprovalsCount > 0 ? 'Timesheets waiting for approval' : 'No timesheets pending review'}
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Approvals</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Review <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* D. Overdue Project Work */}
          <Link
            to="/admin/projects"
            className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Overdue Project Work
                </span>
                <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${overdueTasksCount > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                  {loading ? '—' : overdueTasksCount}
                </span>
                <span className="text-xs text-slate-400 font-medium">tasks</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {overdueTasksCount > 0 ? 'Tasks past their due date' : 'No tasks overdue'}
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Projects</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. Recent Activity (Level 3: Governance Stream) ─────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Recent Activity
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Activity Log
          </span>
        </div>

        {auditLogs && auditLogs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {auditLogs.map((log) => {
              const activity = formatAuditActivity(log);
              return (
                <div key={log.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {activity.iconType === 'project' && <Briefcase className="w-4 h-4" />}
                      {activity.iconType === 'time' && <Clock className="w-4 h-4" />}
                      {activity.iconType === 'user' && <Users className="w-4 h-4" />}
                      {activity.iconType === 'team' && <UsersRound className="w-4 h-4" />}
                      {activity.iconType === 'org' && <Building className="w-4 h-4" />}
                      {activity.iconType === 'default' && <Clock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{activity.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {log.actorName || log.actorEmail || 'System'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
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
          <div className="py-14 px-6 text-center">
            <div className="w-12 h-9 rounded-[14px] bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3.5 border border-slate-200/80">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Organization activity will appear here once system activity tracking is enabled.
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              System-wide operational audit ledger and event streaming will automatically populate security, workforce, and governance actions as they occur.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};




interface ManagerDashboardViewProps {
  employee: any;
  loading: boolean;
  fetchDashboardData: () => void;
  getGreeting: () => string;
  managerTeams: any[];
  managerProjects: any[];
  approvalsCount: number;
  dashboardError?: string | null;
  managerReport: {
    totalTeamMembers: number;
    managedTeamsCount: number;
    activeProjectsCount?: number;
    projectStatusCounts?: any;
  } | null;
  managerOverdueTasks: number;
  auditLogs: any[];
}

const StatSkeleton = () => (
  <span className="inline-block w-10 h-7 bg-slate-200 rounded animate-pulse" />
);

const ManagerDashboardView = ({
  employee,
  loading,
  fetchDashboardData,
  getGreeting,
  managerTeams,
  managerProjects,
  approvalsCount,
  dashboardError,
  managerReport,
  managerOverdueTasks,
  auditLogs,
}: ManagerDashboardViewProps) => {

  // ── Team Snapshot ───────────────────────────────────────────────────────────
  const teamMembersCount = managerReport?.totalTeamMembers
    ?? managerTeams.reduce((acc, t) => acc + (t.memberCount || 0), 0);
  // ── Project Status ──────────────────────────────────────────────────────────
  const activeProjectsCount = managerReport?.activeProjectsCount ?? managerProjects.filter(p => p.isActive !== false).length;

  return (
    <div className="space-y-7 animate-fadeIn">
      {/* Error Banner */}
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

      {/* ── 1. Header ────────────────────────────────────────────────────────── */}
      <div className="animate-slideUpFade flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {getGreeting()}, {employee?.name?.split(' ')[0]}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {employee?.roles?.map((role: string) => (
                <span
                  key={role}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${role === 'MANAGER'
                    ? 'bg-[#12161F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                >
                  {role === 'MANAGER' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                  {role}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Team control center — approvals, workforce health, and project status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-xs text-[13.5px] font-semibold text-slate-700">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* ── 2. Team Snapshot (Distinct KPIs) ────────────────────────────────── */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Team Snapshot
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Managed functional telemetry
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Managed Teams */}
          <Link
            to="/teams"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Managed Teams</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                <UsersRound className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {loading ? <StatSkeleton /> : (managerTeams.length || 1)}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">Assigned squads</p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Teams</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Manage <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* Team Members */}
          <Link
            to="/employees"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Members</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {loading ? <StatSkeleton /> : teamMembersCount}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">Managed personnel</p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Roster</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* Active Projects */}
          <Link
            to="/projects"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Projects</span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                <Briefcase className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {loading ? <StatSkeleton /> : activeProjectsCount}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">Assigned to you</p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Workspaces</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* Pending Review */}
          <Link
            to="/approvals"
            className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Review</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 ${approvalsCount > 0
                ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                : 'bg-slate-100 text-slate-600 group-hover:bg-[#12161F] group-hover:text-white'
                }`}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`text-3xl font-bold tracking-tight ${approvalsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}>
                {loading ? <StatSkeleton /> : approvalsCount}
              </span>
              <p className="text-xs text-slate-500 font-medium mt-1">Timesheets to approve</p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
              <span>Approvals</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Review <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 3. Needs Attention ───────────────────────────────────────────────── */}
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Needs Attention
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
            Priority Queue
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* A. Pending Timesheet Approvals */}
          <Link
            to="/approvals"
            className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pending Approvals
                </span>
                <Clock className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${loading ? '' : approvalsCount > 0 ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                  {loading ? <StatSkeleton /> : approvalsCount}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Submitted timesheets awaiting your review</p>
              {!loading && approvalsCount === 0 && (
                <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> You're all caught up.
                </p>
              )}
            </div>
            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
              <span>Approval Queue</span>
              <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Open <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </span>
            </div>
          </Link>

          {/* B. Overdue Tasks */}
          <div className="p-5 flex flex-col justify-between hover:bg-slate-50/60 transition-colors">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Overdue Tasks
                </span>
                <AlertCircle className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${loading ? '' : managerOverdueTasks > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}>
                  {loading ? <StatSkeleton /> : managerOverdueTasks}
                </span>
              </div>
              {!loading && managerOverdueTasks > 0 && (
                <p className="text-xs text-rose-600 mt-1">Tasks past due date in your assigned projects</p>
              )}
              {!loading && managerOverdueTasks === 0 && (
                <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No overdue work.
                </p>
              )}
            </div>
            {!loading && managerProjects.length > 0 && (
              <div className="mt-4 pt-2.5 border-t border-slate-100">
                <Link
                  to="/projects"
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 group"
                >
                  <span>View Projects</span>
                  <span className="group-hover:translate-x-0.5 transition-transform"><ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ── 6. Bottom Section (Recent Activity + Workforce Standard) ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
        {/* Recent Activity */}
        <div className="lg:col-span-3 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Recent Activity
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Activity Log
            </span>
          </div>
          {auditLogs && auditLogs.length > 0 ? (
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
              {auditLogs.map((log) => {
                const activity = formatAuditActivity(log);
                return (
                  <div key={log.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        {activity.iconType === 'project' && <Briefcase className="w-4 h-4" />}
                        {activity.iconType === 'time' && <Clock className="w-4 h-4" />}
                        {activity.iconType === 'user' && <Users className="w-4 h-4" />}
                        {activity.iconType === 'team' && <UsersRound className="w-4 h-4" />}
                        {activity.iconType === 'org' && <Building className="w-4 h-4" />}
                        {activity.iconType === 'default' && <Clock className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{activity.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{activity.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {log.actorName || log.actorEmail || 'System'}
                      </p>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
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
            <div className="py-12 px-6 text-center flex-1 flex flex-col justify-center">
              <div className="w-12 h-9 rounded-[14px] bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-200/80">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900">No recent team activity</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Timesheet approvals and team task events will appear here once activity tracking is active.
              </p>
            </div>
          )}
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

  // Manager Dashboard State
  const [managerTeams, setManagerTeams] = useState<any[]>([]);
  const [managerProjects, setManagerProjects] = useState<any[]>([]);
  const [managerReport, setManagerReport] = useState<any>(null);
  const [managerOverdueTasks, setManagerOverdueTasks] = useState(0);

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
          apiClient(`/timesheets/approvals`),
          apiClient(`/reports/admin-dashboard`),
          apiClient(`/audit-logs?limit=5`)
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
          roleManager ? apiClient(`/audit-logs?limit=5`) : Promise.resolve([])
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
      const approvalsList = extract(16, []);
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

        // Use the native backend report for correct weekly totals, overriding the paginated local sum
        if (employeeSummaryData) {
          setWeeklyHours(employeeSummaryData.totalHours || 0);

          // Get today's hours from the backend's dailyTotals map
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
        const mTeams = Array.isArray(managerTeamsList) ? managerTeamsList : (managerTeamsList?.data ?? []);
        setManagerTeams(mTeams);
        const mProjects = Array.isArray(managerProjectsList) ? managerProjectsList : (managerProjectsList?.data ?? []);
        setManagerProjects(mProjects);


        if (mgrDashboardReport) setManagerReport(mgrDashboardReport);


        setManagerOverdueTasks(mgrOverdueTasksReq?.totalOverdue || 0);
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

        const aList = Array.isArray(approvalsList) ? approvalsList : (approvalsList?.data ?? []);
        const aCount = approvalsList?.meta?.total !== undefined ? approvalsList.meta.total : aList.length;
        setApprovalsCount(aCount);

        if (adminDashboardReq) {
          setEmpCount(adminDashboardReq.totalEmployees || 0);
          setTeamCount(adminDashboardReq.totalTeams || 0);
          setAdminDashboardData(adminDashboardReq);
        }
        if (auditLogsReq) {
          setAuditLogs(Array.isArray(auditLogsReq) ? auditLogsReq : (auditLogsReq.data || []));
        }

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


  if (!employee && !empLoading) {
    if (empError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center p-6">
          <div className="w-14 h-9 rounded-[14px] bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 ">Connection Interrupted</h2>
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
        <div className="w-14 h-9 rounded-[14px] bg-slate-100 text-slate-600 flex items-center justify-center mb-4 border border-slate-200">
          <UsersRound className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 ">No User Profile Selected</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md">
          Please select an authenticated employee context to access your operational dashboard.
        </p>
      </div>
    );
  }

  const weeklyPacePct = Math.min(100, Math.round((weeklyHours / 40) * 100));

  const employeeList = Array.isArray(employeesData) ? employeesData : (employeesData?.data ?? []);

  // Try to use true server counts from meta or the new admin API
  const totalEmployees = empCount > 0 ? empCount : (employeesData?.meta?.total ?? (employeeList.length > 0 ? employeeList.length : 0));

  // Use active/inactive from employeeList if not provided by backend? Wait, if we use the backend, we should have it in state.
  // We can just compute it directly if available, else fallback
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
  const pendingApprovalsCount = approvalsCount;
  const pendingActionsCount = pendingInvitationsCount + teamsWithoutManager + pendingApprovalsCount + overdueTasksCount;

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
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
          pendingApprovalsCount={pendingApprovalsCount}
          overdueTasksCount={overdueTasksCount}
          pendingActionsCount={pendingActionsCount}
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
          dashboardError={dashboardError}
          managerReport={managerReport}
          managerOverdueTasks={managerOverdueTasks}
          auditLogs={auditLogs}
        />
      ) : (
        <>
          {/* ── 1. Page Header ──────────────────────────────────────────────── */}
          <div className="animate-slideUpFade flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[28px] leading-[34px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  {getGreeting()}, {employee?.name?.split(' ')[0]}
                </h1>

                <div className="flex items-center gap-2 flex-wrap">
                  {employee?.roles?.map((role: string) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Workforce operations, logged hours velocity, and timesheet review workflow.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-xs text-[13.5px] font-semibold text-slate-700">
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
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:bg-slate-100 active:scale-[0.98]"
                title="Refresh dashboard metrics"
              >
                <RefreshCw className={`w-4 h-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180 ${loading ? 'animate-spin text-slate-900' : ''}`} />
                <span>Refresh Dashboard</span>
              </button>

              {roleEmployee && (
                <Link
                  to="/time-entries"
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-[10px] text-[13px] leading-[18px] font-semibold shadow-xs transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  <span>Log Time</span>
                </Link>
              )}
            </div>
          </div>

          {dashboardError && (
            <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-[14px] text-xs text-amber-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
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

          {/* ── 2. Personal Snapshot ─────────────────────────────────────────── */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Personal Snapshot
                </h2>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Real-time operational telemetry
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {/* Active Projects */}
              <Link
                to="/projects"
                className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Active Projects
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">
                      {loading ? '—' : projectsData.length}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">projects</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Assigned deliverables</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
                  <span>Assigned</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View All <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>

              {/* Weekly Logged */}
              <div className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs transition-all duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Weekly Logged
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">
                      {loading ? '—' : weeklyHours.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">hrs</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Current work week cycle</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Pace</span>
                  <span className="font-semibold text-slate-800">{weeklyPacePct}% of 40h target</span>
                </div>
              </div>

              {/* Today's Hours */}
              <div className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs transition-all duration-200 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Today's Hours
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-900 tracking-tight">
                      {loading ? '—' : todayHours.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">hrs</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">Daily logged progress</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                  <span>Target (8h)</span>
                  <span className={`font-semibold ${todayHours >= 8 ? 'text-emerald-700' : 'text-slate-800'}`}>
                    {todayHours >= 8 ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>

              {/* Current Timesheet */}
              <Link
                to="/timesheets"
                className="bg-white/95 backdrop-blur-md p-5 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Current Timesheet
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(currentTimesheetStatus || 'NOT CREATED')}`}>
                    {loading ? '...' : (currentTimesheetStatus || 'NOT CREATED')}
                  </span>
                  <p className="text-xs text-slate-500 font-medium mt-2">Active week status</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-slate-900">
                  <span>Timesheet Cycle</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Review <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* ── 3. Needs Attention ───────────────────────────────────────────── */}
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Needs Attention
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                Review Items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <Link
                to="/timesheets"
                className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Rejected Timesheets
                    </span>
                    <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${recentTimesheets.some(t => t.status === 'REJECTED') ? 'text-rose-600' : 'text-slate-900'}`}>
                      {loading ? '—' : recentTimesheets.filter(t => t.status === 'REJECTED').length}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">timesheets</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {recentTimesheets.some(t => t.status === 'REJECTED') ? 'Action required on rejected sheets' : 'No rejected timesheets'}
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                  <span>Fix & Resubmit</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>

              <Link
                to="/time-entries"
                className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Draft Timesheets
                    </span>
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${recentTimesheets.some(t => t.status === 'DRAFT') ? 'text-amber-600' : 'text-slate-900'}`}>
                      {loading ? '—' : recentTimesheets.filter(t => t.status === 'DRAFT').length}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">timesheets</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {recentTimesheets.some(t => t.status === 'DRAFT') ? 'Pending submission' : 'All drafted timesheets submitted'}
                  </p>
                </div>
                <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600 group-hover:text-slate-900">
                  <span>Submit Work</span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Open <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* ── 4. Project & Timesheet Feed ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 items-stretch">
            {/* Project Status */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-6 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Project Status
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {projectsData.length} assigned
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {projectsData.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200/60 shadow-xs">
                        <Briefcase className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500 font-medium">{p.status}</p>
                      </div>
                    </div>
                    <Link
                      to={`/projects/${p.id}`}
                      className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </Link>
                  </div>
                ))}
                {projectsData.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No projects assigned.</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/projects"
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center justify-between group"
                >
                  <span>View All Projects</span>
                  <span className="group-hover:translate-x-0.5 transition-transform"><ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></span>
                </Link>
              </div>
            </div>

            {/* Recent Timesheets */}
            <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] p-6 hover:shadow-md transition-shadow duration-200 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Recent Timesheets
                  </h3>
                </div>
                <Link
                  to="/timesheets"
                  className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {recentTimesheets.slice(0, 3).map(ts => (
                  <div key={ts.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-200/60 shadow-xs">
                        <CalendarDays className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{formatWeekRange(ts.startDate)}</p>
                        <p className="text-xs text-slate-500 font-medium">{Number(ts.totalHours || 0).toFixed(1)} hrs</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(ts.status)}`}>
                      {ts.status}
                    </span>
                  </div>
                ))}
                {recentTimesheets.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No recent timesheets.</p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100">
                <Link
                  to="/timesheets"
                  className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center justify-between group"
                >
                  <span>Manage Timesheet Cycles</span>
                  <span className="group-hover:translate-x-0.5 transition-transform"><ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} /></span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── 5. Quick Actions ─────────────────────────────────────────────── */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                to="/time-entries"
                className="bg-white/95 backdrop-blur-md p-4 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-slate-950">Log Time</p>
                  <p className="text-xs text-slate-400">Record daily hours</p>
                </div>
              </Link>

              <Link
                to="/timesheets"
                className="bg-white/95 backdrop-blur-md p-4 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-slate-950">Timesheets</p>
                  <p className="text-xs text-slate-400">Review & Submit</p>
                </div>
              </Link>

              <Link
                to="/projects"
                className="bg-white/95 backdrop-blur-md p-4 rounded-[14px] border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200 flex items-center gap-3.5 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-[#12161F] group-hover:text-white transition-colors duration-200 shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-slate-950">Projects</p>
                  <p className="text-xs text-slate-400">View tasks & details</p>
                </div>
              </Link>
            </div>
          </div>

          {/* ── 6. Bottom Section ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">
            <div className="lg:col-span-2 bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs rounded-[14px] overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900" />
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Recent Time Entries
                  </h2>
                </div>
                <Link
                  to="/time-entries"
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors"
                >
                  View full ledger <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">Loading...</div>
                ) : recentEntries.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">No recent time entries.</div>
                ) : (
                  <div className="space-y-3">
                    {recentEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/60">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{entry.projectName}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-900 border border-slate-200 shadow-2xs">
                          {Number(entry.hours).toFixed(1)} hrs
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1 bg-[#12161F] text-white rounded-[14px] p-6 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#27F087] uppercase tracking-wider">
                    Workforce Standard
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#27F087] animate-pulse" />
                </div>
                <h4 className="text-xl font-bold text-white mb-2 tracking-tight">40h Weekly Baseline</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Timesheets close every Sunday at 23:59. Ensure daily entries are attributed to accurate deliverables.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Current Status: Active</span>
                <Link to="/timesheets" className="text-[#27F087] font-bold hover:underline flex items-center gap-1">
                  Cycle Guide <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
export default Dashboard;


