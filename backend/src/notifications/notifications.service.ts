import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

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

    if (externalTx) {
      return await runInTx(externalTx);
    } else {
      return await db.transaction(runInTx);
    }
  }
}
