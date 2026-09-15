import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { PaginatedResponse } from '../common/pagination.dto.js';

@Injectable()
export class TimesheetsService {
  async findMyTimesheets(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const employeeId = auth.employeeId;
    // Verify employee belongs to the organization
    const employee = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!employee) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

    const offset = (page - 1) * limit;

    const timesheets = await db.orm.public.Timesheet.where({ employeeId })
      .orderBy(m => m.startDate.desc())
      .limit(limit)
      .offset(offset)
      .all();
      
    const allCount = await db.orm.public.Timesheet.where({ employeeId }).all();
    const total = allCount.length;

    return {
      data: timesheets,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;
    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');
    
    // Ensure the timesheet's employee is in the auth organization
    const tsEmployee = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!tsEmployee) {
      throw new ForbiddenException('You do not have access to this timesheet');
    }

    // We assume the caller is authorized if it's their own timesheet
    // or if they are the manager of the employee.
    if (timesheet.employeeId !== employeeId) {
      // Check if employeeId is manager
      // BLOCKED ON REAL COMPANY AUTH: using client-provided manager identity
      if (tsEmployee.teamId) {
        const team = await db.orm.public.Team.where({ id: tsEmployee.teamId, organizationId: auth.organizationId }).first();
        if (team?.managerId !== employeeId) {
          throw new ForbiddenException('You do not have access to this timesheet');
        }
      } else {
        throw new ForbiddenException('You do not have access to this timesheet');
      }
    }

    // Embed time entries
    const timeEntries = await db.orm.public.TimeEntry.where({ timesheetId: id }).all();
    return { ...timesheet, timeEntries };
  }

  async findPendingApprovals(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const managerId = auth.employeeId;
    const offset = (page - 1) * limit;

    // BLOCKED ON REAL COMPANY AUTH: using client-provided manager identity
    // Find teams managed by this manager in this organization
    const managedTeams = await db.orm.public.Team.where({ managerId, organizationId: auth.organizationId }).all();
    const teamIds = managedTeams.map(t => t.id);

    if (teamIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

    // Find employees in those teams
    const employeeIds: string[] = [];
    for (const tid of teamIds) {
      const emps = await db.orm.public.Employee.where({ teamId: tid }).all();
      employeeIds.push(...emps.map(e => e.id));
    }

    if (employeeIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

    // Find submitted timesheets for these employees
    const allTimesheets: any[] = [];
    for (const eid of employeeIds) {
      const ts = await db.orm.public.Timesheet.where({ employeeId: eid, status: 'SUBMITTED' }).all();
      allTimesheets.push(...ts);
    }

    // Sort by startDate desc
    allTimesheets.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    const total = allTimesheets.length;
    const data = allTimesheets.slice(offset, offset + limit);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async submit(id: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;
    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    const emp = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');
    if (timesheet.employeeId !== employeeId) throw new ForbiddenException('Cannot submit another employee\'s timesheet');

    if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
      throw new BadRequestException(`Cannot submit timesheet from status ${timesheet.status}`);
    }

    return db.orm.public.Timesheet.where({ id }).update({ status: 'SUBMITTED', rejectionComment: null });
  }

  async approve(id: string, auth: AuthenticatedContext) {
    const managerId = auth.employeeId;
    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    const emp = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');

    // BLOCKED ON REAL COMPANY AUTH: using client-provided manager identity
    const team = emp.teamId ? await db.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first() : null;
    if (team?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to approve this timesheet');
    }

    if (timesheet.status !== 'SUBMITTED') {
      throw new BadRequestException('Only SUBMITTED timesheets can be approved');
    }

    return db.orm.public.Timesheet.where({ id }).update({ status: 'APPROVED' });
  }

  async reject(id: string, auth: AuthenticatedContext, comment: string) {
    const managerId = auth.employeeId;
    if (!comment || comment.trim() === '') {
      throw new BadRequestException('Rejection requires a non-empty comment');
    }

    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    const emp = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');

    // BLOCKED ON REAL COMPANY AUTH: using client-provided manager identity
    const team = emp.teamId ? await db.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first() : null;
    if (team?.managerId !== managerId) {
      throw new ForbiddenException('You are not authorized to reject this timesheet');
    }

    if (timesheet.status !== 'SUBMITTED') {
      throw new BadRequestException('Only SUBMITTED timesheets can be rejected');
    }

    return db.orm.public.Timesheet.where({ id }).update({ status: 'REJECTED', rejectionComment: comment });
  }
}
