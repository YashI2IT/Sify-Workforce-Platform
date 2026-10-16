import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { getUtcMonday } from '../common/date.utils.js';

@Injectable()
export class TimesheetSubmissionsService {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private getWeekBounds(dateStr: string): { weekStart: string; weekEnd: string } {
    const monday = getUtcMonday(dateStr);
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    return { weekStart: this.fmtDate(monday), weekEnd: this.fmtDate(sunday) };
  }

  /** Ensure the caller is authorized to review the employee's submission */
  private async assertManagerAccess(employeeId: string, auth: AuthenticatedContext) {
    if (employeeId === auth.employeeId) {
      throw new ForbiddenException('You cannot review your own timesheet submission');
    }
    const emp = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new NotFoundException('Employee not found');

    if (auth.roles.includes('ADMIN')) return;

    if (emp.role === 'ADMIN') {
      throw new ForbiddenException('Managers cannot review an administrator\'s timesheet submission');
    }

    const allTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId }).all();
    const allManagerIds = new Set((allTeams || []).map((t: any) => t.managerId).filter(Boolean));
    if (emp.role === 'MANAGER' || allManagerIds.has(emp.id)) {
      throw new ForbiddenException('Managers cannot review another manager\'s timesheet submission');
    }

    if (!emp.teamId) throw new ForbiddenException('You are not authorised to review this submission');
    const team = await db.orm.public.Team.where({ id: emp.teamId, organizationId: auth.organizationId }).first();
    if (!team || team.managerId !== auth.employeeId) {
      throw new ForbiddenException('You are not authorised to review this submission');
    }
  }

  async resolveSubmissionApprovers(emp: any, auth: AuthenticatedContext, txOrDb: any = db): Promise<any[]> {
    const orgId = emp.organizationId;
    const isSubmitterAdmin = emp.role === 'ADMIN' || (auth?.employeeId === emp.id && auth?.roles?.includes('ADMIN'));

    if (isSubmitterAdmin) {
      const otherAdmins = await txOrDb.orm.public.Employee
        .where({ organizationId: orgId, role: 'ADMIN', isActive: true })
        .all();
      return (otherAdmins || []).filter((a: any) => a.id !== emp.id);
    }

    const teamQuery = txOrDb.orm.public.Team.where({ organizationId: orgId });
    const allTeams = typeof teamQuery?.all === 'function' ? await teamQuery.all() : [];
    const allManagerIds = new Set((allTeams || []).map((t: any) => t.managerId).filter(Boolean));
    const isSubmitterManager =
      emp.role === 'MANAGER' ||
      (auth?.employeeId === emp.id && auth?.roles?.includes('MANAGER')) ||
      allManagerIds.has(emp.id);

    if (isSubmitterManager) {
      const admins = await txOrDb.orm.public.Employee
        .where({ organizationId: orgId, role: 'ADMIN', isActive: true })
        .all();
      return (admins || []).filter((a: any) => a.id !== emp.id);
    }

    if (!emp.teamId) {
      return [];
    }

    const team = await txOrDb.orm.public.Team
      .where({ id: emp.teamId, organizationId: orgId })
      .first();

    if (!team || !team.managerId || team.managerId === emp.id) {
      return [];
    }

    const teamManager = await txOrDb.orm.public.Employee
      .where({ id: team.managerId, organizationId: orgId, isActive: true })
      .first();

    if (!teamManager) {
      return [];
    }

    return [{ ...teamManager, id: team.managerId }];
  }

  private validateApproversOrThrow(approvers: any[], emp: any, auth: AuthenticatedContext, allTeams: any[] = []) {
    if (approvers && approvers.length > 0) return;

    const isSubmitterAdmin = emp.role === 'ADMIN' || (auth?.employeeId === emp.id && auth?.roles?.includes('ADMIN'));
    if (isSubmitterAdmin) {
      throw new BadRequestException('No other active administrator exists in your organization to approve your timesheet. An additional administrator must be configured before this timesheet can be submitted.');
    }

    const allManagerIds = new Set((allTeams || []).map((t: any) => t.managerId).filter(Boolean));
    const isSubmitterManager =
      emp.role === 'MANAGER' ||
      (auth?.employeeId === emp.id && auth?.roles?.includes('MANAGER')) ||
      allManagerIds.has(emp.id);

    if (isSubmitterManager) {
      throw new BadRequestException('No active administrator found in your organization to approve your timesheet. Please contact your organization owner to designate an administrator.');
    }

    if (!emp.teamId) {
      throw new BadRequestException('You are not assigned to a team. Please contact your administrator to assign you to a team with an active manager.');
    }

    throw new BadRequestException('Your team does not have an active manager assigned to review timesheets. Please contact your administrator.');
  }

  // ─── Employee: Get or Create weekly Timesheet container ──────────────────

  private async getOrCreateTimesheetId(employeeId: string, dateStr: string, orgId: string): Promise<string> {
    const { weekStart } = this.getWeekBounds(dateStr);
    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: orgId }).first();
    const timeZone = settings?.timeZone || 'UTC';
    const plainDate = (globalThis as any).Temporal.PlainDate.from(weekStart);
    const monday = plainDate.toZonedDateTime({ timeZone, plainTime: '00:00:00' }).toInstant();
    const sundayDate = plainDate.add({ days: 6 });
    const sunday = sundayDate.toZonedDateTime({ timeZone, plainTime: '23:59:59.999' }).toInstant();

    let ts = await db.orm.public.Timesheet.where({ employeeId, startDate: monday }).first();
    if (!ts) {
      try {
        ts = await db.orm.public.Timesheet.create({ employeeId, startDate: monday, endDate: sunday, status: 'DRAFT' });
      } catch {
        ts = await db.orm.public.Timesheet.where({ employeeId, startDate: monday }).first();
      }
    }
    if (!ts) throw new Error('Failed to create weekly timesheet container');
    return ts.id;
  }

  // ─── Employee: Submit Today ───────────────────────────────────────────────

  async submitToday(date: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;

    const emp = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new NotFoundException('Employee not found');

    const allTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId }).all();
    const approvers = await this.resolveSubmissionApprovers(emp, auth, db);
    this.validateApproversOrThrow(approvers, emp, auth, allTeams || []);

    // Find all DRAFT entries for the given date
    const timesheetId = await this.getOrCreateTimesheetId(employeeId, date, auth.organizationId);
    const entries = await db.orm.public.TimeEntry.where({ employeeId, date, timesheetId })
      .where((e: any) => e.approvalStatus.eq('DRAFT'))
      .all();

    if (entries.length === 0) {
      throw new BadRequestException(`No editable time entries found for ${date}. All may already be submitted or approved.`);
    }

    const submission = await db.transaction(async (tx) => {
      // Create the submission record
      const sub = await tx.orm.public.TimesheetSubmission.create({
        timesheetId,
        employeeId,
        submissionType: 'DAILY',
        submittedDate: date,
        weekStart: this.getWeekBounds(date).weekStart,
        weekEnd: this.getWeekBounds(date).weekEnd,
        status: 'SUBMITTED',
      });

      // Link entries
      await Promise.all(
        entries.map(async (entry: any) => {
          await tx.orm.public.TimeEntry.where({ id: entry.id }).update({
            approvalStatus: 'SUBMITTED',
            submissionId: sub.id,
          });
          await tx.orm.public.TimesheetSubmissionEntry.create({
            submissionId: sub.id,
            timeEntryId: entry.id,
          });
        }),
      );

      // Audit
      await tx.orm.public.TimesheetSubmissionAudit.create({
        submissionId: sub.id,
        actorId: employeeId,
        action: 'SUBMITTED',
      });

      // UPDATE the actual Timesheet status so it shows up in Pending Approvals
      await tx.orm.public.Timesheet.where({ id: timesheetId }).update({
        status: 'SUBMITTED',
        rejectionComment: null
      });

      await this.auditLogsService.logEvent(auth.organizationId, employeeId, 'SUBMISSION_CREATED', 'TimesheetSubmission', sub.id, { type: 'DAILY', date }, tx);

      // In-app notification to resolved approvers
      for (const approver of approvers) {
        await this.notificationsService.createNotification({
          recipientId: approver.id,
          type: 'TIMESHEET_SUBMITTED',
          title: 'Time Entry Submitted',
          message: `${emp.name} submitted time entries for ${date} (${entries.length} entries, ${entries.reduce((s: number, e: any) => s + Number(e.hours), 0)}h).`,
          relatedEntityType: 'TIMESHEET_SUBMISSION',
          relatedEntityId: sub.id,
        }, tx);
      }

      return sub;
    });

    return { ...submission, entryCount: entries.length };
  }

  // ─── Employee: Submit Week ────────────────────────────────────────────────

  async submitWeek(weekDate: string, auth: AuthenticatedContext) {
    const employeeId = auth.employeeId;
    const { weekStart, weekEnd } = this.getWeekBounds(weekDate);

    const emp = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!emp) throw new NotFoundException('Employee not found');

    const allTeams = await db.orm.public.Team.where({ organizationId: auth.organizationId }).all();
    const approvers = await this.resolveSubmissionApprovers(emp, auth, db);
    this.validateApproversOrThrow(approvers, emp, auth, allTeams || []);

    const timesheetId = await this.getOrCreateTimesheetId(employeeId, weekDate, auth.organizationId);

    // All DRAFT entries in this week's timesheet
    const entries = await db.orm.public.TimeEntry.where({ employeeId, timesheetId })
      .where((e: any) => e.approvalStatus.eq('DRAFT'))
      .all();

    if (entries.length === 0) {
      throw new BadRequestException('No unsubmitted time entries found for this week. All may already be submitted or approved.');
    }

    const submission = await db.transaction(async (tx) => {
      const totalHours = entries.reduce((s: number, e: any) => s + Number(e.hours), 0);

      const sub = await tx.orm.public.TimesheetSubmission.create({
        timesheetId,
        employeeId,
        submissionType: 'WEEKLY',
        weekStart,
        weekEnd,
        status: 'SUBMITTED',
      });

      await Promise.all(
        entries.map(async (entry: any) => {
          await tx.orm.public.TimeEntry.where({ id: entry.id }).update({
            approvalStatus: 'SUBMITTED',
            submissionId: sub.id,
          });
          await tx.orm.public.TimesheetSubmissionEntry.create({
            submissionId: sub.id,
            timeEntryId: entry.id,
          });
        }),
      );

      await tx.orm.public.TimesheetSubmissionAudit.create({
        submissionId: sub.id,
        actorId: employeeId,
        action: 'SUBMITTED',
      });

      // UPDATE the actual Timesheet status so it shows up in Pending Approvals
      await tx.orm.public.Timesheet.where({ id: timesheetId }).update({
        status: 'SUBMITTED',
        rejectionComment: null
      });

      await this.auditLogsService.logEvent(auth.organizationId, employeeId, 'SUBMISSION_CREATED', 'TimesheetSubmission', sub.id, { type: 'WEEKLY', weekStart, weekEnd, totalHours }, tx);

      for (const approver of approvers) {
        await this.notificationsService.createNotification({
          recipientId: approver.id,
          type: 'TIMESHEET_SUBMITTED',
          title: 'Weekly Time Sheet Submitted',
          message: `${emp.name} submitted their weekly time entries for ${weekStart} – ${weekEnd} (${entries.length} entries, ${totalHours}h).`,
          relatedEntityType: 'TIMESHEET_SUBMISSION',
          relatedEntityId: sub.id,
        }, tx);
      }

      return sub;
    });

    return { ...submission, entryCount: entries.length };
  }

  // ─── Manager: List pending submissions ────────────────────────────────────

  async findPendingSubmissions(auth: AuthenticatedContext) {
    let employeeIds: string[] = [];

    if (auth.roles.includes('ADMIN')) {
      const allTeams = await db.orm.public.Team
        .where({ organizationId: auth.organizationId })
        .all();
      const managedTeamIds = (allTeams || [])
        .filter((t: any) => t.managerId === auth.employeeId)
        .map((t: any) => t.id);
      const allManagerIds = new Set((allTeams || []).map((t: any) => t.managerId).filter(Boolean));

      const emps = await db.orm.public.Employee
        .where({ organizationId: auth.organizationId, isActive: true })
        .all();

      const reviewable = (emps || []).filter((e: any) => {
        if (e.id === auth.employeeId) return false;
        if (e.role === 'ADMIN') return true;
        if (e.role === 'MANAGER' || allManagerIds.has(e.id)) return true;
        if (e.teamId && managedTeamIds.includes(e.teamId)) return true;
        return false;
      });
      employeeIds = reviewable.map((e: any) => e.id);
    } else {
      const managedTeams = await db.orm.public.Team
        .where({ managerId: auth.employeeId, organizationId: auth.organizationId })
        .all();
      const teamIds = (managedTeams || []).map((t: any) => t.id);
      if (teamIds.length === 0) return [];

      const members = await db.orm.public.Employee
        .where({ organizationId: auth.organizationId, isActive: true })
        .where((e: any) => e.teamId.in(teamIds))
        .all();

      const allTeams = await db.orm.public.Team
        .where({ organizationId: auth.organizationId })
        .all();
      const allManagerIds = new Set((allTeams || []).map((t: any) => t.managerId).filter(Boolean));

      const reviewable = (members || []).filter((e: any) => {
        if (e.id === auth.employeeId) return false;
        if (e.role === 'ADMIN') return false;
        if (e.role === 'MANAGER' || allManagerIds.has(e.id)) return false;
        return true;
      });
      employeeIds = reviewable.map((e: any) => e.id);
    }

    if (employeeIds.length === 0) return [];

    const submissions = await db.orm.public.TimesheetSubmission
      .where({ status: 'SUBMITTED' })
      .where((s: any) => s.employeeId.in(employeeIds))
      .orderBy((s: any) => s.submittedAt.desc())
      .all();

    // Enrich with employee info and entry count
    const enriched = await Promise.all(
      submissions.map(async (sub: any) => {
        const emp = await db.orm.public.Employee.where({ id: sub.employeeId }).first();
        const entryLinks = await db.orm.public.TimesheetSubmissionEntry.where({ submissionId: sub.id }).all();
        const entryIds = entryLinks.map((l: any) => l.timeEntryId);
        const entries = entryIds.length > 0
          ? await db.orm.public.TimeEntry.where((e: any) => e.id.in(entryIds)).all()
          : [];
        const totalHours = entries.reduce((s: number, e: any) => s + Number(e.hours), 0);
        return {
          ...sub,
          employee: { id: emp?.id, name: emp?.name, email: emp?.email },
          entryCount: entries.length,
          totalHours,
          entries,
        };
      }),
    );

    return enriched;
  }

  // ─── Manager: Get single submission detail ────────────────────────────────

  async findOneSubmission(submissionId: string, auth: AuthenticatedContext) {
    const sub = await db.orm.public.TimesheetSubmission.where({ id: submissionId }).first();
    if (!sub) throw new NotFoundException('Submission not found');

    if (sub.employeeId !== auth.employeeId) {
      await this.assertManagerAccess(sub.employeeId, auth);
    }

    const entryLinks = await db.orm.public.TimesheetSubmissionEntry.where({ submissionId }).all();
    const entryIds = entryLinks.map((l: any) => l.timeEntryId);
    const entries = entryIds.length > 0
      ? await db.orm.public.TimeEntry.where((e: any) => e.id.in(entryIds)).all()
      : [];
    const audits = await db.orm.public.TimesheetSubmissionAudit.where({ submissionId })
      .orderBy((a: any) => a.timestamp.asc())
      .all();
    const emp = await db.orm.public.Employee.where({ id: sub.employeeId }).first();

    return { ...sub, employee: emp, entries, audits };
  }

  // ─── Manager: Approve submission ─────────────────────────────────────────

  async approve(submissionId: string, auth: AuthenticatedContext) {
    const sub = await db.orm.public.TimesheetSubmission.where({ id: submissionId }).first();
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.status !== 'SUBMITTED') throw new BadRequestException('Only SUBMITTED submissions can be approved');

    await this.assertManagerAccess(sub.employeeId, auth);

    const updated = await db.transaction(async (tx) => {
      const updatedSub = await tx.orm.public.TimesheetSubmission.where({ id: submissionId }).update({
        status: 'APPROVED',
        reviewedAt: (globalThis as any).Temporal.Now.instant(),
        reviewedBy: auth.employeeId,
      });

      // Mark linked entries as APPROVED
      const links = await tx.orm.public.TimesheetSubmissionEntry.where({ submissionId }).all();
      await Promise.all(
        links.map((l: any) => tx.orm.public.TimeEntry.where({ id: l.timeEntryId }).update({ approvalStatus: 'APPROVED' })),
      );

      await tx.orm.public.TimesheetSubmissionAudit.create({
        submissionId,
        actorId: auth.employeeId,
        action: 'APPROVED',
      });

      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'SUBMISSION_APPROVED', 'TimesheetSubmission', submissionId, undefined, tx);

      const emp = await tx.orm.public.Employee.where({ id: sub.employeeId }).first();
      if (emp) {
        await this.notificationsService.createNotification({
          recipientId: sub.employeeId,
          type: 'TIMESHEET_APPROVED',
          title: 'Time Entries Approved',
          message: `Your time entries (${sub.submissionType === 'DAILY' ? sub.submittedDate : `${sub.weekStart} – ${sub.weekEnd}`}) have been approved.`,
          relatedEntityType: 'TIMESHEET_SUBMISSION',
          relatedEntityId: submissionId,
        }, tx);
      }

      return updatedSub;
    });

    return updated;
  }

  // ─── Manager: Reject submission ───────────────────────────────────────────

  async reject(submissionId: string, comment: string, auth: AuthenticatedContext) {
    if (!comment || comment.trim() === '') {
      throw new BadRequestException('Rejection remark is mandatory');
    }

    const sub = await db.orm.public.TimesheetSubmission.where({ id: submissionId }).first();
    if (!sub) throw new NotFoundException('Submission not found');
    if (sub.status !== 'SUBMITTED') throw new BadRequestException('Only SUBMITTED submissions can be rejected');

    await this.assertManagerAccess(sub.employeeId, auth);

    const updated = await db.transaction(async (tx) => {
      const updatedSub = await tx.orm.public.TimesheetSubmission.where({ id: submissionId }).update({
        status: 'REJECTED',
        rejectionComment: comment.trim(),
        reviewedAt: (globalThis as any).Temporal.Now.instant(),
        reviewedBy: auth.employeeId,
      });

      // Mark linked entries as REJECTED → employee can edit them again
      const links = await tx.orm.public.TimesheetSubmissionEntry.where({ submissionId }).all();
      await Promise.all(
        links.map((l: any) =>
          tx.orm.public.TimeEntry.where({ id: l.timeEntryId }).update({ approvalStatus: 'REJECTED', submissionId: null }),
        ),
      );

      await tx.orm.public.TimesheetSubmissionAudit.create({
        submissionId,
        actorId: auth.employeeId,
        action: 'REJECTED',
        comments: comment.trim(),
      });

      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'SUBMISSION_REJECTED', 'TimesheetSubmission', submissionId, { comment: comment.trim() }, tx);

      const emp = await tx.orm.public.Employee.where({ id: sub.employeeId }).first();
      if (emp) {
        await this.notificationsService.createNotification({
          recipientId: sub.employeeId,
          type: 'TIMESHEET_REJECTED',
          title: 'Time Entries Rejected',
          message: `Your time entries (${sub.submissionType === 'DAILY' ? sub.submittedDate : `${sub.weekStart} – ${sub.weekEnd}`}) were rejected. Remark: ${comment.trim()}`,
          relatedEntityType: 'TIMESHEET_SUBMISSION',
          relatedEntityId: submissionId,
        }, tx);
      }

      return updatedSub;
    });

    return updated;
  }

  // ─── Employee: Get own submissions ───────────────────────────────────────

  async findMySubmissions(auth: AuthenticatedContext) {
    const subs = await db.orm.public.TimesheetSubmission
      .where({ employeeId: auth.employeeId })
      .orderBy((s: any) => s.submittedAt.desc())
      .all();

    return Promise.all(
      subs.map(async (sub: any) => {
        const links = await db.orm.public.TimesheetSubmissionEntry.where({ submissionId: sub.id }).all();
        return { ...sub, entryCount: links.length };
      }),
    );
  }

  // ─── Weekly Reminder: identify unsubmitted entries ───────────────────────

  async sendWeeklyReminders(weekStart: string, weekEnd: string) {
    // Find all time entries that are DRAFT for the target week
    // We group by employee and send one email/notification per employee
    const entries = await db.orm.public.TimeEntry.where({ approvalStatus: 'DRAFT' })
      .where((e: any) => e.date.gte(weekStart))
      .where((e: any) => e.date.lte(weekEnd))
      .all();

    if (entries.length === 0) return;

    // Group by employee
    const byEmployee = new Map<string, any[]>();
    for (const entry of entries) {
      const bucket = byEmployee.get(entry.employeeId) ?? [];
      bucket.push(entry);
      byEmployee.set(entry.employeeId, bucket);
    }

    for (const [empId, empEntries] of byEmployee) {
      const emp = await db.orm.public.Employee.where({ id: empId }).first();
      if (!emp || !emp.isActive) continue;

      const totalHours = empEntries.reduce((s: number, e: any) => s + Number(e.hours), 0);

      // Check if reminder already sent (look for a notification of this type for this week)
      const existingNotif = await db.orm.public.Notification
        .where({ recipientId: empId, type: 'TIMESHEET_REMINDER' })
        .where((n: any) => n.message.like(`%${weekStart}%`))
        .first();

      if (existingNotif) continue; // Dedup: don't send duplicate

      await this.notificationsService.createNotification({
        recipientId: empId,
        type: 'TIMESHEET_REMINDER',
        title: 'Timesheet Pending Submission',
        message: `You have ${totalHours}h logged for ${weekStart} – ${weekEnd} that haven't been submitted for approval yet.`,
        relatedEntityType: 'TIMESHEET',
        relatedEntityId: empEntries[0]?.timesheetId,
      });
    }
  }
}
