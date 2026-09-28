import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { WorkingTimesService } from '../working-times/working-times.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class TimesheetsService {
  constructor(
    private readonly workingTimesService: WorkingTimesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService
  ) {}

  // ---------------------------------------------------------------------------
  // Internal helper: enrich a timesheet with Expected / Logged / Approved hours
  // Accepts pre-fetched timeEntries to avoid N×1 DB calls in list operations.
  // ---------------------------------------------------------------------------
  private async enrichWithHoursAndEntries(timesheet: any, organizationId: string, timeEntries: any[]) {
    const startDate = this.extractDateString(timesheet.startDate);
    const endDate = this.extractDateString(timesheet.endDate);

    // Expected hours (holiday-aware)
    const { total: expectedHours } = await this.workingTimesService.calculateExpectedHours(
      timesheet.employeeId,
      organizationId,
      startDate,
      endDate,
    );

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

  // Single-timesheet variant used by findOne / approve / reject flows
  private async enrichWithHours(timesheet: any, organizationId: string) {
    const timeEntries = await db.orm.public.TimeEntry.where({ timesheetId: timesheet.id }).all();
    return this.enrichWithHoursAndEntries(timesheet, organizationId, timeEntries);
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

    const [timesheets, countResult] = await Promise.all([
      db.orm.public.Timesheet.where({ employeeId })
        .orderBy(m => m.startDate.desc())
        .limit(limit)
        .offset(offset)
        .all(),
      db.orm.public.Timesheet.where({ employeeId })
        .aggregate((a: any) => ({ count: a.count() })),
    ]);
    const total = (countResult as any)?.count ?? 0;

    // Batch-load all time entries for this page of timesheets in a single query
    const timesheetIds = timesheets.map((ts: any) => ts.id);
    const allEntries = timesheetIds.length > 0
      ? await db.orm.public.TimeEntry.where((e: any) => e.timesheetId.in(timesheetIds)).all()
      : [];
    const entriesByTimesheetId = new Map<string, any[]>();
    for (const e of allEntries) {
      const bucket = entriesByTimesheetId.get(e.timesheetId) ?? [];
      bucket.push(e);
      entriesByTimesheetId.set(e.timesheetId, bucket);
    }

    // Enrich each timesheet with hour summaries using the pre-fetched entries
    const enriched = await Promise.all(
      timesheets.map(ts => this.enrichWithHoursAndEntries(ts, auth.organizationId, entriesByTimesheetId.get(ts.id) ?? []))
    );

    return {
      data: enriched,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) }
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

    if (timesheet.employeeId !== employeeId && !auth.roles.includes('ADMIN')) {
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
      const allEmps = await db.orm.public.Employee.where({ organizationId: auth.organizationId, isActive: true })
        .select('id')
        .all();
      employeeIds = allEmps.map((e: any) => e.id);
    } else {
      const managedTeams = await db.orm.public.Team.where({ managerId: auth.employeeId, organizationId: auth.organizationId }).all();
      const teamIds = managedTeams.map(t => t.id);
      if (teamIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

      // Single batch query instead of N per-team loops
      const members = await db.orm.public.Employee
        .where({ organizationId: auth.organizationId })
        .where((e: any) => e.teamId.in(teamIds))
        .select('id')
        .all();
      employeeIds = members.map((e: any) => e.id);
    }

    if (employeeIds.length === 0) return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };

    // Fetch page + count in parallel; DB handles the filtering — no Node-side accumulation
    const [page_data, countResult] = await Promise.all([
      db.orm.public.Timesheet
        .where((t: any) => t.employeeId.in(employeeIds))
        .where({ status: 'SUBMITTED' })
        .orderBy((m: any) => m.startDate.desc())
        .limit(limit)
        .offset(offset)
        .all(),
      db.orm.public.Timesheet
        .where((t: any) => t.employeeId.in(employeeIds))
        .where({ status: 'SUBMITTED' })
        .aggregate((a: any) => ({ count: a.count() })),
    ]);

    const total = (countResult as any)?.count ?? 0;

    // Batch-load time entries for the current page in a single query
    const timesheetIds = page_data.map((ts: any) => ts.id);
    const allEntries = timesheetIds.length > 0
      ? await db.orm.public.TimeEntry.where((e: any) => e.timesheetId.in(timesheetIds)).all()
      : [];
    const entriesByTimesheetId = new Map<string, any[]>();
    for (const e of allEntries) {
      const bucket = entriesByTimesheetId.get(e.timesheetId) ?? [];
      bucket.push(e);
      entriesByTimesheetId.set(e.timesheetId, bucket);
    }

    // Enrich with hour summaries using pre-fetched entries
    const enriched = await Promise.all(
      page_data.map((ts: any) => this.enrichWithHoursAndEntries(ts, auth.organizationId, entriesByTimesheetId.get(ts.id) ?? []))
    );

    return {
      data: enriched,
      meta: { total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) }
    };
  }

  async submit(id: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;
    return await db.transaction(async (tx) => {
      const timesheet = await tx.orm.public.Timesheet.where({ id }).first();
      if (!timesheet) throw new NotFoundException('Timesheet not found');

      const emp = await tx.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
      if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');
      if (timesheet.employeeId !== employeeId) throw new ForbiddenException('Cannot submit another employee\'s timesheet');

      if (timesheet.status !== 'DRAFT' && timesheet.status !== 'REJECTED') {
        throw new BadRequestException(`Cannot submit timesheet from status ${timesheet.status}`);
      }

      const action = timesheet.status === 'REJECTED' ? 'RESUBMITTED' : 'SUBMITTED';
      const updated = await tx.orm.public.Timesheet.where({ id }).update({ status: 'SUBMITTED', rejectionComment: null });
      
      await tx.orm.public.TimesheetAudit.create({
        timesheetId: id,
        actorId: auth.employeeId,
        action: action,
        comments: null
      });
      
      if (auth.employeeId) {
        await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIMESHEET_SUBMITTED', 'Timesheet', id, undefined, tx);
      }

      if (emp.teamId) {
        const team = await tx.orm.public.Team.where({ id: emp.teamId }).first();
        if (team && team.managerId) {
          const notifType = action === 'RESUBMITTED' ? 'TIMESHEET_RESUBMITTED' : 'TIMESHEET_SUBMITTED';
          const notifTitle = action === 'RESUBMITTED' ? 'Timesheet Resubmitted' : 'Timesheet Submitted';
          const actionVerb = action === 'RESUBMITTED' ? 'resubmitted' : 'submitted';
          
          await this.notificationsService.createNotification({
            recipientId: team.managerId,
            type: notifType,
            title: notifTitle,
            message: `${emp.name} has ${actionVerb} their timesheet for ${timesheet.startDate} to ${timesheet.endDate}.`,
            relatedEntityType: 'TIMESHEET',
            relatedEntityId: timesheet.id,
          }, tx);
        }
      }

      return updated;
    });
  }

  async approve(id: string, auth: AuthenticatedContext) {
    const managerId = auth.employeeId;

    return await db.transaction(async (tx) => {
      const timesheet = await tx.orm.public.Timesheet.where({ id }).first();
      if (!timesheet) throw new NotFoundException('Timesheet not found');

      const emp = await tx.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
      if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');

      const isAdmin = auth.roles.includes('ADMIN');
      if (!isAdmin) {
        const team = emp.teamId ? await tx.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first() : null;
        if (!team || team.managerId !== managerId) {
          throw new ForbiddenException('You are not authorized to approve this timesheet');
        }
      }

      if (timesheet.status !== 'SUBMITTED') {
        throw new BadRequestException('Only SUBMITTED timesheets can be approved');
      }

      const updated = await tx.orm.public.Timesheet.where({ id }).update({ status: 'APPROVED' });
      
      await tx.orm.public.TimesheetAudit.create({
        timesheetId: id,
        actorId: auth.employeeId,
        action: 'APPROVED',
        comments: null
      });

      if (auth.employeeId) {
        await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIMESHEET_APPROVED', 'Timesheet', id, undefined, tx);
      }

      if (auth.employeeId && timesheet.employeeId !== auth.employeeId) {
        await this.notificationsService.createNotification({
          recipientId: timesheet.employeeId,
          type: 'TIMESHEET_APPROVED',
          title: 'Timesheet Approved',
          message: `Your timesheet for ${timesheet.startDate} to ${timesheet.endDate} has been approved.`,
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: timesheet.id,
        }, tx);
      }

      return updated;
    });
  }

  async reject(id: string, auth: AuthenticatedContext, comment: string) {
    const managerId = auth.employeeId;
    if (!comment || comment.trim() === '') {
      throw new BadRequestException('Rejection requires a non-empty comment');
    }

    return await db.transaction(async (tx) => {
      const timesheet = await tx.orm.public.Timesheet.where({ id }).first();
      if (!timesheet) throw new NotFoundException('Timesheet not found');

      const emp = await tx.orm.public.Employee.where({ id: timesheet.employeeId, organizationId: auth.organizationId }).first();
      if (!emp) throw new ForbiddenException('Timesheet does not belong to your organization');

      const isAdmin = auth.roles.includes('ADMIN');
      if (!isAdmin) {
        const team = emp.teamId ? await tx.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first() : null;
        if (!team || team.managerId !== managerId) {
          throw new ForbiddenException('You are not authorized to reject this timesheet');
        }
      }

      if (timesheet.status !== 'SUBMITTED') {
        throw new BadRequestException('Only SUBMITTED timesheets can be rejected');
      }

      const updated = await tx.orm.public.Timesheet.where({ id }).update({ status: 'REJECTED', rejectionComment: comment.trim() });

      await tx.orm.public.TimesheetAudit.create({
        timesheetId: id,
        actorId: auth.employeeId,
        action: 'REJECTED',
        comments: comment.trim()
      });
      
      if (auth.employeeId) {
        await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'TIMESHEET_REJECTED', 'Timesheet', id, {
          comment: comment.trim()
        }, tx);
      }

      if (auth.employeeId && timesheet.employeeId !== auth.employeeId) {
        await this.notificationsService.createNotification({
          recipientId: timesheet.employeeId,
          type: 'TIMESHEET_REJECTED',
          title: 'Timesheet Rejected',
          message: `Your timesheet for ${timesheet.startDate} to ${timesheet.endDate} was rejected. Reason: ${comment.trim()}`,
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: timesheet.id,
        }, tx);
      }

      return updated;
    });
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
