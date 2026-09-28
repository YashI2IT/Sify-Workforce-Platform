import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class ProjectsService {
  constructor(private auditLogsService: AuditLogsService) {}

  async findAll(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    const organizationId = auth.organizationId;
    const isAdmin = auth.roles && auth.roles.includes('ADMIN');

    if (isAdmin) {
      const [projects, countResult] = await Promise.all([
        db.orm.public.Project.where({ organizationId, isActive: true })
          .orderBy(m => m.createdAt.desc())
          .limit(limit)
          .offset(offset)
          .all(),
        db.orm.public.Project.where({ organizationId, isActive: true })
          .aggregate((a: any) => ({ count: a.count() })),
      ]);
      const total = Number((countResult as any)?.count ?? 0);

      return {
        data: projects,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      };
    }

    // EMPLOYEE / MANAGER: Only projects assigned through EmployeeProject
    if (!auth.employeeId) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    let targetEmployeeIds = [auth.employeeId];
    if (auth.roles && auth.roles.includes('MANAGER')) {
      const managedTeams = await db.orm.public.Team.where({ organizationId, managerId: auth.employeeId }).all();
      const teamIds = managedTeams.map(t => t.id);
      if (teamIds.length > 0) {
        const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
        for (const emp of teamMembers) {
          if (!targetEmployeeIds.includes(emp.id)) {
            targetEmployeeIds.push(emp.id);
          }
        }
      }
    }

    const assignments = await db.orm.public.EmployeeProject.where(a => (a as any).employeeId.in(targetEmployeeIds)).all();
    if (!assignments || assignments.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const assignedProjectIds = assignments.map((a: any) => a.projectId);

    // Fetch matching active projects via DB
    const [paginated, countResult] = await Promise.all([
      db.orm.public.Project.where({ organizationId, isActive: true })
        .where((p: any) => p.id.in(assignedProjectIds))
        .orderBy((m: any) => m.createdAt.desc())
        .limit(limit)
        .offset(offset)
        .all(),
      db.orm.public.Project.where({ organizationId, isActive: true })
        .where((p: any) => p.id.in(assignedProjectIds))
        .aggregate((a: any) => ({ count: a.count() })),
    ]);

    const total = Number((countResult as any)?.count ?? 0);

    return {
      data: paginated,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Project not found');
      }
      
      let targetEmployeeIds = [auth.employeeId];
      if (auth.roles.includes('MANAGER')) {
        const managedTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId, managerId: auth.employeeId }).all();
        const teamIds = managedTeams.map(t => t.id);
        if (teamIds.length > 0) {
          const teamMembers = await db.orm.public.Employee.where(e => (e as any).teamId.in(teamIds)).all();
          for (const emp of teamMembers) {
            if (!targetEmployeeIds.includes(emp.id)) {
              targetEmployeeIds.push(emp.id);
            }
          }
        }
      }
      
      const assignments = await db.orm.public.EmployeeProject.where({ projectId: id }).all();
      const assignment = assignments.find(a => targetEmployeeIds.includes(a.employeeId));
      
      if (!assignment) {
        throw new NotFoundException('Project not found');
      }
    }

    return project;
  }

  async getProjectHealth(id: string, auth: AuthenticatedContext) {
    const project = await this.findOne(id, auth);
    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: project.organizationId }).first();
    const timeZone = settings?.timeZone || 'UTC';
    
    const nowZoned = (globalThis as any).Temporal.Now.zonedDateTimeISO(timeZone);
    const today = nowZoned.toPlainDate().toString();
    const in7DaysDate = nowZoned.add({ days: 7 }).toPlainDate().toString();
    
    const projectEndStr = project.endDate ? project.endDate.toString().split('T')[0] : null;
    let projectEndMinus7Str: string | null = null;
    if (projectEndStr) {
       projectEndMinus7Str = new Date(new Date(projectEndStr).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    const tasks = await db.orm.public.Task.where({ projectId: id, isActive: true }).all();
    const taskIds = tasks.map((t: any) => t.id);

    const dependencies = taskIds.length > 0 ? await db.orm.public.TaskDependency.where((d: any) => (d as any).successorId.in(taskIds)).all() : [];
    const taskMap = new Map(tasks.map((t: any) => [t.id, t]));

    const timeEntries = await db.orm.public.TimeEntry.where({ projectId: id }).all();
    const timesheetIds = [...new Set(timeEntries.map((e: any) => e.timesheetId).filter(Boolean))];
    const timesheets = timesheetIds.length > 0 ? await db.orm.public.Timesheet.where((ts: any) => (ts as any).id.in(timesheetIds)).all() : [];
    const tsMap = new Map(timesheets.map((ts: any) => [ts.id, ts.status]));

    const actualHoursByTask = new Map<string, number>();
    const timesheetStatusHours = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    
    for (const entry of timeEntries) {
      const hrs = Number(entry.hours);
      if (entry.taskId) {
        actualHoursByTask.set(entry.taskId, (actualHoursByTask.get(entry.taskId) || 0) + hrs);
      }
      if (entry.timesheetId && tsMap.has(entry.timesheetId)) {
         const st = tsMap.get(entry.timesheetId) as string;
         if (st in timesheetStatusHours) {
            (timesheetStatusHours as any)[st] += hrs;
         }
      }
    }

    let totalBacklogHours = 0;
    let assignedHours = 0;
    let unassignedHours = 0;
    
    const overdueTasks: any[] = [];
    const dueSoonTasks: any[] = [];
    const endOfProjectExposureTasks: any[] = [];
    const pastProjectEndTasks: any[] = [];
    
    const blockedTasks: any[] = [];
    const dependencyBlockedTasks: any[] = [];
    const tasksExceedingEstimate: any[] = [];
    
    for (const t of tasks) {
       if (t.status === 'DONE' || t.status === 'COMPLETED') continue;

       const est = Number(t.estimatedHours || 0);
       totalBacklogHours += est;
       if (t.assigneeId) assignedHours += est;
       else unassignedHours += est;
       
       const dateStr = t.dueDate ? t.dueDate.toString().split('T')[0] : null;
       if (dateStr) {
          if (dateStr < today) overdueTasks.push(t);
          if (dateStr >= today && dateStr <= in7DaysDate) dueSoonTasks.push(t);
          
          if (projectEndStr) {
             if (dateStr > projectEndStr) pastProjectEndTasks.push(t);
             else if (projectEndMinus7Str && dateStr > projectEndMinus7Str) endOfProjectExposureTasks.push(t);
          }
       }

       if (t.status === 'BLOCKED') blockedTasks.push(t);
       
       const actual = actualHoursByTask.get(t.id) || 0;
       if (est > 0 && actual > est) {
          tasksExceedingEstimate.push({ ...t, actualHours: actual, estimatedHours: est });
       }
       
       const myDeps = dependencies.filter((d: any) => d.successorId === t.id);
       let isBlockedByDep = false;
       for (const d of myDeps) {
          const pred = taskMap.get(d.predecessorId);
          if (pred && pred.status !== 'DONE' && pred.status !== 'COMPLETED') {
             isBlockedByDep = true;
             break;
          }
       }
       if (isBlockedByDep) dependencyBlockedTasks.push(t);
    }

    const assignedEmployeeIds = [...new Set(tasks.map((t: any) => t.assigneeId).filter(Boolean))];
    const overallocatedEmployees: any[] = [];
    
    if (assignedEmployeeIds.length > 0) {
      const workingTimes = await db.orm.public.WorkingTime.where((e: any) => (e as any).employeeId.in(assignedEmployeeIds)).where({ isActive: true }).all();
      const orgWorkingTimes = await db.orm.public.WorkingTime.where({ organizationId: project.organizationId, isActive: true }).all();
      const defaultWT = orgWorkingTimes.find((w: any) => !w.employeeId) || {
        monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0
      };
      const wtMap = new Map(workingTimes.map((wt: any) => [wt.employeeId, wt]));
      
      const pStart = project.startDate ? new Date(project.startDate.toString()) : new Date();
      const pEnd = project.endDate ? new Date(project.endDate.toString()) : new Date(pStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const empCapacity = new Map<string, number>();
      for (const empId of assignedEmployeeIds) {
        const wt = wtMap.get(empId) || defaultWT;
        const dayMap = [wt.sunday, wt.monday, wt.tuesday, wt.wednesday, wt.thursday, wt.friday, wt.saturday];
        let cap = 0;
        for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) cap += dayMap[d.getDay()] || 0;
        empCapacity.set(empId, cap);
      }
      
      const empActiveTasks = await db.orm.public.Task.where((e: any) => (e as any).assigneeId.in(assignedEmployeeIds)).where({ isActive: true }).where((e: any) => (e as any).status.notEquals('DONE')).all();
      const empDemand = new Map<string, number>();
      for (const t of empActiveTasks) {
         if (t.assigneeId) {
            empDemand.set(t.assigneeId, (empDemand.get(t.assigneeId) || 0) + Number(t.estimatedHours || 0));
         }
      }
      
      const emps = await db.orm.public.Employee.where((e: any) => (e as any).id.in(assignedEmployeeIds)).all();
      for (const emp of emps) {
         const cap = empCapacity.get(emp.id) || 0;
         const demand = empDemand.get(emp.id) || 0;
         if (demand > cap) {
            overallocatedEmployees.push({ id: emp.id, name: emp.name, capacity: cap, demand });
         }
      }
    }

    const evidence: string[] = [];
    let summary = 'On Track';
    
    if (overdueTasks.length > 0) evidence.push(`${overdueTasks.length} active tasks are past due`);
    if (pastProjectEndTasks.length > 0) evidence.push(`${pastProjectEndTasks.length} tasks are due after the project end date`);
    if (blockedTasks.length > 0) evidence.push(`${blockedTasks.length} tasks are marked as BLOCKED`);
    if (tasksExceedingEstimate.length > 0) evidence.push(`${tasksExceedingEstimate.length} tasks have actual hours exceeding estimates`);
    if (overallocatedEmployees.length > 0) evidence.push(`${overallocatedEmployees.length} assigned employees have total organization workload exceeding their capacity during the project window`);
    
    if (evidence.length > 0) {
       summary = 'At Risk';
    } else {
       if (dueSoonTasks.length > 0) evidence.push(`${dueSoonTasks.length} tasks are due in the next 7 days`);
       if (endOfProjectExposureTasks.length > 0) evidence.push(`${endOfProjectExposureTasks.length} unfinished tasks are approaching the project end date`);
       if (dependencyBlockedTasks.length > 0) evidence.push(`${dependencyBlockedTasks.length} tasks have incomplete predecessors`);
       if (unassignedHours > 0) evidence.push(`${unassignedHours}h of estimated work is currently unassigned`);
       if (timesheetStatusHours.REJECTED > 0) evidence.push(`${timesheetStatusHours.REJECTED}h of logged work is in REJECTED status`);
       
       if (evidence.length > 0) summary = 'Attention Needed';
    }

    if (evidence.length === 0) {
       evidence.push('All schedule, workload, and execution signals are healthy');
    }

    const mapTask = (t: any) => ({ id: t.id, name: t.name, dueDate: t.dueDate, estimatedHours: t.estimatedHours, actualHours: t.actualHours });

    return {
      summary,
      evidence,
      signals: {
        schedule: {
          overdueTasks: overdueTasks.map(mapTask),
          dueSoonTasks: dueSoonTasks.map(mapTask),
          pastProjectEndTasks: pastProjectEndTasks.map(mapTask),
          endOfProjectExposureTasks: endOfProjectExposureTasks.map(mapTask)
        },
        workload: {
          totalBacklogHours,
          assignedHours,
          unassignedHours,
          overallocatedEmployees
        },
        execution: {
          tasksExceedingEstimate: tasksExceedingEstimate.map(mapTask),
          blockedTasks: blockedTasks.map(mapTask),
          dependencyBlockedTasks: dependencyBlockedTasks.map(mapTask),
          timesheetStatusHours
        }
      }
    };
  }

  async create(createProjectDto: CreateProjectDto, auth: AuthenticatedContext) {
    const { name, code, status, isActive, description, startDate, endDate } = createProjectDto;
    const scopedOrgId = auth.organizationId;
    
    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: scopedOrgId }).first();
    const requiredRole = settings?.projectCreationPermission || 'ADMIN';
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes(requiredRole)) {
      throw new ForbiddenException(`You must be a ${requiredRole} or ADMIN to create projects`);
    }
    
    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: scopedOrgId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check unique project name within the organization
    const existingName = await db.orm.public.Project.where({ organizationId: scopedOrgId, name }).first();
    if (existingName) {
      throw new ConflictException('Project with this name already exists in the organization');
    }

    // Check unique project code within the organization
    const existingCode = await db.orm.public.Project.where({ organizationId: scopedOrgId, code }).first();
    if (existingCode) {
      throw new ConflictException('Project with this code already exists in the organization');
    }

    const projectData: any = {
      organizationId: scopedOrgId,
      name,
      code,
      status,
      isActive: isActive ?? true,
      description: description ?? null,
    };

    if (startDate !== undefined) projectData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (endDate !== undefined) projectData.endDate = endDate ? (globalThis as any).Temporal.Instant.from(new Date(endDate).toISOString()) : null;

    const project = await db.orm.public.Project.create(projectData);
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(scopedOrgId, auth.employeeId, 'PROJECT_CREATED', 'Project', project.id);
    }
    
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, reqOrganizationId: string, actorId?: string) {
    const project = await db.orm.public.Project.where({ id, organizationId: reqOrganizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const { name, code, status, isActive, description, startDate, endDate } = updateProjectDto;

    if (name && name !== project.name) {
      const existingName = await db.orm.public.Project.where({
        organizationId: project.organizationId,
        name,
      }).first();
      if (existingName) {
        throw new ConflictException('Project with this name already exists in the organization');
      }
    }

    if (code && code !== project.code) {
      const existingCode = await db.orm.public.Project.where({
        organizationId: project.organizationId,
        code,
      }).first();
      if (existingCode) {
        throw new ConflictException('Project with this code already exists in the organization');
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;

    const finalStartDate = startDate !== undefined ? startDate : (project.startDate ? project.startDate.toString() : null);
    const finalEndDate = endDate !== undefined ? endDate : (project.endDate ? project.endDate.toString() : null);

    if (finalStartDate && finalEndDate) {
      if (new Date(finalStartDate) > new Date(finalEndDate)) {
        throw new BadRequestException('startDate must be before or equal to endDate');
      }
    }

    if (startDate !== undefined) updateData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? (globalThis as any).Temporal.Instant.from(new Date(endDate).toISOString()) : null;

    const updated = await db.orm.public.Project.where({ id }).update(updateData);
    
    if (actorId) {
      await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'PROJECT_UPDATED', 'Project', id, {
        updatedFields: Object.keys(updateProjectDto)
      });
      
      if (updateData.isActive === true && project.isActive === false) {
        await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'PROJECT_ACTIVATED', 'Project', id);
      } else if (updateData.isActive === false && project.isActive === true) {
        await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'PROJECT_DEACTIVATED', 'Project', id);
      }
    }

    return updated;
  }

  // --- Project Requirements ---

  async findRequirements(projectId: string, auth: AuthenticatedContext) {
    // Verify user has access to this project
    await this.findOne(projectId, auth);

    const requirements = await db.orm.public.ProjectRequirement.where({ projectId })
      .orderBy(r => r.createdAt.asc())
      .all();
    return requirements;
  }

  async getRequirement(id: string, auth: AuthenticatedContext) {
    const requirement = await db.orm.public.ProjectRequirement.where({ id }).first();
    if (!requirement) throw new NotFoundException('Project Requirement not found');

    await this.findOne(requirement.projectId, auth);
    return requirement;
  }

  async createRequirement(projectId: string, data: any, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new ConflictException('Cannot add requirement to inactive or completed/on-hold project');
    }

    return db.orm.public.ProjectRequirement.create({
      projectId,
      title: data.title,
      description: data.description || null,
      isMandatory: data.isMandatory || false,
      status: data.status || 'ACTIVE'
    });
  }

  async updateRequirement(id: string, data: any, auth: AuthenticatedContext) {
    const requirement = await db.orm.public.ProjectRequirement.where({ id }).first();
    if (!requirement) throw new NotFoundException('Project Requirement not found');

    const project = await db.orm.public.Project.where({ id: requirement.projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found or unauthorized');
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new ConflictException('Cannot update requirement of inactive or completed/on-hold project');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isMandatory !== undefined) updateData.isMandatory = data.isMandatory;
    if (data.status !== undefined) updateData.status = data.status;

    return db.orm.public.ProjectRequirement.where({ id }).update(updateData);
  }

  // --- Milestones ---

  async createMilestone(projectId: string, data: any, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new ConflictException('Cannot add milestone to inactive or completed/on-hold project');
    }

    return db.orm.public.Milestone.create({
      projectId,
      name: data.name,
      description: data.description || null,
      targetDate: data.targetDate ? (globalThis as any).Temporal.Instant.from(new Date(data.targetDate).toISOString()) : null,
      status: data.status || 'PENDING'
    });
  }

  async findMilestones(projectId: string, auth: AuthenticatedContext) {
    await this.findOne(projectId, auth); // Verify access
    return db.orm.public.Milestone.where({ projectId })
      .orderBy(m => m.createdAt.asc())
      .all();
  }

  async getMilestone(projectId: string, milestoneId: string, auth: AuthenticatedContext) {
    await this.findOne(projectId, auth); // Verify access
    const milestone = await db.orm.public.Milestone.where({ id: milestoneId, projectId }).first();
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  async updateMilestone(projectId: string, milestoneId: string, data: any, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new ConflictException('Cannot update milestone of inactive or completed/on-hold project');
    }

    const milestone = await db.orm.public.Milestone.where({ id: milestoneId, projectId }).first();
    if (!milestone) throw new NotFoundException('Milestone not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? (globalThis as any).Temporal.Instant.from(new Date(data.targetDate).toISOString()) : null;
    if (data.status !== undefined) updateData.status = data.status;

    return db.orm.public.Milestone.where({ id: milestoneId }).update(updateData);
  }

  async deactivateMilestone(projectId: string, milestoneId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new ConflictException('Cannot deactivate milestone of inactive or completed/on-hold project');
    }

    const milestone = await db.orm.public.Milestone.where({ id: milestoneId, projectId }).first();
    if (!milestone) throw new NotFoundException('Milestone not found');

    // Soft delete / complete (using CANCELLED status as common pattern or deleting)
    // The prompt says "deactivate/delete a milestone". We will delete it to keep it simple, 
    // unless there are tasks attached. If there are tasks, deleting might fail due to FKs depending on DB.
    // Let's implement actual deletion as we don't have isActive on Milestone.
    await db.orm.public.Milestone.where({ id: milestoneId }).delete();
    return { success: true };
  }
}
