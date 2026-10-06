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

@Injectable()
export class NotificationsService {
  constructor(private readonly mailService: MailService) {}

  async getMyNotifications(auth: AuthenticatedContext) {
    return db.orm.public.Notification.where({
      recipientId: auth.employeeId,
    })
      .orderBy((m: any) => m.createdAt.desc())
      .all();
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
    // 1. Resolve preference (defaults to true)
    const pref = await db.orm.public.UserPreference.where({ employeeId: dto.recipientId }).first();
    const emailEnabled = pref?.emailNotifications ?? true;
    
    if (!emailEnabled) {
      return; // Do not send email
    }

    // 2. Resolve employee details
    const employee = await db.orm.public.Employee.where({ id: dto.recipientId }).first();
    if (!employee || !employee.email) {
      return;
    }

    const name = employee.name ? employee.name.trim() : 'Team Member';
    
    // 3. Dispatch through MailService
    await this.mailService.sendNotificationEmail({
      email: employee.email,
      name,
      title: dto.title,
      message: dto.message,
      relatedEntityId: dto.relatedEntityId,
    });
  }
}
