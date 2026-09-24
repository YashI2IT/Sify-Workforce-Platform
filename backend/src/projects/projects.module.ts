import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller.js';
import { ProjectRequirementsController } from './project-requirements.controller.js';
import { ProjectsService } from './projects.service.js';

@Module({
  controllers: [ProjectsController, ProjectRequirementsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
