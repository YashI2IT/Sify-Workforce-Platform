import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TimesheetSubmissionsService } from './timesheet-submissions.service.js';
import { TimesheetSubmissionsController } from './timesheet-submissions.controller.js';
import { TimesheetReminderScheduler } from './timesheet-reminder.scheduler.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), AuditLogsModule, NotificationsModule, MailModule],
  controllers: [TimesheetSubmissionsController],
  providers: [TimesheetSubmissionsService, TimesheetReminderScheduler],
  exports: [TimesheetSubmissionsService],
})
export class TimesheetSubmissionsModule {}
