import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { DefaultAiProvider } from './ai.provider.js';
import { ReportsModule } from '../reports/reports.module.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
  imports: [ReportsModule, ProjectsModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'AI_PROVIDER',
      useClass: DefaultAiProvider,
    },
  ],
})
export class AiModule {}
