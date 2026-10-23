import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { or } from '@prisma/orm-postgres/orm-client';

export const ACTION_READABLE_MAP: Record<string, string> = {
  // Projects
  PROJECT_CREATED: 'Project created',
  PROJECT_UPDATED: 'Project updated',
  PROJECT_ACTIVATED: 'Project activated',
  PROJECT_DEACTIVATED: 'Project deactivated',
  PROJECT_DELETED: 'Project deleted',
  EMPLOYEE_ASSIGNED_TO_PROJECT: 'Assigned to project',
  EMPLOYEE_REMOVED_FROM_PROJECT: 'Removed from project',

  // Timesheets & Time Entries
  TIME_ENTRY_CREATED: 'Time entry created',
  TIME_ENTRY_UPDATED: 'Time entry updated',
  TIME_ENTRY_DELETED: 'Time entry deleted',
  TIMESHEET_SUBMITTED: 'Timesheet submitted',
  TIMESHEET_APPROVED: 'Timesheet approved',
  TIMESHEET_REJECTED: 'Timesheet rejected',
  SUBMISSION_CREATED: 'Submission created',
  SUBMISSION_APPROVED: 'Submission approved',
  SUBMISSION_REJECTED: 'Submission rejected',

  // Teams
  TEAM_CREATED: 'Team created',
  TEAM_UPDATED: 'Team updated',
  TEAM_MANAGER_ASSIGNED: 'Team manager assigned',
  TEAM_MANAGER_REMOVED: 'Team manager removed',

  // Employees & Onboarding
  EMPLOYEE_CREATED: 'Employee onboarded',
  EMPLOYEE_UPDATED: 'Employee updated',
  EMPLOYEE_ACTIVATED: 'Employee activated',
  EMPLOYEE_DEACTIVATED: 'Employee deactivated',

  // Invitations
  INVITATION_CREATED: 'Invitation sent',
  INVITATION_ACCEPTED: 'Invitation accepted',
  INVITATION_DECLINED: 'Invitation declined',
  INVITATION_REVOKED: 'Invitation revoked',
  INVITATION_RESENT: 'Invitation resent',

  // Organization & Settings
  ORGANIZATION_CREATED: 'Organization created',
  ORGANIZATION_UPDATED: 'Organization details updated',
  ORGANIZATION_SETTINGS_UPDATED: 'Organization settings updated',

  // Public Holidays & Work Calendars
  PUBLIC_HOLIDAY_CREATED: 'Public holiday added',
  PUBLIC_HOLIDAY_UPDATED: 'Public holiday updated',
  PUBLIC_HOLIDAY_DELETED: 'Public holiday deleted',
  WORKING_HOURS_UPDATED: 'Working hours updated',
};

