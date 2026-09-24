import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { formatUtcMondayDateString } from '../common/date.utils.js';

@Injectable()
export class ReportsService {
  async getEmployeeSummary(
    targetEmployeeId: string | undefined,
    startDate: string,
    endDate: string,
    auth: AuthenticatedContext
  ) {
    let entries: any[] = [];

    if (targetEmployeeId) {
      // 1. Authorization & Isolation Validation
      const targetEmployee = await db.orm.public.Employee.where({ id: targetEmployeeId }).first();
      
      if (!targetEmployee) {
        throw new NotFoundException('Employee not found');
      }
      
      // Organization Isolation
      if (targetEmployee.organizationId !== auth.organizationId) {
        throw new ForbiddenException('Cannot access employee outside of your organization');
      }

      // Role-based Access Control
      if (targetEmployeeId !== auth.employeeId) {
        if (auth.roles.includes('ADMIN')) {
          // Admins can access anyone in their organization
        } else if (auth.roles.includes('MANAGER')) {
          // Manager must manage the target employee's current team
          if (!targetEmployee.teamId) {
            throw new ForbiddenException('Target employee is not assigned to a team');
          }
          
          const team = await db.orm.public.Team.where({
            id: targetEmployee.teamId,
            organizationId: auth.organizationId,
            managerId: auth.employeeId
          }).first();
          
          if (!team) {
            throw new ForbiddenException('You are not the manager of this employee\'s team');
          }
        } else {
          throw new ForbiddenException('You are not authorized to view this report');
        }
      }

      // 2. Fetch Dataset with DB-level boundaries
      entries = await db.orm.public.TimeEntry
        .where({ employeeId: targetEmployeeId })
        .where(e => (e as any).date.gte(startDate))
        .where(e => (e as any).date.lte(endDate))
        .all();
    } else {
      // Organization-wide reporting (ADMIN only)
      if (!auth.roles.includes('ADMIN')) {
        throw new ForbiddenException('You are not authorized to view organization-wide report');
      }

      const orgEmployees = await db.orm.public.Employee.where({ organizationId: auth.organizationId }).all();
      const employeeIds = orgEmployees.map(e => e.id);

      if (employeeIds.length === 0) {
        return {
          employeeId: undefined,
          startDate,
          endDate,
          totalHours: 0,
          statusBreakdown: {
            APPROVED: 0,
            SUBMITTED: 0,
            DRAFT: 0,
            REJECTED: 0,
          },
          projectBreakdown: [],
          dailyTotals: []
        };
      }

      entries = await db.orm.public.TimeEntry
        .where(e => (e as any).employeeId.in(employeeIds))
        .where(e => (e as any).date.gte(startDate))
        .where(e => (e as any).date.lte(endDate))
        .all();
    }

    // 3. Defensive Safeguard
    const MAX_SAFE_ROWS = 2500;
    if (entries.length > MAX_SAFE_ROWS) {
      throw new InternalServerErrorException(
        `Safety threshold exceeded: Employee has ${entries.length} entries in the bounded period. Maximum allowed is ${MAX_SAFE_ROWS} to prevent memory exhaustion.`
      );
    }

    // 4. In-Memory Aggregation
    let totalHours = 0;
    const statusBreakdown = {
      APPROVED: 0,
      SUBMITTED: 0,
      DRAFT: 0,
      REJECTED: 0,
    };
    
    const projectMap = new Map<string, { projectName: string, hours: number }>();
    const dailyMap = new Map<string, number>();

    for (const entry of entries) {
      const timesheet = await db.orm.public.Timesheet.where({ id: entry.timesheetId }).first();
      const project = await db.orm.public.Project.where({ id: entry.projectId }).first();
      
      // Missing Timesheet Integrity Check
      if (!timesheet) {
        throw new InternalServerErrorException(
          `Data Integrity Anomaly: TimeEntry ${entry.id} is missing a Timesheet relationship. Under V1, every TimeEntry must belong to a Timesheet.`
        );
      }
      
      const status = timesheet.status;
      const hours = Number(entry.hours); // Ensure numeric consistency
      
      // We only aggregate known valid statuses.
      if (status in statusBreakdown) {
        statusBreakdown[status as keyof typeof statusBreakdown] += hours;
      }
      
      totalHours += hours;
      
      // Project Aggregation
      const projectId = entry.projectId;
      const projectName = project?.name || 'Unknown Project';
      
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, { projectName, hours: 0 });
      }
      projectMap.get(projectId)!.hours += hours;
      
