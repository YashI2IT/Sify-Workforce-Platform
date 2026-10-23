import { Injectable } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { or } from '@prisma/orm-postgres/orm-client';

export interface SearchResultItem {
  id: string;
  type: 'project' | 'task' | 'employee' | 'team' | 'timesheet';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  url: string;
  meta?: Record<string, any>;
}

export interface UnifiedSearchResponse {
  projects: SearchResultItem[];
  tasks: SearchResultItem[];
  employees: SearchResultItem[];
  teams: SearchResultItem[];
  timesheets: SearchResultItem[];
  totalMatches: number;
}

@Injectable()
export class SearchService {
  /**
   * Resolves the list of project IDs accessible to the current authenticated employee
   */
  async getAccessibleProjectIds(auth: AuthenticatedContext): Promise<string[]> {
    if (auth.roles && auth.roles.includes('ADMIN')) {
      const allProjects = await db.orm.public.Project
        .where({ organizationId: auth.organizationId, isActive: true })
        .select('id')
        .all();
      return allProjects.map((p: any) => p.id);
    }

    if (!auth.employeeId) return [];

    let targetEmployeeIds = [auth.employeeId];
    if (auth.roles && auth.roles.includes('MANAGER')) {
      const managedTeams = await db.orm.public.Team
        .where({ organizationId: auth.organizationId, managerId: auth.employeeId })
        .select('id')
        .all();
      const teamIds = managedTeams.map((t: any) => t.id);
      if (teamIds.length > 0) {
        const teamMembers = await db.orm.public.Employee
          .where({ organizationId: auth.organizationId })
          .where((e: any) => e.teamId.in(teamIds))
          .select('id')
          .all();
        for (const emp of teamMembers) {
          if (!targetEmployeeIds.includes(emp.id)) {
            targetEmployeeIds.push(emp.id);
          }
        }
      }
    }

    const assignments = await db.orm.public.EmployeeProject
      .where((a: any) => a.employeeId.in(targetEmployeeIds))
      .select('projectId')
      .all();

    return [...new Set(assignments.map((a: any) => a.projectId))];
  }

  /**
   * Main unified search executing across projects, tasks, employees, teams, and timesheets
   */
  async search(query: string, auth: AuthenticatedContext, limitPerCategory = 5): Promise<UnifiedSearchResponse> {
    const q = (query || '').trim();
    if (!q) {
      return {
        projects: [],
        tasks: [],
        employees: [],
        teams: [],
        timesheets: [],
        totalMatches: 0,
      };
    }

    const safeLimit = Math.min(Math.max(1, limitPerCategory), 10);
    const pattern = `%${q}%`;
    const lowerQ = q.toLowerCase();

    // 1. Resolve accessible projects for scoping
    const accessibleProjectIds = await this.getAccessibleProjectIds(auth);

    // Run parallel queries across permitted entities
    const [projects, tasks, employees, teams, timesheets] = await Promise.all([
      this.searchProjects(q, pattern, lowerQ, accessibleProjectIds, auth, safeLimit),
      this.searchTasks(q, pattern, lowerQ, accessibleProjectIds, auth, safeLimit),
      this.searchEmployees(q, pattern, lowerQ, auth, safeLimit),
      this.searchTeams(q, pattern, lowerQ, auth, safeLimit),
      this.searchTimesheets(q, lowerQ, auth, safeLimit),
    ]);

    const totalMatches =
      projects.length + tasks.length + employees.length + teams.length + timesheets.length;

    return {
      projects,
      tasks,
      employees,
      teams,
      timesheets,
      totalMatches,
    };
  }