export function formatAuditAction(action: string): string {
  if (!action) return 'Unknown action';
  if (ACTION_READABLE_MAP[action]) {
    return ACTION_READABLE_MAP[action];
  }
  return action
    .toLowerCase()
    .split('_')
    .map((word, idx) => (idx === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function formatDetailsSummary(details: any): string {
  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
    return 'No additional details recorded';
  }

  if (Array.isArray(details.updatedFields) && details.updatedFields.length > 0) {
    const formattedFields = details.updatedFields
      .map((f: string) => f.replace(/([A-Z])/g, ' $1').toLowerCase().trim())
      .map((f: string) => f.charAt(0).toUpperCase() + f.slice(1));
    return `Changed fields: ${formattedFields.join(', ')}`;
  }

  if (details.changes && typeof details.changes === 'object') {
    const parts: string[] = [];
    for (const [key, val] of Object.entries(details.changes)) {
      if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
        const fromVal = (val as any).from ?? 'None';
        const toVal = (val as any).to ?? 'None';
        parts.push(`${key}: ${fromVal} → ${toVal}`);
      }
    }
    if (parts.length > 0) {
      return parts.join(' · ');
    }
  }

  if (details.invitedEmail) {
    const rolePart = details.role ? ` (${details.role})` : '';
    return `Invited ${details.invitedEmail}${rolePart}`;
  }

  if (details.assignedEmployeeName) {
    return `Assigned: ${details.assignedEmployeeName}`;
  }

  if (details.removedEmployeeName) {
    return `Removed: ${details.removedEmployeeName}`;
  }

  if (details.hours !== undefined && details.date) {
    return `${details.hours} hrs on ${details.date}`;
  }

  if (details.type && details.weekStart) {
    const hoursPart = details.totalHours !== undefined ? ` • ${details.totalHours} hrs` : '';
    return `Week of ${details.weekStart}${hoursPart}`;
  }

  if (details.type && details.date) {
    return `${details.type} • ${details.date}`;
  }

  if (details.comment) {
    return `Comment: "${details.comment}"`;
  }

  if (details.reason) {
    return `Reason: "${details.reason}"`;
  }

  if (details.name) {
    return `Name: "${details.name}"`;
  }

  const entries = Object.entries(details)
    .filter(([k]) => k !== 'updatedFields')
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  return entries.length > 0 ? entries.join(', ') : 'Event payload recorded';
}

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface AuditLogFilterOptions {
  actorId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  search?: string;
  sortOrder?: 'desc' | 'asc';
}

@Injectable()
export class AuditLogsService {
  /**
   * Internal method for writing audit logs from other services.
   * Does NOT check permissions, so it should only be called by trusted backend code.
   */
  async logEvent(
    organizationId: string,
    actorId: string | null,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any,
    externalTx?: any,
  ): Promise<void> {
    try {
      const orm = externalTx ? externalTx.orm : db.orm;
      let safeDetails = details;
      if (safeDetails && typeof safeDetails === 'object') {
        safeDetails = { ...safeDetails };
        const sensitiveKeys = ['password', 'token', 'refreshToken', 'secret', 'apiKey'];
        for (const key of sensitiveKeys) {
          if (key in safeDetails) {
            safeDetails[key] = '[REDACTED]';
          }
        }
      }

      await orm.public.AuditLog.create({
        organizationId,
        actorId,
        action,
        resourceType,
        resourceId: resourceId || null,
        details: safeDetails ? JSON.stringify(safeDetails) : null,
      });
    } catch (e) {
      console.error('Failed to write audit log', e);
      // We generally do not want to crash the main business operation if audit logging fails
    }
  }

  /**
   * Builds the filtered query across organization audit logs with search, actor matching, and date range.
   */
  private async buildFilterQuery(auth: AuthenticatedContext, filters?: AuditLogFilterOptions) {
    let query = db.orm.public.AuditLog.where({ organizationId: auth.organizationId });

    if (filters?.actorId && filters.actorId !== 'ALL') {
      query = query.where({ actorId: filters.actorId });
    }
    if (filters?.action && filters.action !== 'ALL') {
      query = query.where({ action: filters.action });
    }
    if (filters?.resourceType && filters.resourceType !== 'ALL') {
      query = query.where({ resourceType: filters.resourceType });
    }
    if (filters?.resourceId && filters.resourceId.trim()) {
      query = query.where({ resourceId: filters.resourceId.trim() });
    }
    if (filters?.from) {
      query = query.where((log: any) => log.createdAt.gte(filters.from!));
    }
    if (filters?.to) {
      query = query.where((log: any) => log.createdAt.lte(filters.to!));
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      const pattern = `%${q}%`;

      // Find matching actors within the organization
      const matchedEmployees = await db.orm.public.Employee
        .where({ organizationId: auth.organizationId })
        .where((e: any) => or(e.name.ilike(pattern), e.email.ilike(pattern)))
        .select('id')
        .all();
      const matchedActorIds = matchedEmployees.map((e: any) => e.id);

      // Convert spaced queries to action CANDIDATES like PROJECT_UPDATED
      const actionCandidate = q.replace(/[\s-]+/g, '_').toUpperCase();
      const actionPattern = `%${actionCandidate}%`;

      if (matchedActorIds.length > 0) {
        query = query.where((log: any) =>
          or(
            log.action.ilike(pattern),
            log.action.ilike(actionPattern),
            log.resourceType.ilike(pattern),
            log.resourceId.ilike(pattern),
            log.id.ilike(pattern),
            log.details.ilike(pattern),
            log.actorId.in(matchedActorIds),
          ),
        );
      } else {
        query = query.where((log: any) =>
          or(
            log.action.ilike(pattern),
            log.action.ilike(actionPattern),
            log.resourceType.ilike(pattern),
            log.resourceId.ilike(pattern),
            log.id.ilike(pattern),
            log.details.ilike(pattern),
          ),
        );
      }
    }

    return query;
  }

  /**
   * Enriches audit logs with human-readable names for referenced entities (employees, projects, teams)
   * so administrators never see raw, hard-to-remember UUIDs in the activity inspection or changes made.
   */
  async enrichAuditLogs(organizationId: string, rawLogs: any[]): Promise<any[]> {
    if (!rawLogs || rawLogs.length === 0) return [];

    const employeeIds = new Set<string>();
    const projectIds = new Set<string>();
    const teamIds = new Set<string>();

    for (const log of rawLogs) {
      if (log.resourceType === 'Employee' && log.resourceId) employeeIds.add(log.resourceId);
      if (log.resourceType === 'Project' && log.resourceId) projectIds.add(log.resourceId);
      if (log.resourceType === 'Team' && log.resourceId) teamIds.add(log.resourceId);

      let details: any = null;
      try {
        details = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : null;
      } catch {
        details = null;
      }

      if (details && typeof details === 'object') {
        if (details.assignedEmployeeId) employeeIds.add(details.assignedEmployeeId);
        if (details.removedEmployeeId) employeeIds.add(details.removedEmployeeId);
        if (details.employeeId) employeeIds.add(details.employeeId);
        if (details.managerId) employeeIds.add(details.managerId);
        if (details.projectId) projectIds.add(details.projectId);
        if (details.teamId) teamIds.add(details.teamId);
      }
    }

    const employeeMap = new Map<string, { id: string; name: string; email: string }>();
    const projectMap = new Map<string, { id: string; name: string }>();
    const teamMap = new Map<string, { id: string; name: string }>();

    try {
      const [employees, projects, teams] = await Promise.all([
        employeeIds.size > 0 && db.orm.public.Employee?.where
          ? db.orm.public.Employee
              .where({ organizationId })
              .where((e: any) => e.id.in(Array.from(employeeIds)))
              .select('id', 'name', 'email')
              .all()
          : [],
        projectIds.size > 0 && db.orm.public.Project?.where
          ? db.orm.public.Project
              .where({ organizationId })
              .where((p: any) => p.id.in(Array.from(projectIds)))
              .select('id', 'name')
              .all()
          : [],
        teamIds.size > 0 && db.orm.public.Team?.where
          ? db.orm.public.Team
              .where({ organizationId })
              .where((t: any) => t.id.in(Array.from(teamIds)))
              .select('id', 'name')
              .all()
          : [],
      ]);

      if (Array.isArray(employees)) {
        for (const e of employees) {
          if (e?.id) employeeMap.set(e.id, e);
        }
      }
      if (Array.isArray(projects)) {
        for (const p of projects) {
          if (p?.id) projectMap.set(p.id, p);
        }
      }
      if (Array.isArray(teams)) {
        for (const t of teams) {
          if (t?.id) teamMap.set(t.id, t);
        }
      }
    } catch {
      // Graceful degradation in mock environments or test runs
    }

    return rawLogs.map((log: any) => {
      let parsedDetails: any = null;
      try {
        parsedDetails = log.details ? (typeof log.details === 'string' ? JSON.parse(log.details) : log.details) : null;
      } catch {
        parsedDetails = { raw: log.details };
      }

      if (parsedDetails && typeof parsedDetails === 'object') {
        if (parsedDetails.assignedEmployeeId && !parsedDetails.assignedEmployeeName) {
          const emp = employeeMap.get(parsedDetails.assignedEmployeeId);
          if (emp?.name) parsedDetails.assignedEmployeeName = emp.name;
        }
        if (parsedDetails.removedEmployeeId && !parsedDetails.removedEmployeeName) {
          const emp = employeeMap.get(parsedDetails.removedEmployeeId);
          if (emp?.name) parsedDetails.removedEmployeeName = emp.name;
        }
        if (parsedDetails.employeeId && !parsedDetails.employeeName) {
          const emp = employeeMap.get(parsedDetails.employeeId);
          if (emp?.name) parsedDetails.employeeName = emp.name;
        }
        if (parsedDetails.managerId && !parsedDetails.managerName) {
          const emp = employeeMap.get(parsedDetails.managerId);
          if (emp?.name) parsedDetails.managerName = emp.name;
        }
        if (parsedDetails.projectId && !parsedDetails.projectName) {
          const proj = projectMap.get(parsedDetails.projectId);
          if (proj?.name) parsedDetails.projectName = proj.name;
        }
        if (parsedDetails.teamId && !parsedDetails.teamName) {
          const team = teamMap.get(parsedDetails.teamId);
          if (team?.name) parsedDetails.teamName = team.name;
        }
      }

      let resourceName: string | null = null;
      if (log.resourceType === 'Project' && log.resourceId) {
        resourceName = projectMap.get(log.resourceId)?.name || parsedDetails?.projectName || null;
      } else if (log.resourceType === 'Employee' && log.resourceId) {
        resourceName = employeeMap.get(log.resourceId)?.name || parsedDetails?.employeeName || null;
      } else if (log.resourceType === 'Team' && log.resourceId) {
        resourceName = teamMap.get(log.resourceId)?.name || parsedDetails?.teamName || null;
      }

      const actorName = log.actor?.name || (log.actorId ? 'Former Employee' : 'System');
      const actorEmail = log.actor?.email || null;
      const readableAction = formatAuditAction(log.action);
      const detailsSummary = formatDetailsSummary(parsedDetails);

      return {
        id: log.id,
        organizationId: log.organizationId,
        actorId: log.actorId,
        actorName,
        actorEmail,
        action: log.action,
        readableAction,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        resourceName,
        details: parsedDetails,
        detailsSummary,
        createdAt: log.createdAt,
      };
    });
  }

  /**
   * Retrieves paginated audit logs for a given organization.
   * Restricts to ADMIN and MANAGER.
   */
  async findOrganizationAuditLogs(
    auth: AuthenticatedContext,
    page: number = 1,
    limit: number = 50,
    filters?: AuditLogFilterOptions,
  ): Promise<PaginatedResponse<any>> {
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only Administrators and Managers can view organization audit logs');
    }

    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    const offset = (safePage - 1) * safeLimit;
    const sortOrder = filters?.sortOrder === 'asc' ? 'asc' : 'desc';

    const baseQuery = await this.buildFilterQuery(auth, filters);

    let queryWithActor = baseQuery.include('actor');
    if (sortOrder === 'asc') {
      queryWithActor = queryWithActor.orderBy((log: any) => log.createdAt.asc());
    } else {
      queryWithActor = queryWithActor.orderBy((log: any) => log.createdAt.desc());
    }

    const [rawLogs, countAgg] = await Promise.all([
      queryWithActor.limit(safeLimit).offset(offset).all(),
      baseQuery.aggregate((a: any) => ({ count: a.count() })),
    ]);

    const total = Number((countAgg as any)?.count || 0);
    const formattedLogs = await this.enrichAuditLogs(auth.organizationId, rawLogs);

    return {
      data: formattedLogs,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  /**
   * Retrieves available filter choices (actions, resourceTypes, actors) for the organization.
   */
  async getFilterOptions(auth: AuthenticatedContext) {
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only Administrators and Managers can access audit log filter options');
    }

    // Sample distinct recorded actions & resources from the organization's history
    const logs = await db.orm.public.AuditLog
      .where({ organizationId: auth.organizationId })
      .select('action', 'resourceType')
      .limit(1000)
      .all();

    const dbActions = new Set<string>(logs.map((l: any) => l.action).filter(Boolean));
    // Merge with known standard actions so dropdown is rich and complete
    Object.keys(ACTION_READABLE_MAP).forEach((act) => dbActions.add(act));

    const actions = Array.from(dbActions)
      .sort()
      .map((action) => ({
        value: action,
        label: formatAuditAction(action),
      }));

    const dbResources = new Set<string>(logs.map((l: any) => l.resourceType).filter(Boolean));
    ['Project', 'Task', 'Employee', 'Team', 'Timesheet', 'TimeEntry', 'TimesheetSubmission', 'Organization', 'OrganizationSettings', 'EmployeeInvitation', 'PublicHoliday'].forEach((res) => dbResources.add(res));

    const resourceTypes = Array.from(dbResources)
      .sort()
      .map((res) => ({
        value: res,
        label: res,
      }));

    const employees = await db.orm.public.Employee
      .where({ organizationId: auth.organizationId })
      .select('id', 'name', 'email')
      .all();

    const actors = employees
      .map((e: any) => ({
        id: e.id,
        name: e.name,
        email: e.email,
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return {
      actions,
      resourceTypes,
      actors,
    };
  }

  /**
   * Exports audit logs matching filters up to a safe bounded batch (max 5,000 records).
   */
  async exportAuditLogs(
    auth: AuthenticatedContext,
    options: {
      format?: 'csv' | 'json';
      search?: string;
      actorId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      from?: Date;
      to?: Date;
      sortOrder?: 'desc' | 'asc';
      limit?: number;
    },
  ): Promise<{ filename: string; mimeType: string; content: string; count: number; totalMatching: number }> {
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only Administrators and Managers can export audit logs');
    }

    const format = options.format === 'json' ? 'json' : 'csv';
    const MAX_EXPORT_LIMIT = 5000;
    const requestedLimit = options.limit ? Math.min(Math.max(1, options.limit), MAX_EXPORT_LIMIT) : MAX_EXPORT_LIMIT;
    const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';

    const baseQuery = await this.buildFilterQuery(auth, options);

    let queryWithActor = baseQuery.include('actor');
    if (sortOrder === 'asc') {
      queryWithActor = queryWithActor.orderBy((log: any) => log.createdAt.asc());
    } else {
      queryWithActor = queryWithActor.orderBy((log: any) => log.createdAt.desc());
    }

    const [rawLogs, countAgg] = await Promise.all([
      queryWithActor.limit(requestedLimit).all(),
      baseQuery.aggregate((a: any) => ({ count: a.count() })),
    ]);

    const totalMatching = Number((countAgg as any)?.count || 0);
    const enrichedLogs = await this.enrichAuditLogs(auth.organizationId, rawLogs);

    const formattedLogs = enrichedLogs.map((log: any) => ({
      id: log.id,
      organizationId: log.organizationId,
      timestamp: new Date(log.createdAt).toISOString(),
      actorId: log.actorId || '',
      actorName: log.actorName,
      actorEmail: log.actorEmail || '',
      action: log.action,
      readableAction: log.readableAction,
      resourceType: log.resourceType,
      resourceId: log.resourceId || '',
      resourceName: log.resourceName || '',
      detailsSummary: log.detailsSummary,
      details: log.details,
    }));

    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    if (format === 'json') {
      return {
        filename: `sify_audit_logs_${timestampStr}.json`,
        mimeType: 'application/json',
        content: JSON.stringify(formattedLogs, null, 2),
        count: formattedLogs.length,
        totalMatching,
      };
    }

    // CSV format
    const headers = [
      'Event ID',
      'Timestamp (UTC)',
      'Actor Name',
      'Actor Email',
      'Action Code',
      'What Happened',
      'Resource Type',
      'Resource ID',
      'Resource Name',
      'Details Summary',
      'Raw Payload JSON',
    ];

    const rows = formattedLogs.map((log) => [
      escapeCsvCell(log.id),
      escapeCsvCell(log.timestamp),
      escapeCsvCell(log.actorName),
      escapeCsvCell(log.actorEmail),
      escapeCsvCell(log.action),
      escapeCsvCell(log.readableAction),
      escapeCsvCell(log.resourceType),
      escapeCsvCell(log.resourceId),
      escapeCsvCell(log.resourceName),
      escapeCsvCell(log.detailsSummary),
      escapeCsvCell(log.details ? JSON.stringify(log.details) : ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return {
      filename: `sify_audit_logs_${timestampStr}.csv`,
      mimeType: 'text/csv',
      content: csvContent,
      count: formattedLogs.length,
      totalMatching,
    };
  }
}

