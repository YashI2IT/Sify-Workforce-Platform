import { Module } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service.js';
import { TimeEntriesController } from './time-entries.controller.js';

@Module({
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
})
export class TimeEntriesModule {}
