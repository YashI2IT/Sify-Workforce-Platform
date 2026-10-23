import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { MailService } from '../mail/mail.service.js';

export interface CreateNotificationDto {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function computeNotificationDestination(notification: {
  type?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}): string | null {
  const { type, relatedEntityType, relatedEntityId } = notification;

  if (
    relatedEntityType === 'TASK' ||
    type === 'TASK_ASSIGNED' ||
    type === 'TASK_STATUS_CHANGED' ||
    type === 'DEPENDENCY_ADDED' ||
    type === 'DEPENDENCY_REMOVED' ||
    type === 'COMMENT_ADDED' ||
    type === 'COMMENT_MENTION' ||
    type?.startsWith('TASK_') ||
    type?.startsWith('COMMENT_') ||
    type?.startsWith('DEPENDENCY_')
  ) {
    if (relatedEntityId) {
      const parts = relatedEntityId.split(':');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return `/projects/${parts[0]}?taskId=${parts[1]}`;
      }
      return `/projects/${relatedEntityId}`;
    }
    return '/projects';
  }

  if (
    relatedEntityType === 'PROJECT' ||
    type === 'PROJECT_ASSIGNED' ||
    type === 'PROJECT_UNASSIGNED' ||
    type === 'PROJECT_UPDATE' ||
    type?.startsWith('PROJECT_')
  ) {
    if (relatedEntityId) {
      return `/projects/${relatedEntityId}`;
    }
    return '/projects';
  }

  if (relatedEntityType === 'TIMESHEET_SUBMISSION') {
    if (type === 'TIMESHEET_SUBMITTED' || type === 'TIMESHEET_RESUBMITTED') {
      return relatedEntityId ? `/submission-approvals?submissionId=${relatedEntityId}` : '/submission-approvals';
    }
    if (type === 'TIMESHEET_REJECTED') {
      return '/time-entries';
    }
    return '/timesheets';
  }

  if (relatedEntityType === 'TIMESHEET' || type?.includes('TIMESHEET')) {
    if (type === 'TIMESHEET_SUBMITTED' || type === 'TIMESHEET_RESUBMITTED') {
      return relatedEntityId ? `/approvals/timesheets/${relatedEntityId}` : '/approvals';
    }
    return relatedEntityId ? `/timesheets/${relatedEntityId}` : '/timesheets';
  }

  if (relatedEntityType === 'EMPLOYEE' || type?.startsWith('EMPLOYEE_')) {
    return '/employees';
  }

  if (relatedEntityType === 'TEAM' || type?.startsWith('TEAM_')) {
    return '/teams';
  }

  if (relatedEntityType === 'ORGANIZATION' || type?.startsWith('ORGANIZATION_')) {
    return '/organization';
  }

  return null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly mailService: MailService) {}

  async getMyNotifications(auth: AuthenticatedContext) {
    const list = await db.orm.public.Notification.where({
      recipientId: auth.employeeId,
    })
      .orderBy((m: any) => m.createdAt.desc())
      .all();

    return list.map((item: any) => ({
      ...item,
      destination: computeNotificationDestination(item),
    }));
  }

  async markAsRead(notificationId: string, auth: AuthenticatedContext) {
    const notification = await db.orm.public.Notification.where({
      id: notificationId,
      recipientId: auth.employeeId,
    }).first();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      await db.orm.public.Notification.where({ id: notificationId }).update({
        isRead: true,
        readAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()),
      });
    }

    return { success: true };
  }

  async markAllAsRead(auth: AuthenticatedContext) {
    await db.orm.public.Notification.where({
      recipientId: auth.employeeId,
      isRead: false,
    }).update({
      isRead: true,
      readAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()),
    });

    return { success: true };
  }

  // Internal method to be called by other services
  async createNotification(dto: CreateNotificationDto, externalTx?: any) {
    let isDuplicate = false;

    const runInTx = async (tx: any) => {
      if (dto.relatedEntityType && dto.relatedEntityId) {
        const existing = await tx.orm.public.Notification.where({
          recipientId: dto.recipientId,
          type: dto.type,
          relatedEntityType: dto.relatedEntityType,
          relatedEntityId: dto.relatedEntityId,
          isRead: false,
        }).first();

        if (existing) {
          // Prevent duplicate unread notifications for the same entity and type
          isDuplicate = true;
          return existing;
        }
      }

      return tx.orm.public.Notification.create({
        recipientId: dto.recipientId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        relatedEntityType: dto.relatedEntityType,
        relatedEntityId: dto.relatedEntityId,
        isRead: false,
      });
    };

    let notification;
    if (externalTx) {
      notification = await runInTx(externalTx);
    } else {
      notification = await db.transaction(runInTx);
    }

    if (!isDuplicate) {
      // Fire-and-forget email dispatch
      this.dispatchEmailIfEnabled(dto).catch(err => {
        console.error('[NotificationsService] Background email dispatch failed:', err);
      });
    }

    return notification;
  }

  private async dispatchEmailIfEnabled(dto: CreateNotificationDto) {
    // 1. Resolve employee details
    const employee = await db.orm.public.Employee.where({ id: dto.recipientId }).first();
    if (!employee || !employee.email) {
      return;
    }

    // 2. Check Organization Settings policy first
    if (employee.organizationId) {
      const orgSettings = await db.orm.public.OrganizationSettings.where({ organizationId: employee.organizationId }).first();
      if (orgSettings && orgSettings.emailNotifications === false) {
        return; // Organization-wide policy has disabled email notifications
      }
    }

    // 3. Resolve user preference (defaults to true)
    const pref = await db.orm.public.UserPreference.where({ employeeId: dto.recipientId }).first();
    const emailEnabled = pref?.emailNotifications ?? true;
    
    if (!emailEnabled) {
      return; // Do not send email
    }

    const name = employee.name ? employee.name.trim() : 'Team Member';
    const destination = computeNotificationDestination(dto);
    
    // 3. Dispatch through MailService
    await this.mailService.sendNotificationEmail({
      email: employee.email,
      name,
      title: dto.title,
      message: dto.message,
      relatedEntityId: dto.relatedEntityId,
      targetPath: destination || undefined,
    });
  }
}
