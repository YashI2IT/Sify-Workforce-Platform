import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { getUtcMonday } from '../common/date.utils.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

export function getMonday(d: any): Date {
  return getUtcMonday(d);
}

@Injectable()
export class TimeEntriesService {
  constructor(private auditLogsService: AuditLogsService) {}

  async validateReferences(employeeId: string, projectId: string, taskId: string, activityId: string, orgId: string) {
    // Run independent lookups in parallel to avoid sequential round-trips
    const [employee, project, assignment] = await Promise.all([
      db.orm.public.Employee.where({ id: employeeId, organizationId: orgId }).first(),
      db.orm.public.Project.where({ id: projectId }).first(),
      db.orm.public.EmployeeProject.where({ employeeId, projectId }).first(),
    ]);

    if (!employee) throw new NotFoundException('Employee not found');
    if (!employee.isActive) throw new BadRequestException('Employee is inactive');
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot log time for an inactive or completed/on-hold project');
    }
    if (employee.organizationId !== project.organizationId) {
      throw new BadRequestException('Cross-organization assignment is not allowed');
    }
    if (!assignment) throw new BadRequestException('Employee is not assigned to this project');

    // Task and Activity must belong to the same project — run them in parallel
    const [task, activity] = await Promise.all([
      db.orm.public.Task.where({ id: taskId }).first(),
      db.orm.public.Activity.where({ id: activityId }).first(),
    ]);

