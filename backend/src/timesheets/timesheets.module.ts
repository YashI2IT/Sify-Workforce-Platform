import { Module } from '@nestjs/common';
import { TimesheetsController } from './timesheets.controller.js';
import { TimesheetsService } from './timesheets.service.js';

@Module({
  controllers: [TimesheetsController],
  providers: [TimesheetsService],
  exports: [TimesheetsService]
})
export class TimesheetsModule {}
