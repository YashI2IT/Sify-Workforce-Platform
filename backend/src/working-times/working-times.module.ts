import { Module } from '@nestjs/common';
import { WorkingTimesService } from './working-times.service.js';
import { WorkingTimesController } from './working-times.controller.js';

@Module({
  providers: [WorkingTimesService],
  controllers: [WorkingTimesController],
  exports: [WorkingTimesService],
})
export class WorkingTimesModule {}