      // Daily Aggregation
      const dateStr = entry.date;
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + hours);
    }

    const projectBreakdown = Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.projectName,
      hours: data.hours
    })).sort((a, b) => b.hours - a.hours);

    const dailyTotals = Array.from(dailyMap.entries()).map(([date, hours]) => ({
      date,
      hours
    })).sort((a, b) => a.date.localeCompare(b.date)); // Chronological

    return {
      employeeId: targetEmployeeId,
      startDate,
      endDate,
      totalHours,
      statusBreakdown,
      projectBreakdown,
      dailyTotals
    };
  }

  async getManagerDashboard(
    startDate: string,
    endDate: string,
    auth: AuthenticatedContext
  ) {
    // 1. Team Resolution
    const managedTeams = await db.orm.public.Team.where({
      managerId: auth.employeeId,
      organizationId: auth.organizationId
    }).all();

    if (managedTeams.length === 0) {
      return {
        pendingApprovalsCount: 0,
        teamWeeklyFinalizedHours: 0,
        missingDraftTimesheetCount: 0,
        totalTeamMembers: 0,
        managedTeamsCount: 0,
        managedTeams: [],
      };
    }

    const teamIds = managedTeams.map(t => t.id);

    // Get all employees in these teams
    const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
    const memberIds = teamMembers.map(e => e.id);

    const managedTeamsList = managedTeams.map(t => ({
      id: t.id,
      name: t.name,
      memberCount: teamMembers.filter(e => e.teamId === t.id).length,
    }));

    if (memberIds.length === 0) {
      return {
        pendingApprovalsCount: 0,
        teamWeeklyFinalizedHours: 0,
        missingDraftTimesheetCount: 0,
        totalTeamMembers: 0,
        managedTeamsCount: managedTeams.length,
        managedTeams: managedTeamsList,
      };
    }

    // 2. Pending Approvals & Draft Counts (Timesheets)
    const startInstant = (globalThis as any).Temporal.Instant.from(`${startDate}T00:00:00Z`);
    const endInstant = (globalThis as any).Temporal.Instant.from(`${endDate}T23:59:59Z`);

    const pendingResult = await db.orm.public.Timesheet
      .where(t => (t as any).employeeId.in(memberIds))
      .where({ status: 'SUBMITTED' })
      .where(t => (t as any).startDate.gte(startInstant))
      .where(t => (t as any).startDate.lte(endInstant))
      .aggregate((a: any) => ({ count: a.count() }));
    
    const pendingApprovalsCount = pendingResult?.count || 0;

    const draftResult = await db.orm.public.Timesheet
      .where(t => (t as any).employeeId.in(memberIds))
      .where({ status: 'DRAFT' })
      .where(t => (t as any).startDate.gte(startInstant))
      .where(t => (t as any).startDate.lte(endInstant))
      .aggregate((a: any) => ({ count: a.count() }));
      
    const missingDraftTimesheetCount = draftResult?.count || 0;

    // 3. Team Weekly Finalized Hours (APPROVED entries)
    const approvedResult = await db.orm.public.TimeEntry
      .where(e => (e as any).employeeId.in(memberIds))
      .where(e => (e as any).date.gte(startDate))
      .where(e => (e as any).date.lte(endDate))
      .where(e => (e as any).timesheet.some((t: any) => t.status.eq('APPROVED')))
      .aggregate((a: any) => ({ total: a.sum('hours') }));
      
    const teamWeeklyFinalizedHours = approvedResult?.total || 0;

    return {
      pendingApprovalsCount,
      teamWeeklyFinalizedHours,
      missingDraftTimesheetCount,
      totalTeamMembers: memberIds.length,
      managedTeamsCount: managedTeams.length,
      managedTeams: managedTeamsList,
    };
  }

  async getTeamUtilization(
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
    auth: AuthenticatedContext
  ) {
    // 1. Team Resolution
    const managedTeams = await db.orm.public.Team.where({
      managerId: auth.employeeId,
      organizationId: auth.organizationId
    }).all();

    if (managedTeams.length === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 }
      };
    }

    const teamIds = managedTeams.map(t => t.id);

    // 2. Pagination - Get Employees
    const employeeQuery = db.orm.public.Employee
      .where(e => (e as any).teamId.in(teamIds));

    const totalEmployeesResult = await employeeQuery.aggregate((a: any) => ({ count: a.count() }));
    const total = totalEmployeesResult?.count || 0;
    
    if (total === 0) {
      return {
        data: [],
        meta: { total: 0, page, limit, totalPages: 0 }
      };
    }

    const employeesPage = await employeeQuery
      .limit(limit)
      .offset((page - 1) * limit)
      .all();
      
    const memberIds = employeesPage.map(e => e.id);

    // 3. Database-Side Grouped Aggregations
    const baseQuery = db.orm.public.TimeEntry
      .where(e => (e as any).employeeId.in(memberIds))
      .where(e => (e as any).date.gte(startDate))
      .where(e => (e as any).date.lte(endDate));

    const [approved, submitted, draft, rejected] = await Promise.all([
      baseQuery.where(e => (e as any).timesheet.some((t: any) => t.status.eq('APPROVED')))
               .groupBy('employeeId')
               .aggregate((a: any) => ({ total: a.sum('hours') })),
      baseQuery.where(e => (e as any).timesheet.some((t: any) => t.status.eq('SUBMITTED')))
               .groupBy('employeeId')
               .aggregate((a: any) => ({ total: a.sum('hours') })),
      baseQuery.where(e => (e as any).timesheet.some((t: any) => t.status.eq('DRAFT')))
               .groupBy('employeeId')
               .aggregate((a: any) => ({ total: a.sum('hours') })),
      baseQuery.where(e => (e as any).timesheet.some((t: any) => t.status.eq('REJECTED')))
               .groupBy('employeeId')
               .aggregate((a: any) => ({ total: a.sum('hours') }))
    ]);

    // 4. Map Aggregations in Node.js
    const mapToTotals = (aggResult: any[]) => {
      const map = new Map<string, number>();
      if (Array.isArray(aggResult)) {
        for (const row of aggResult) {
          map.set(row.employeeId, row.total || 0);
        }
      }
      return map;
    };

    const approvedMap = mapToTotals(approved as any);
    const submittedMap = mapToTotals(submitted as any);
    const draftMap = mapToTotals(draft as any);
    const rejectedMap = mapToTotals(rejected as any);

    const data = employeesPage.map(emp => ({
      employeeId: emp.id,
      name: emp.name,
      employeeCode: emp.employeeCode,
      statusBreakdown: {
        APPROVED: approvedMap.get(emp.id) || 0,
        SUBMITTED: submittedMap.get(emp.id) || 0,
        DRAFT: draftMap.get(emp.id) || 0,
        REJECTED: rejectedMap.get(emp.id) || 0,
      }
    }));

    return {
      data,
      meta: {
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit)
      }
    };
  }

  async getProjectHours(
    startDate: string,
    endDate: string,
    projectId: string | undefined,
    auth: AuthenticatedContext
  ) {
    let orgProjectIds: string[] = [];

    if (projectId) {
      const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
      if (!project) {
        throw new ForbiddenException('Project not found or belongs to another organization');
      }
      orgProjectIds = [projectId];
    } else {
      const orgProjects = await db.orm.public.Project.where({ organizationId: auth.organizationId }).all();
      orgProjectIds = orgProjects.map(p => p.id);
      
      if (orgProjectIds.length === 0) {
        return {
          totalApprovedHours: 0,
          employeeBreakdown: [],
          taskBreakdown: []
        };
      }
    }

    const createBaseQuery = () => db.orm.public.TimeEntry
      .where(e => (e as any).projectId.in(orgProjectIds))
      .where(e => (e as any).date.gte(startDate))
      .where(e => (e as any).date.lte(endDate))
      .where(e => (e as any).timesheet.some((t: any) => t.status.eq('APPROVED')));

    const totalAgg = await createBaseQuery().aggregate((a: any) => ({ total: a.sum('hours') }));
    const totalApprovedHours = Number(totalAgg?.total || 0);

    const employeeAgg = await createBaseQuery().groupBy('employeeId').aggregate((a: any) => ({ total: a.sum('hours') }));
    const taskAgg = await createBaseQuery().groupBy('taskId').aggregate((a: any) => ({ total: a.sum('hours') }));

    const employeeIds = Array.isArray(employeeAgg) ? employeeAgg.map((x: any) => x.employeeId) : [];
    const taskIds = Array.isArray(taskAgg) ? taskAgg.map((x: any) => x.taskId) : [];

    const [employees, tasks] = await Promise.all([
      employeeIds.length > 0 ? db.orm.public.Employee.where(e => (e as any).id.in(employeeIds)).all() : Promise.resolve([]),
      taskIds.length > 0 ? db.orm.public.Task.where(t => (t as any).id.in(taskIds)).all() : Promise.resolve([])
    ]);

    const employeeMap = new Map(employees.map(e => [e.id, { name: e.name, employeeCode: e.employeeCode }]));
    const taskMap = new Map(tasks.map(t => [t.id, t.name]));

    const employeeBreakdown = Array.isArray(employeeAgg) ? employeeAgg.map((x: any) => ({
      employeeId: x.employeeId,
      name: employeeMap.get(x.employeeId)?.name || 'Unknown',
      employeeCode: employeeMap.get(x.employeeId)?.employeeCode || '',
      hours: Number(x.total || 0)
    })) : [];

    const taskBreakdown = Array.isArray(taskAgg) ? taskAgg.map((x: any) => ({
      taskId: x.taskId,
      taskName: taskMap.get(x.taskId) || 'Unknown',
      hours: Number(x.total || 0)
    })) : [];

    return {
      totalApprovedHours,
      employeeBreakdown,
      taskBreakdown
    };
  }

  async getProjectAnalysis(
    projectId: string,
    startDate: string,
    endDate: string,
    interval: 'week' | 'month',
    auth: AuthenticatedContext
  ) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new ForbiddenException('Project not found or belongs to another organization');
    }

    const createBaseQuery = () => db.orm.public.TimeEntry
      .where(e => (e as any).projectId.eq(projectId))
      .where(e => (e as any).date.gte(startDate))
      .where(e => (e as any).date.lte(endDate))
      .where(e => (e as any).timesheet.some((t: any) => t.status.eq('APPROVED')));

    const taskAgg = await createBaseQuery().groupBy('taskId').aggregate((a: any) => ({ total: a.sum('hours') }));
    const activityAgg = await createBaseQuery().groupBy('activityId').aggregate((a: any) => ({ total: a.sum('hours') }));
    const dateAgg = await createBaseQuery().groupBy('date').aggregate((a: any) => ({ total: a.sum('hours') }));

    const taskIds = Array.isArray(taskAgg) ? taskAgg.map((x: any) => x.taskId) : [];
    const activityIds = Array.isArray(activityAgg) ? activityAgg.map((x: any) => x.activityId) : [];

    const [tasks, activities] = await Promise.all([
      taskIds.length > 0 ? db.orm.public.Task.where(t => (t as any).id.in(taskIds)).all() : Promise.resolve([]),
      activityIds.length > 0 ? db.orm.public.Activity.where(a => (a as any).id.in(activityIds)).all() : Promise.resolve([])
    ]);

    const taskMap = new Map(tasks.map(t => [t.id, t.name]));
    const activityMap = new Map(activities.map(a => [a.id, a.name]));

    const hoursByTask = Array.isArray(taskAgg) ? taskAgg.map((x: any) => ({
      taskId: x.taskId,
      taskName: taskMap.get(x.taskId) || 'Unknown',
      hours: Number(x.total || 0)
    })) : [];

    const hoursByActivity = Array.isArray(activityAgg) ? activityAgg.map((x: any) => ({
      activityId: x.activityId,
      activityName: activityMap.get(x.activityId) || 'Unknown',
      hours: Number(x.total || 0)
    })) : [];

    const trendMap = new Map<string, number>();

    if (Array.isArray(dateAgg)) {
      for (const row of dateAgg) {
        const dateStr = row.date;
        const hours = Number(row.total || 0);
        let bucket = '';

        if (interval === 'month') {
          bucket = dateStr.substring(0, 7);
        } else {
          bucket = formatUtcMondayDateString(dateStr);
        }

        trendMap.set(bucket, (trendMap.get(bucket) || 0) + hours);
      }
    }

    const trend = Array.from(trendMap.entries())
      .map(([period, hours]) => ({ period, hours }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      hoursByTask,
      hoursByActivity,
      trend
    };
  }
}