  private async searchProjects(
    q: string,
    pattern: string,
    lowerQ: string,
    accessibleProjectIds: string[],
    auth: AuthenticatedContext,
    limit: number,
  ): Promise<SearchResultItem[]> {
    if (accessibleProjectIds.length === 0) return [];

    const rows = await db.orm.public.Project
      .where({ organizationId: auth.organizationId, isActive: true })
      .where((p: any) => p.id.in(accessibleProjectIds))
      .where((p: any) => or(p.name.ilike(pattern), p.code.ilike(pattern)))
      .limit(limit * 2)
      .all();

    // Score and rank
    const scored = rows.map((p: any) => {
      const code = (p.code || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      let score = 0;

      if (code === lowerQ) score += 100;
      else if (name === lowerQ) score += 90;
      else if (code.startsWith(lowerQ)) score += 75;
      else if (name.startsWith(lowerQ)) score += 60;
      else score += 30;

      return { project: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ project: p }) => {
      let badgeVariant: SearchResultItem['badgeVariant'] = 'default';
      if (p.status === 'ACTIVE') badgeVariant = 'success';
      else if (p.status === 'PLANNING') badgeVariant = 'info';
      else if (p.status === 'ON_HOLD') badgeVariant = 'warning';

      return {
        id: p.id,
        type: 'project',
        title: p.name,
        subtitle: `${p.code} • ${p.status ? p.status.replace('_', ' ') : 'Active'}`,
        badge: p.code,
        badgeVariant,
        url: `/projects/${p.id}`,
        meta: {
          code: p.code,
          status: p.status,
        },
      };
    });
  }

  private async searchTasks(
    q: string,
    pattern: string,
    lowerQ: string,
    accessibleProjectIds: string[],
    auth: AuthenticatedContext,
    limit: number,
  ): Promise<SearchResultItem[]> {
    if (accessibleProjectIds.length === 0) return [];

    const tasks = await db.orm.public.Task
      .where({ isActive: true })
      .where((t: any) => t.projectId.in(accessibleProjectIds))
      .where((t: any) => or(t.ticketId.ilike(pattern), t.name.ilike(pattern)))
      .limit(limit * 3)
      .all();

    if (tasks.length === 0) return [];

    // Pre-fetch projects and assignees for display context
    const taskProjectIds = [...new Set(tasks.map((t: any) => t.projectId))];
    const projects = await db.orm.public.Project
      .where((p: any) => p.id.in(taskProjectIds))
      .select('id', 'name', 'code')
      .all();
    const projectMap = new Map(projects.map((p: any) => [p.id, p]));

    const assigneeIds = [...new Set(tasks.map((t: any) => t.assigneeId).filter(Boolean))];
    let assigneeMap = new Map();
    if (assigneeIds.length > 0) {
      const assignees = await db.orm.public.Employee
        .where((e: any) => e.id.in(assigneeIds))
        .select('id', 'name')
        .all();
      assigneeMap = new Map(assignees.map((e: any) => [e.id, e.name]));
    }

    // Score and rank
    const scored = tasks.map((t: any) => {
      const ticketId = (t.ticketId || '').toLowerCase();
      const name = (t.name || '').toLowerCase();
      let score = 0;

      if (ticketId === lowerQ) score += 120; // Exact ticket ID match
      else if (name === lowerQ) score += 100;
      else if (ticketId.startsWith(lowerQ)) score += 85;
      else if (name.startsWith(lowerQ)) score += 70;
      else if (ticketId.includes(lowerQ)) score += 55;
      else score += 30;

      return { task: t, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ task: t }) => {
      const project = projectMap.get(t.projectId);
      const assigneeName = t.assigneeId ? assigneeMap.get(t.assigneeId) : null;

      let badgeVariant: SearchResultItem['badgeVariant'] = 'default';
      const status = (t.status || '').toUpperCase();
      if (status === 'DONE' || status === 'COMPLETED') badgeVariant = 'success';
      else if (status === 'IN_PROGRESS' || status === 'REVIEW') badgeVariant = 'info';
      else if (status === 'BLOCKED') badgeVariant = 'warning';

      const subtitleParts: string[] = [];
      if (project?.name) subtitleParts.push(project.name);
      if (t.status) subtitleParts.push(t.status.replace('_', ' '));
      if (assigneeName) subtitleParts.push(assigneeName);

      return {
        id: t.id,
        type: 'task',
        title: t.name,
        subtitle: subtitleParts.join(' • '),
        badge: t.ticketId,
        badgeVariant,
        url: `/projects/${t.projectId}?taskId=${t.id}`,
        meta: {
          ticketId: t.ticketId,
          projectId: t.projectId,
          status: t.status,
          priority: t.priority,
        },
      };
    });
  }

  private async searchEmployees(
    q: string,
    pattern: string,
    lowerQ: string,
    auth: AuthenticatedContext,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const rows = await db.orm.public.Employee
      .where({ organizationId: auth.organizationId, isActive: true })
      .where((e: any) => or(e.name.ilike(pattern), e.email.ilike(pattern), e.employeeCode.ilike(pattern)))
      .limit(limit * 2)
      .all();

    if (rows.length === 0) return [];

    // Pre-fetch team names
    const teamIds = [...new Set(rows.map((e: any) => e.teamId).filter(Boolean))];
    let teamMap = new Map();
    if (teamIds.length > 0) {
      const teams = await db.orm.public.Team
        .where((t: any) => t.id.in(teamIds))
        .select('id', 'name')
        .all();
      teamMap = new Map(teams.map((t: any) => [t.id, t.name]));
    }

    // Score and rank
    const scored = rows.map((e: any) => {
      const name = (e.name || '').toLowerCase();
      const email = (e.email || '').toLowerCase();
      const code = (e.employeeCode || '').toLowerCase();
      let score = 0;

      if (name === lowerQ || code === lowerQ) score += 100;
      else if (email === lowerQ) score += 90;
      else if (name.startsWith(lowerQ) || code.startsWith(lowerQ)) score += 75;
      else if (email.startsWith(lowerQ)) score += 60;
      else score += 30;

      return { emp: e, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ emp: e }) => {
      const teamName = e.teamId ? teamMap.get(e.teamId) : null;
      const subtitleParts = [e.email];
      if (teamName) subtitleParts.push(teamName);
      else if (e.employeeCode) subtitleParts.push(e.employeeCode);

      let badgeVariant: SearchResultItem['badgeVariant'] = 'default';
      if (e.role === 'ADMIN') badgeVariant = 'purple';
      else if (e.role === 'MANAGER') badgeVariant = 'info';

      return {
        id: e.id,
        type: 'employee',
        title: e.name,
        subtitle: subtitleParts.join(' • '),
        badge: e.role || 'Member',
        badgeVariant,
        url: `/employees?search=${encodeURIComponent(e.name)}`,
        meta: {
          email: e.email,
          role: e.role,
          employeeCode: e.employeeCode,
        },
      };
    });
  }

  private async searchTeams(
    q: string,
    pattern: string,
    lowerQ: string,
    auth: AuthenticatedContext,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const teams = await db.orm.public.Team
      .where({ organizationId: auth.organizationId })
      .where((t: any) => t.name.ilike(pattern))
      .limit(limit)
      .all();

    if (teams.length === 0) return [];

    const managerIds = [...new Set(teams.map((t: any) => t.managerId).filter(Boolean))];
    let managerMap = new Map();
    if (managerIds.length > 0) {
      const managers = await db.orm.public.Employee
        .where((e: any) => e.id.in(managerIds))
        .select('id', 'name')
        .all();
      managerMap = new Map(managers.map((m: any) => [m.id, m.name]));
    }

    return teams.map((t: any) => {
      const mgrName = t.managerId ? managerMap.get(t.managerId) : null;
      return {
        id: t.id,
        type: 'team',
        title: t.name,
        subtitle: mgrName ? `Manager: ${mgrName}` : 'Functional Team',
        badge: 'Team',
        badgeVariant: 'default',
        url: `/teams`,
        meta: {
          managerId: t.managerId,
        },
      };
    });
  }

  private async searchTimesheets(
    q: string,
    lowerQ: string,
    auth: AuthenticatedContext,
    limit: number,
  ): Promise<SearchResultItem[]> {
    const timesheetTerms = ['timesheet', 'hour', 'log', 'submit', 'approve', 'pending', 'approval', 'review'];
    const isTimesheetQuery = timesheetTerms.some(term => lowerQ.includes(term) || term.includes(lowerQ));
    const isDateQuery = /\d{4}|\d{2}[-/]\d{2}/.test(lowerQ);

    if (!isTimesheetQuery && !isDateQuery) {
      return [];
    }

    const items: SearchResultItem[] = [];

    // 1. Pending approvals for Admin / Manager
    const isManagerOrAdmin = auth.roles?.includes('ADMIN') || auth.roles?.includes('MANAGER');
    if (isManagerOrAdmin) {
      let pendingSubmissions: any[] = [];
      if (auth.roles?.includes('ADMIN')) {
        pendingSubmissions = await db.orm.public.TimesheetSubmission
          .where({ status: 'SUBMITTED' })
          .limit(limit)
          .all();
      } else if (auth.employeeId) {
        // Manager: submissions from team members
        const managedTeams = await db.orm.public.Team
          .where({ organizationId: auth.organizationId, managerId: auth.employeeId })
          .select('id')
          .all();
        const teamIds = managedTeams.map((t: any) => t.id);
        if (teamIds.length > 0) {
          const members = await db.orm.public.Employee
            .where({ organizationId: auth.organizationId })
            .where((e: any) => e.teamId.in(teamIds))
            .select('id')
            .all();
          const memberIds = members.map((m: any) => m.id);
          if (memberIds.length > 0) {
            pendingSubmissions = await db.orm.public.TimesheetSubmission
              .where({ status: 'SUBMITTED' })
              .where((s: any) => s.employeeId.in(memberIds))
              .limit(limit)
              .all();
          }
        }
      }

      if (pendingSubmissions.length > 0) {
        const empIds = [...new Set(pendingSubmissions.map((s: any) => s.employeeId))];
        const emps = await db.orm.public.Employee
          .where((e: any) => e.id.in(empIds))
          .select('id', 'name')
          .all();
        const empMap = new Map(emps.map((e: any) => [e.id, e.name]));

        for (const sub of pendingSubmissions.slice(0, limit)) {
          const empName = empMap.get(sub.employeeId) || 'Employee';
          items.push({
            id: sub.id,
            type: 'timesheet',
            title: `Timesheet Approval - ${empName}`,
            subtitle: `${sub.submissionType} • ${sub.submittedDate || sub.weekStart || 'Recent'} • Pending Review`,
            badge: 'Approval',
            badgeVariant: 'warning',
            url: `/approvals/timesheets/${sub.id}`,
            meta: {
              status: sub.status,
              type: sub.submissionType,
            },
          });
        }
      }
    }

    // 2. Personal timesheets for the authenticated employee
    if (auth.employeeId && items.length < limit) {
      const timesheets = await db.orm.public.Timesheet
        .where({ employeeId: auth.employeeId })
        .limit(limit - items.length)
        .all();

      for (const ts of timesheets) {
        let badgeVariant: SearchResultItem['badgeVariant'] = 'default';
        if (ts.status === 'APPROVED') badgeVariant = 'success';
        else if (ts.status === 'SUBMITTED') badgeVariant = 'warning';

        items.push({
          id: ts.id,
          type: 'timesheet',
          title: `My Timesheet (${ts.status || 'Draft'})`,
          subtitle: `Timesheet schedule • Status: ${ts.status || 'Draft'}`,
          badge: ts.status || 'Draft',
          badgeVariant,
          url: `/timesheets/${ts.id}`,
          meta: {
            status: ts.status,
          },
        });
      }
    }

    return items;
  }
}
