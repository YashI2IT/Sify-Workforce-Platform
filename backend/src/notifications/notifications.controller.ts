import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { UmsAuthGuard } from '../auth/ums-auth.guard.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(UmsAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications' })
  getMyNotifications(@GetAuthContext() auth: AuthenticatedContext) {
    return this.notificationsService.getMyNotifications(auth);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@GetAuthContext() auth: AuthenticatedContext) {
    return this.notificationsService.markAllAsRead(auth);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  markAsRead(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.notificationsService.markAsRead(id, auth);
  }
}
