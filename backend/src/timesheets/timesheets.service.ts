import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { WorkingTimesService } from '../working-times/working-times.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly workingTimesService: WorkingTimesService,
    private readonly auditLogsService: AuditLogsService
  ) {}

  // ---------------------------------------------------------------------------
  // Internal helper: enrich a timesheet with Expected / Logged / Approved hours
  // ---------------------------------------------------------------------------
  private async enrichWithHours(timesheet: any, organizationId: string) {
    const startDate = this.extractDateString(timesheet.startDate);
    const endDate = this.extractDateString(timesheet.endDate);

    // Expected hours (holiday-aware)
    const { total: expectedHours } = await this.workingTimesService.calculateExpectedHours(
      timesheet.employeeId,
      organizationId,
      startDate,
      endDate,
    );

    // All time entries for this timesheet
    const timeEntries = await db.orm.public.TimeEntry.where({ timesheetId: timesheet.id }).all();

    // Logged = all entries regardless of status
    const loggedHours = timeEntries.reduce((sum: number, e: any) => sum + Number(e.hours), 0);

    // Approved = entries whose parent timesheet is APPROVED
    const approvedHours = timesheet.status === 'APPROVED' ? loggedHours : 0;

    const variance = loggedHours - expectedHours;

    return {
      ...timesheet,
      timeEntries,
      summary: {
        expectedHours: Math.round(expectedHours * 100) / 100,
        loggedHours: Math.round(loggedHours * 100) / 100,
        approvedHours: Math.round(approvedHours * 100) / 100,
        variance: Math.round(variance * 100) / 100,
      },
    };
  }

  /** Convert Prisma date (could be string or Date) to YYYY-MM-DD */
  private extractDateString(date: string | Date | unknown): string {
    if (!date) return '';
    const d = new Date(String(date));
    return d.toISOString().split('T')[0];
  }

  // ---------------------------------------------------------------------------
  async findMyTimesheets(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const employeeId = auth.employeeId;
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

    // Enrich each timesheet with hour summaries
    const enriched = await Promise.all(
      timesheets.map(ts => this.enrichWithHours(ts, auth.organizationId))
    );

    return {
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;
    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');
    
    const tsEmployee = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!tsEmployee) {
      throw new ForbiddenException('You do not have access to this timesheet');
    }

    if (timesheet.employeeId !== employeeId) {
      if (tsEmployee.teamId) {
        const team = await db.orm.public.Team.where({ id: tsEmployee.teamId, organizationId: auth.organizationId }).first();
        if (team?.managerId !== employeeId) {
          throw new ForbiddenException('You do not have access to this timesheet');
        }
      } else {
        throw new ForbiddenException('You do not have access to this timesheet');
      }
    }

    return this.enrichWithHours(timesheet, auth.organizationId);
  }

  async findPendingApprovals(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;

    let employeeIds: string[] = [];

    if (auth.roles.includes('ADMIN')) {
      const allEmps = await db.orm.public.Employee.where({ organizationId: auth.organizationId, isActive: true }).all();
      employeeIds = allEmps.map(e => e.id);
    } else {
      const managedTeams = await db.orm.public.Team.where({ managerId: auth.employeeId, organizationId: auth.organizationId }).all();
      const teamIds = managedTeams.map(t => t.id);

      if (teamIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

      for (const tid of teamIds) {
        const emps = await db.orm.public.Employee.where({ teamId: tid, organizationId: auth.organizationId }).all();
        employeeIds.push(...emps.map(e => e.id));
      }
    }

    if (employeeIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

    const allTimesheets: any[] = [];
    for (const eid of employeeIds) {
      const ts = await db.orm.public.Timesheet.where({ employeeId: eid, status: 'SUBMITTED' }).all();
      allTimesheets.push(...ts);
    }

    allTimesheets.sort((a, b) => new Date(String(b.startDate)).getTime() - new Date(String(a.startDate)).getTime());

    const total = allTimesheets.length;
    const page_data = allTimesheets.slice(offset, offset + limit);

    // Enrich with hour summaries
    const enriched = await Promise.all(
      page_data.map(ts => this.enrichWithHours(ts, auth.organizationId))
    );

    return {
      data: enriched,
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

    const action = timesheet.status === 'REJECTED' ? 'RESUBMITTED' : 'SUBMITTED';
    const updated = await db.orm.public.Timesheet.where({ id }).update({ status: 'SUBMITTED', rejectionComment: null });
    
    await db.orm.public.TimesheetAudit.create({
      timesheetId: id,
      actorId: auth.employeeId,
      action: action,
      comments: null
    });
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIMESHEET_SUBMITTED', 'Timesheet', id);
    }

    return updated;
  }

  async approve(id: string, auth: AuthenticatedContext) {
    const managerId = auth.employeeId;
    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');

    const emp = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');

    const isAdmin = auth.roles.includes('ADMIN');
    if (!isAdmin) {
      const team = emp.teamId ? await db.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first() : null;
      if (!team || team.managerId !== managerId) {
        throw new ForbiddenException('You are not authorized to approve this timesheet');
      }
    }

    if (timesheet.status !== 'SUBMITTED') {
      throw new BadRequestException('Only SUBMITTED timesheets can be approved');
    }

    const updated = await db.orm.public.Timesheet.where({ id }).update({ status: 'APPROVED' });
    
    await db.orm.public.TimesheetAudit.create({
      timesheetId: id,
      actorId: auth.employeeId,
      action: 'APPROVED',
      comments: null
    });

    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIMESHEET_APPROVED', 'Timesheet', id);
    }

    return updated;
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

    const isAdmin = auth.roles.includes('ADMIN');
    if (!isAdmin) {
      const team = emp.teamId ? await db.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first() : null;
      if (!team || team.managerId !== managerId) {
        throw new ForbiddenException('You are not authorized to reject this timesheet');
      }
    }

    if (timesheet.status !== 'SUBMITTED') {
      throw new BadRequestException('Only SUBMITTED timesheets can be rejected');
    }

    const updated = await db.orm.public.Timesheet.where({ id }).update({ status: 'REJECTED', rejectionComment: comment.trim() });

    await db.orm.public.TimesheetAudit.create({
      timesheetId: id,
      actorId: auth.employeeId,
      action: 'REJECTED',
      comments: comment.trim()
    });
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIMESHEET_REJECTED', 'Timesheet', id, {
        comment: comment.trim()
      });
    }

    return updated;
  }

  async getHistory(id: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;
    const timesheet = await db.orm.public.Timesheet.where({ id }).first();
    if (!timesheet) throw new NotFoundException('Timesheet not found');
    
    const tsEmployee = await db.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
    if (!tsEmployee) {
      throw new ForbiddenException('You do not have access to this timesheet');
    }

    if (timesheet.employeeId !== employeeId) {
      if (auth.roles.includes('ADMIN')) {
        // Admins can view any authorized organization timesheet
      } else if (tsEmployee.teamId) {
        const team = await db.orm.public.Team.where({ id: tsEmployee.teamId, organizationId: auth.organizationId }).first();
        if (team?.managerId !== employeeId) {
          throw new ForbiddenException('You do not have access to this timesheet history');
        }
      } else {
        throw new ForbiddenException('You do not have access to this timesheet history');
      }
    }

    const audits = await db.orm.public.TimesheetAudit.where({ timesheetId: id })
      .orderBy(a => a.timestamp.asc())
      .all();
      
    return audits;
  }
}
