import { Module } from '@nestjs/common';
import { TimesheetsController } from './timesheets.controller.js';
import { TimesheetsService } from './timesheets.service.js';
import { WorkingTimesModule } from '../working-times/working-times.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [WorkingTimesModule, NotificationsModule, MailModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService]
})
export class TimesheetsModule {}
