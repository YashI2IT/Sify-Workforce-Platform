import { Module } from '@nestjs/common';
import { TimesheetsController } from './timesheets.controller.js';
import { TimesheetsService } from './timesheets.service.js';
import { WorkingTimesModule } from '../working-times/working-times.module.js';

@Module({
  imports: [WorkingTimesModule],
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService]
})
export class TimesheetsModule {}