    if (!task) throw new NotFoundException('Task not found');
    if (task.projectId !== projectId) throw new BadRequestException('Task does not belong to the project');
    if (!task.isActive || task.status === 'COMPLETED') {
      throw new BadRequestException('Cannot log time for an inactive or completed task');
    }
    if (!activity) throw new NotFoundException('Activity not found');
    if (activity.projectId !== projectId) throw new BadRequestException('Activity does not belong to the project');
    if (!activity.isActive) throw new BadRequestException('Activity is inactive');
  }

  private async getOrCreateTimesheet(employeeId: string, dateString: string, orgId: string) {
    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: orgId }).first();
    const timeZone = settings?.timeZone || 'UTC';

    const plainDate = (globalThis as any).Temporal.PlainDate.from(dateString);
    const dayOfWeek = plainDate.dayOfWeek; // 1 = Monday, 7 = Sunday
    const diffToMonday = 1 - dayOfWeek;
    const monday = plainDate.add({ days: diffToMonday });
    const sunday = plainDate.add({ days: diffToMonday + 6 });

    const startDate = monday.toZonedDateTime({ timeZone, plainTime: '00:00:00' }).toInstant();
    const endDate = sunday.toZonedDateTime({ timeZone, plainTime: '23:59:59.999' }).toInstant();

    let timesheet: any;
    let attempts = 0;
    
    while (attempts < 3) {
      timesheet = await db.orm.public.Timesheet.where({ employeeId, startDate }).first();
      
      if (timesheet) break;
      
      try {
        timesheet = await db.orm.public.Timesheet.create({
          employeeId,
          startDate,
          endDate,
          status: 'DRAFT',
        });
        break;
      } catch (err: any) {
        // Catch unique constraint violation (P2002)
        if (err.code === 'P2002' || err.message?.includes('Unique constraint') || err.message?.includes('duplicate key')) {
          attempts++;
          continue;
        }
        throw err;
      }
    }

    if (!timesheet) {
      throw new Error('Concurrency failure: Could not acquire timesheet after multiple attempts.');
    }

    return timesheet.id;
  }

  private async ensureMutableTimesheet(timesheetId: string, auth: AuthenticatedContext, targetDate?: string) {
    const timesheet = await db.orm.public.Timesheet.where({ id: timesheetId }).first();
    if (timesheet && (timesheet.status === 'SUBMITTED' || timesheet.status === 'APPROVED')) {
      if (targetDate) {
        throw new BadRequestException(`Cannot log time on ${targetDate} because the timesheet for that week is already ${timesheet.status}.`);
      } else {
        throw new BadRequestException(`Cannot modify time entries because the timesheet is already ${timesheet.status}.`);
      }
    }
  }

  async create(dto: CreateTimeEntryDto, auth: AuthenticatedContext) {
    const targetEmployeeId = auth.employeeId;

    await this.validateReferences(targetEmployeeId, dto.projectId, dto.taskId, dto.activityId, auth.organizationId);

    const timesheetId = await this.getOrCreateTimesheet(targetEmployeeId, dto.date, auth.organizationId);
    await this.ensureMutableTimesheet(timesheetId, auth, dto.date);

    const timeEntry = await db.orm.public.TimeEntry.create({
      employeeId: targetEmployeeId,
      projectId: dto.projectId,
      taskId: dto.taskId,
      activityId: dto.activityId,
      timesheetId,
      date: dto.date,
      hours: dto.hours,
      remarks: dto.remarks ?? null,
    });

    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIME_ENTRY_CREATED', 'TimeEntry', timeEntry.id, {
        timesheetId,
        projectId: dto.projectId,
        date: dto.date,
        hours: dto.hours
      });
    }

    return timeEntry;
  }

  async findAllByEmployee(
    employeeId: string,
    auth: AuthenticatedContext,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<any>> {
    const employee = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found or access denied');
    }

    // Basic auth check: either it's their own entries, or they must be a manager of this employee, or an admin
    if (employeeId !== auth.employeeId && !auth.roles.includes('ADMIN')) {
      if (employee.teamId) {
        const team = await db.orm.public.Team.where({ id: employee.teamId, organizationId: auth.organizationId }).first();
        if (team?.managerId !== auth.employeeId) {
           throw new ForbiddenException('Cannot view another employee\'s time entries unless you are their manager');
        }
      } else {
        throw new ForbiddenException('Cannot view another employee\'s time entries');
      }
    }

    const offset = (page - 1) * limit;
    const [entries, countResult] = await Promise.all([
      db.orm.public.TimeEntry.where({ employeeId })
        .orderBy((m: any) => m.date.desc())
        .limit(limit)
        .offset(offset)
        .all(),
      db.orm.public.TimeEntry.where({ employeeId })
        .aggregate((a: any) => ({ count: a.count() })),
    ]);
    const total = (countResult as any)?.count ?? 0;

    const timesheetIds = [...new Set(entries.map((e: any) => e.timesheetId))];
    const timesheets = timesheetIds.length > 0 
      ? await db.orm.public.Timesheet.where((ts: any) => ts.id.in(timesheetIds)).select('id', 'status').all()
      : [];
    
    const tsMap = new Map(timesheets.map((ts: any) => [ts.id, ts]));

    const enrichedEntries = entries.map((e: any) => ({
      ...e,
      timesheet: tsMap.get(e.timesheetId) || undefined
    }));

    return {
      data: enrichedEntries,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const entry = await db.orm.public.TimeEntry.where({ id }).first();
    if (!entry) {
      throw new NotFoundException('Time Entry not found');
    }
    const employee = await db.orm.public.Employee.where({ id: entry.employeeId }).first();
    if (!employee || employee.organizationId !== auth.organizationId) {
      throw new NotFoundException('Time Entry not found');
    }
    // Also verify employee ownership where appropriate.
    if (entry.employeeId !== auth.employeeId && !auth.roles.includes('ADMIN')) {
       if (employee.teamId) {
          const team = await db.orm.public.Team.where({ id: employee.teamId }).first();
          if (team?.managerId !== auth.employeeId) {
             throw new ForbiddenException('Cannot view another employee\'s time entry unless you are their manager');
          }
       } else {
          throw new ForbiddenException('Cannot view another employee\'s time entry');
       }
    }

    return entry;
  }

  async update(id: string, dto: UpdateTimeEntryDto, auth: AuthenticatedContext) {
    const existingEntry = await db.orm.public.TimeEntry.where({ id }).first();
    if (!existingEntry) {
      throw new NotFoundException('Time Entry not found');
    }
    
    if (existingEntry.employeeId !== auth.employeeId) {
      throw new ForbiddenException('Cannot edit another employee\'s time entry');
    }

    // Determine target date for timesheet validation
    const targetDate = dto.date ?? existingEntry.date;
    const timesheetId = await this.getOrCreateTimesheet(existingEntry.employeeId, targetDate, auth.organizationId);
    await this.ensureMutableTimesheet(timesheetId, auth, targetDate);

    // If date changed, we must also verify the original timesheet was mutable
    if (dto.date && dto.date !== existingEntry.date) {
       const oldTsId = await this.getOrCreateTimesheet(existingEntry.employeeId, existingEntry.date, auth.organizationId);
       await this.ensureMutableTimesheet(oldTsId, auth, existingEntry.date);
    }

    const newProjectId = dto.projectId ?? existingEntry.projectId;
    const newTaskId = dto.taskId ?? existingEntry.taskId;
    const newActivityId = dto.activityId ?? existingEntry.activityId;

    await this.validateReferences(existingEntry.employeeId, newProjectId, newTaskId, newActivityId, auth.organizationId);

    const updatedData: any = {};
    if (dto.projectId !== undefined) updatedData.projectId = dto.projectId;
    if (dto.taskId !== undefined) updatedData.taskId = dto.taskId;
    if (dto.activityId !== undefined) updatedData.activityId = dto.activityId;
    if (dto.date !== undefined) updatedData.date = dto.date;
    if (dto.hours !== undefined) updatedData.hours = dto.hours;
    if (dto.remarks !== undefined) updatedData.remarks = dto.remarks === null ? null : dto.remarks;
    if (timesheetId !== existingEntry.timesheetId) updatedData.timesheetId = timesheetId;

    if (Object.keys(updatedData).length === 0) {
      return existingEntry;
    }

    const updatedEntry = await db.orm.public.TimeEntry.where({ id }).update(updatedData);
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIME_ENTRY_UPDATED', 'TimeEntry', id, {
        updatedFields: Object.keys(updatedData)
      });
    }

    return updatedEntry;
  }

  async remove(id: string, auth: AuthenticatedContext) {
    const existingEntry = await db.orm.public.TimeEntry.where({ id }).first();
    if (!existingEntry) {
      throw new NotFoundException('Time Entry not found');
    }
    
    if (existingEntry.employeeId !== auth.employeeId) {
      throw new ForbiddenException('Cannot delete another employee\'s time entry');
    }

    await this.validateReferences(existingEntry.employeeId, existingEntry.projectId, existingEntry.taskId, existingEntry.activityId, auth.organizationId);

    await this.ensureMutableTimesheet(existingEntry.timesheetId, auth, existingEntry.date);

    const deletedEntry = await db.orm.public.TimeEntry.where({ id }).delete();
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIME_ENTRY_DELETED', 'TimeEntry', id);
    }

    return { success: true };
  }
}
