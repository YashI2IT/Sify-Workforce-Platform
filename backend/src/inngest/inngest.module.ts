import { Module } from '@nestjs/common';
import { InngestController } from './inngest.controller.js';
import { TasksModule } from '../tasks/tasks.module.js';

@Module({
  imports: [TasksModule],
  controllers: [InngestController],
})
export class InngestModule {}
