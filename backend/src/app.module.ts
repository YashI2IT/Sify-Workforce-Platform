import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { EmployeesModule } from './employees/employees.module.js';
import { TeamsModule } from './teams/teams.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { TimeEntriesModule } from './time-entries/time-entries.module.js';
import { TimesheetsModule } from './timesheets/timesheets.module.js';
import { DevBypassGuard } from './auth/dev-bypass.guard.js';
import { DevController } from './dev/dev.controller.js';

// DevBypassGuard is registered globally ONLY in development/test environments.
// Default-deny: Disabled in production, when NODE_ENV is missing/undefined, or any unapproved env.
// PENDING: Replace with JwtAuthGuard when Keycloak contract is finalized.
const isDevEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

const devGuardProvider = isDevEnvironment
  ? [{ provide: APP_GUARD, useClass: DevBypassGuard }]
  : [];

const devControllers = isDevEnvironment ? [DevController] : [];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EmployeesModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    ActivitiesModule,
    AssignmentsModule,
    TimeEntriesModule,
    TimesheetsModule,
  ],
  controllers: [AppController, ...devControllers],
  providers: [
    AppService,
    ...devGuardProvider,
  ],
})
export class AppModule {}