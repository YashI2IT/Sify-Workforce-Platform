import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
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

      const orgEmployees = await db.orm.public.Employee.where({ organizationId: auth.organizationId }).select('id').all();
      const employeeIds = orgEmployees.map((e: any) => e.id);

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

    // 4. Batch pre-fetch all referenced Timesheets and Projects to avoid N+1 queries
    const uniqueTimesheetIds = [...new Set(entries.map((e: any) => e.timesheetId))];
    const uniqueProjectIds   = [...new Set(entries.map((e: any) => e.projectId))];

    const [timesheets, projects] = await Promise.all([
      uniqueTimesheetIds.length > 0
        ? db.orm.public.Timesheet.where((t: any) => t.id.in(uniqueTimesheetIds)).all()
        : Promise.resolve([]),
      uniqueProjectIds.length > 0
        ? db.orm.public.Project.where((p: any) => p.id.in(uniqueProjectIds)).all()
        : Promise.resolve([]),
    ]);

    const timesheetMap = new Map(timesheets.map((t: any) => [t.id, t]));
    const projectMap2  = new Map(projects.map((p: any) => [p.id, p]));

    // 5. In-Memory Aggregation
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
      const timesheet = timesheetMap.get(entry.timesheetId);
      const project   = projectMap2.get(entry.projectId);
      
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
        activeProjectsCount: 0,
        projectStatusCounts: { ACTIVE: 0, IN_PROGRESS: 0, PLANNING: 0, ON_HOLD: 0, COMPLETED: 0 },
      };
    }

    const teamIds = managedTeams.map(t => t.id);

    // Get all employees in these teams (optimized select)
    const teamMembers = await db.orm.public.Employee.where((e: any) => e.teamId.in(teamIds)).select('id', 'teamId').all();
    const memberIds = teamMembers.map((e: any) => e.id);

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
        activeProjectsCount: 0,
        projectStatusCounts: { ACTIVE: 0, IN_PROGRESS: 0, PLANNING: 0, ON_HOLD: 0, COMPLETED: 0 },
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

    // 4. Project Status Counts (Scoped to manager and team members)
    const targetEmployeeIds = [...memberIds, auth.employeeId];
    const assignments = await db.orm.public.EmployeeProject.where((a: any) => a.employeeId.in(targetEmployeeIds)).all();
    const assignedProjectIds = assignments.map((a: any) => a.projectId);

    let activeProjectsCount = 0;
    const projectStatusCounts = { ACTIVE: 0, IN_PROGRESS: 0, PLANNING: 0, ON_HOLD: 0, COMPLETED: 0 };
    
    if (assignedProjectIds.length > 0) {
      const projectAgg = await db.orm.public.Project
        .where({ organizationId: auth.organizationId, isActive: true })
        .where((p: any) => p.id.in(assignedProjectIds))
        .groupBy('status')
        .aggregate((a: any) => ({ count: a.count() }));
        
      projectAgg.forEach((r: any) => {
        const c = Number(r.count);
        if (r.status in projectStatusCounts) {
          (projectStatusCounts as any)[r.status] = c;
        }
        if (r.status !== 'COMPLETED' && r.status !== 'ON_HOLD') {
          activeProjectsCount += c;
        }
      });
    }

    return {
      pendingApprovalsCount,
      teamWeeklyFinalizedHours,
      totalTeamMembers: memberIds.length,
      managedTeamsCount: managedTeams.length,
      managedTeams: managedTeamsList,
      activeProjectsCount,
      projectStatusCounts
    };
  }

  async getManagerOverdueTasks(auth: AuthenticatedContext) {
    const managedTeams = await db.orm.public.Team.where({
      organizationId: auth.organizationId,
      managerId: auth.employeeId
    }).all();

    if (!managedTeams.length) {
      return { totalOverdue: 0 };
    }

    const teamIds = managedTeams.map((t: any) => t.id);

    // 2. Get team employees via direct reference
    // Since we use the Team.employee relationship or Employee.teamId
    const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
    const employeeIds = teamMembers.map(e => e.id);
    
    if (!employeeIds.length) {
      return { totalOverdue: 0 };
    }

    // 3. Get projects these employees are assigned to
    const employeeProjects = await db.orm.public.EmployeeProject.where(ep => (ep as any).employeeId.in(employeeIds)).all();
    const projectIds = [...new Set(employeeProjects.map(ep => ep.projectId))];

    if (!projectIds.length) {
      return { totalOverdue: 0 };
    }

    // 4. Get active projects
    const allProjects = await db.orm.public.Project.where(p => (p as any).id.in(projectIds))
      .where({ organizationId: auth.organizationId })
      .all();
      
    const activeProjects = allProjects.filter((p: any) => p.status !== 'COMPLETED' && p.isActive !== false);
    const activeProjectIds = activeProjects.map((p: any) => p.id);
    
    if (!activeProjectIds.length) {
      return { totalOverdue: 0 };
    }

    // 5. Get overdue tasks
    const allTasks = await db.orm.public.Task.where(t => (t as any).projectId.in(activeProjectIds))
      .all();
      
    const tasks = allTasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'COMPLETED' && t.isActive !== false);

    const nowMs = Date.now();
    const overdueCount = tasks.filter((t: any) => t.dueDate && new Date(String(t.dueDate)).getTime() < nowMs).length;

    return { totalOverdue: overdueCount };
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

  async getWorkload(
    startDate: string,
    endDate: string,
    auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only ADMIN and MANAGER roles can view workload data');
    }

    const orgId = auth.organizationId;
    let targetEmployeeIds: string[] = [];
    let employeeData = new Map<string, { id: string, name: string, code: string }>();

    if (auth.roles.includes('ADMIN')) {
      const orgEmployees = await db.orm.public.Employee.where({ organizationId: orgId }).select('id', 'name', 'employeeCode').all();
      for (const e of orgEmployees) {
        targetEmployeeIds.push(e.id);
        employeeData.set(e.id, { id: e.id, name: e.name, code: e.employeeCode });
      }
    } else if (auth.roles.includes('MANAGER') && auth.employeeId) {
      const managedTeams = await db.orm.public.Team.where({ organizationId: orgId, managerId: auth.employeeId }).all();
      const teamIds = managedTeams.map(t => t.id);
      if (teamIds.length > 0) {
        const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).select('id', 'name', 'employeeCode').all();
        for (const e of teamMembers) {
          targetEmployeeIds.push(e.id);
          employeeData.set(e.id, { id: e.id, name: e.name, code: e.employeeCode });
        }
      }
    }

    if (targetEmployeeIds.length === 0) {
      return [];
    }

    const MAX_SAFE_ROWS = 2500;
    if (targetEmployeeIds.length > MAX_SAFE_ROWS) {
      throw new BadRequestException(`Workload query exceeds safe limits. Narrow your filters. limit=${MAX_SAFE_ROWS}`);
    }

    const workingTimes = await db.orm.public.WorkingTime.where((wt: any) => wt.employeeId.in(targetEmployeeIds)).all();
    const capacityByEmployee = new Map<string, number>();
    for (const wt of workingTimes) {
      if (wt.employeeId) {
        const totalWeeklyHours = 
          wt.monday + wt.tuesday + wt.wednesday + 
          wt.thursday + wt.friday + wt.saturday + wt.sunday;
        capacityByEmployee.set(wt.employeeId, totalWeeklyHours);
      }
    }

    const orgWorkingTime = await db.orm.public.WorkingTime.where({ organizationId: orgId, employeeId: null }).first();
    const defaultCapacity = orgWorkingTime 
      ? (Number(orgWorkingTime.monday) + Number(orgWorkingTime.tuesday) + Number(orgWorkingTime.wednesday) + 
         Number(orgWorkingTime.thursday) + Number(orgWorkingTime.friday) + Number(orgWorkingTime.saturday) + 
         Number(orgWorkingTime.sunday))
      : 40;

    const timeEntries = await db.orm.public.TimeEntry.where(e => (e as any).employeeId.in(targetEmployeeIds))
      .where(e => (e as any).date.gte(startDate))
      .where(e => (e as any).date.lte(endDate))
      .all();

    const actualHoursByEmployee = new Map<string, number>();
    for (const entry of timeEntries) {
      actualHoursByEmployee.set(entry.employeeId, (actualHoursByEmployee.get(entry.employeeId) || 0) + Number(entry.hours));
    }

    const workloadList = [];
    for (const empId of targetEmployeeIds) {
      const empInfo = employeeData.get(empId);
      // Fetch org-level default if employee doesn't have an override
      const configuredCapacity = capacityByEmployee.has(empId) ? capacityByEmployee.get(empId)! : defaultCapacity;
      const actualHours = actualHoursByEmployee.get(empId) || 0;
      
      const remainingCapacity = Math.max(0, configuredCapacity - actualHours);
      const overCapacity = Math.max(0, actualHours - configuredCapacity);

      workloadList.push({
        employeeId: empId,
        employeeName: empInfo?.name,
        employeeCode: empInfo?.code,
        configuredCapacity,
        actualHours,
        remainingCapacity,
        overCapacity
      });
    }

    return workloadList;
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
  async getAdminDashboard(auth: AuthenticatedContext) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can access the admin dashboard');
    }
    const orgId = auth.organizationId;

    const empAgg = await db.orm.public.Employee.where({ organizationId: orgId }).groupBy('isActive').aggregate((a: any) => ({ count: a.count() }));
    let activeEmployees = 0; let inactiveEmployees = 0;
    empAgg.forEach((r: any) => {
      if (r.isActive) activeEmployees += Number(r.count);
      else inactiveEmployees += Number(r.count);
    });

    const teamAgg = await db.orm.public.Team.where({ organizationId: orgId }).groupBy('managerId').aggregate((a: any) => ({ count: a.count() }));
    let totalTeams = 0; let teamsWithoutManager = 0;
    teamAgg.forEach((r: any) => {
      const c = Number(r.count);
      totalTeams += c;
      if (!r.managerId) teamsWithoutManager += c;
    });

    return {
      activeEmployees,
      inactiveEmployees,
      totalEmployees: activeEmployees + inactiveEmployees,
      totalTeams,
      teamsWithoutManager
    };
  }

  async getAdvancedAnalytics(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month',
    auth: AuthenticatedContext
  ) {
    const orgId = auth.organizationId;
    let targetEmployeeIds: string[] = [];
    let targetProjectIds: string[] = [];

    // 1. Authorization Scoping
    if (auth.roles.includes('ADMIN')) {
      const orgEmployees = await db.orm.public.Employee.where({ organizationId: orgId }).select('id').all();
      targetEmployeeIds = orgEmployees.map((e: any) => e.id);
      
      const orgProjects = await db.orm.public.Project.where({ organizationId: orgId }).select('id').all();
      targetProjectIds = orgProjects.map((p: any) => p.id);
    } else if (auth.roles.includes('MANAGER') && auth.employeeId) {
      targetEmployeeIds.push(auth.employeeId);
      const managedTeams = await db.orm.public.Team.where({ organizationId: orgId, managerId: auth.employeeId }).all();
      const teamIds = managedTeams.map((t: any) => t.id);
      if (teamIds.length > 0) {
        const teamMembers = await db.orm.public.Employee.where((e: any) => e.teamId.in(teamIds)).select('id').all();
        for (const e of teamMembers) {
          if (!targetEmployeeIds.includes(e.id)) targetEmployeeIds.push(e.id);
        }
      }
      const employeeProjects = await db.orm.public.EmployeeProject.where((ep: any) => (ep as any).employeeId.in(targetEmployeeIds)).all();
      targetProjectIds = [...new Set(employeeProjects.map((ep: any) => ep.projectId))];
    } else if (auth.employeeId) {
      targetEmployeeIds = [auth.employeeId];
      const employeeProjects = await db.orm.public.EmployeeProject.where({ employeeId: auth.employeeId }).all();
      targetProjectIds = employeeProjects.map((ep: any) => ep.projectId);
    }

    if (targetEmployeeIds.length === 0 && targetProjectIds.length === 0) {
      return { trendData: [], projectHoursTrend: [], estimatedVsActual: [], overdueTaskTrend: [], periodOverPeriod: null };
    }

    // 2. Fetch TimeEntries for Trend Data
    const timeEntries = targetEmployeeIds.length > 0 ? await db.orm.public.TimeEntry
      .where((e: any) => (e as any).employeeId.in(targetEmployeeIds))
      .where((e: any) => (e as any).date.gte(startDate))
      .where((e: any) => (e as any).date.lte(endDate))
      .select('id', 'date', 'hours', 'timesheetId', 'projectId')
      .all() : [];

    const timesheetIds = [...new Set(timeEntries.map((e: any) => e.timesheetId))];
    const timesheets = timesheetIds.length > 0 ? await db.orm.public.Timesheet.where((t: any) => (t as any).id.in(timesheetIds)).select('id', 'status').all() : [];
    const tsMap = new Map(timesheets.map((t: any) => [t.id, t.status]));

    // 3. Process Trend Data
    const trendMap = new Map<string, any>();
    const projectHoursMap = new Map<string, Map<string, number>>(); // period -> projectId -> hours

    for (const entry of timeEntries) {
      const dateStr = entry.date;
      const hours = Number(entry.hours);
      let bucket = '';

      if (interval === 'month') {
        bucket = dateStr.substring(0, 7);
      } else if (interval === 'week') {
        bucket = formatUtcMondayDateString(dateStr);
      } else {
        bucket = dateStr;
      }

      if (!trendMap.has(bucket)) {
        trendMap.set(bucket, { period: bucket, totalHours: 0, APPROVED: 0, SUBMITTED: 0, DRAFT: 0, REJECTED: 0 });
      }
      const bData = trendMap.get(bucket);
      bData.totalHours += hours;

      const status = tsMap.get(entry.timesheetId) || 'DRAFT';
      if (status in bData) {
        bData[status] += hours;
      }

      if (!projectHoursMap.has(bucket)) projectHoursMap.set(bucket, new Map());
      const pMap = projectHoursMap.get(bucket)!;
      pMap.set(entry.projectId, (pMap.get(entry.projectId) || 0) + hours);
    }

    const trendData = Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));

    // 4. Project Hours Trends
    const pIds = [...new Set(timeEntries.map((e: any) => e.projectId))];
    const projects = pIds.length > 0 ? await db.orm.public.Project.where((p: any) => (p as any).id.in(pIds)).select('id', 'name').all() : [];
    const pNameMap = new Map(projects.map((p: any) => [p.id, p.name]));

    const projectHoursTrend: any[] = [];
    Array.from(projectHoursMap.entries()).forEach(([period, pMap]) => {
      pMap.forEach((hours, projectId) => {
        projectHoursTrend.push({
          period,
          projectId,
          projectName: pNameMap.get(projectId) || 'Unknown',
          hours
        });
      });
    });
    projectHoursTrend.sort((a, b) => a.period.localeCompare(b.period));

    // 5. Estimated vs Actual Hours
    const tasks = targetProjectIds.length > 0 ? await db.orm.public.Task
      .where((t: any) => (t as any).projectId.in(targetProjectIds))
      .select('id', 'name', 'estimatedHours')
      .all() : [];

    const taskIds = tasks.map((t: any) => t.id);
    const taskActualAgg = taskIds.length > 0 ? await db.orm.public.TimeEntry
      .where((e: any) => (e as any).taskId.in(taskIds))
      .groupBy('taskId')
      .aggregate((a: any) => ({ total: a.sum('hours') })) : [];

    const taskActualMap = new Map();
    if (Array.isArray(taskActualAgg)) {
      taskActualAgg.forEach((row: any) => taskActualMap.set(row.taskId, Number(row.total || 0)));
    }

    const estimatedVsActual = tasks.map((t: any) => ({
      taskId: t.id,
      taskName: t.name,
      estimatedHours: Number(t.estimatedHours || 0),
      actualHours: taskActualMap.get(t.id) || 0
    })).sort((a, b) => b.actualHours - a.actualHours).slice(0, 50); // top 50 tasks by actual hours

    // 6. Overdue Task Trend (Current snapshot grouped by due date bucket)
    const activeTasks = targetProjectIds.length > 0 ? await db.orm.public.Task
      .where((t: any) => (t as any).projectId.in(targetProjectIds))
      .all() : [];
    
    const overdueTasks = activeTasks.filter((t: any) => t.status !== 'DONE' && t.status !== 'COMPLETED' && t.isActive !== false && t.dueDate && new Date(String(t.dueDate)).getTime() < Date.now());
    const overdueTrendMap = new Map<string, number>();

    overdueTasks.forEach((t: any) => {
      const dateStr = new Date(String(t.dueDate)).toISOString().split('T')[0];
      let bucket = '';
      if (interval === 'month') {
        bucket = dateStr.substring(0, 7);
      } else if (interval === 'week') {
        bucket = formatUtcMondayDateString(dateStr);
      } else {
        bucket = dateStr;
      }
      overdueTrendMap.set(bucket, (overdueTrendMap.get(bucket) || 0) + 1);
    });

    const overdueTaskTrend = Array.from(overdueTrendMap.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // 7. Period-over-Period
    const currentDiffTime = new Date(endDate).getTime() - new Date(startDate).getTime();
    const prevEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000);
    const prevStartDate = new Date(prevEndDate.getTime() - currentDiffTime);
    
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const prevStartStr = formatYMD(prevStartDate);
    const prevEndStr = formatYMD(prevEndDate);

    const prevEntriesAgg = targetEmployeeIds.length > 0 ? await db.orm.public.TimeEntry
      .where((e: any) => (e as any).employeeId.in(targetEmployeeIds))
      .where((e: any) => (e as any).date.gte(prevStartStr))
      .where((e: any) => (e as any).date.lte(prevEndStr))
      .aggregate((a: any) => ({ total: a.sum('hours') })) : null;

    const currentTotalHours = Array.from(trendMap.values()).reduce((sum, b) => sum + b.totalHours, 0);
    const prevTotalHours = Number(prevEntriesAgg?.total || 0);

    const periodOverPeriod = {
      currentPeriod: { startDate, endDate, totalHours: currentTotalHours },
      previousPeriod: { startDate: prevStartStr, endDate: prevEndStr, totalHours: prevTotalHours },
      percentageChange: prevTotalHours > 0 ? Math.round(((currentTotalHours - prevTotalHours) / prevTotalHours) * 100) : null
    };

    return {
      trendData,
      projectHoursTrend,
      estimatedVsActual,
      overdueTaskTrend,
      periodOverPeriod
    };
  }

  async getResourceAllocation(startDate: string, endDate: string, auth: AuthenticatedContext) {
    let targetEmployeeIds: string[] = [];

    if (auth.roles.includes('ADMIN')) {
      const orgEmployees = await db.orm.public.Employee.where({ organizationId: auth.organizationId, isActive: true }).select('id').all();
      targetEmployeeIds = orgEmployees.map((e: any) => e.id);
    } else if (auth.roles.includes('MANAGER')) {
      const managedTeams = await db.orm.public.Team.where({
        organizationId: auth.organizationId,
        managerId: auth.employeeId
      }).select('id').all();
      const teamIds = managedTeams.map((t: any) => t.id);
      
      let teamEmployees: any[] = [];
      if (teamIds.length > 0) {
        teamEmployees = await db.orm.public.Employee.where((e: any) => e.teamId.in(teamIds)).where({ isActive: true }).select('id').all();
      }
      targetEmployeeIds = Array.from(new Set([auth.employeeId, ...teamEmployees.map((e: any) => e.id)]));
    } else if (auth.roles.includes('EMPLOYEE')) {
      targetEmployeeIds = [auth.employeeId];
    }

    if (targetEmployeeIds.length === 0) return [];

    const employees = await db.orm.public.Employee.where((e: any) => e.id.in(targetEmployeeIds)).all();
    const workingTimes = await db.orm.public.WorkingTime.where((e: any) => e.employeeId.in(targetEmployeeIds)).where({ isActive: true }).all();
    
    // Find Org level default working time if any
    const orgWorkingTimes = await db.orm.public.WorkingTime.where({
      organizationId: auth.organizationId,
      isActive: true
    }).all();
    const orgWorkingTime = orgWorkingTimes.find((w: any) => !w.employeeId);

    const defaultWT = orgWorkingTime || {
      monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0
    };

    const wtMap = new Map(workingTimes.map((wt: any) => [wt.employeeId, wt]));
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const getCapacity = (employeeId: string) => {
      const wt = wtMap.get(employeeId) || defaultWT;
      const dayMap = [wt.sunday, wt.monday, wt.tuesday, wt.wednesday, wt.thursday, wt.friday, wt.saturday];
      let capacity = 0;
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        capacity += dayMap[d.getDay()] || 0;
      }
      return capacity;
    };

    const activeTasks = await db.orm.public.Task
      .where((e: any) => e.assigneeId.in(targetEmployeeIds))
      .where({ isActive: true })
      .where((e: any) => e.status.notEquals('DONE'))
      .all();

    const projectIds = Array.from(new Set(activeTasks.map((t: any) => t.projectId)));
    let projects: any[] = [];
    if (projectIds.length > 0) {
      projects = await db.orm.public.Project.where((e: any) => e.id.in(projectIds)).all();
    }
    const projectMap = new Map(projects.map((p: any) => [p.id, p]));

    const result = employees.map((emp: any) => {
      const availableCapacity = getCapacity(emp.id);
      const empTasks = activeTasks.filter((t: any) => t.assigneeId === emp.id);
      
      let plannedDemand = 0;
      const projectDemandMap = new Map<string, { projectId: string, projectName: string, demand: number }>();
      
      for (const t of empTasks) {
        const est = t.estimatedHours || 0;
        plannedDemand += est;
        
        if (est > 0) {
          const p = projectMap.get(t.projectId);
          const pName = p ? p.name : 'Unknown Project';
          if (!projectDemandMap.has(t.projectId)) {
            projectDemandMap.set(t.projectId, { projectId: t.projectId, projectName: pName, demand: 0 });
          }
          projectDemandMap.get(t.projectId)!.demand += est;
        }
      }

      const remainingCapacity = availableCapacity - plannedDemand;
      const isOverAllocated = plannedDemand > availableCapacity;
      const utilizationPercentage = availableCapacity > 0 ? Math.round((plannedDemand / availableCapacity) * 100) : (plannedDemand > 0 ? 100 : 0);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        availableCapacity,
        plannedDemand,
        remainingCapacity,
        isOverAllocated,
        utilizationPercentage,
        projectDemand: Array.from(projectDemandMap.values())
      };
    });

    return result.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
  }
}

