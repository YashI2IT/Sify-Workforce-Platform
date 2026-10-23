import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';
import { TaskTemplatesService } from './task-templates.service.js';
import { TaskTemplatesController } from './task-templates.controller.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

import { RecurrenceGeneratorService } from './recurrence/recurrence-generator.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [TasksController, TaskTemplatesController],
  providers: [TasksService, TaskTemplatesService, RecurrenceGeneratorService],
  exports: [TasksService, RecurrenceGeneratorService],
})
export class TasksModule {}

