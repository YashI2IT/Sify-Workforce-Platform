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
import { ReportsModule } from './reports/reports.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { DevBypassGuard } from './auth/dev-bypass.guard.js';
import { UmsAuthGuard } from './auth/ums-auth.guard.js';
import { DevController } from './dev/dev.controller.js';

/**
 * AUTHENTICATION GUARD SELECTION
 *
 * NODE_ENV=development | test  → DevBypassGuard (x-dev-* headers, local DB validation)
 * NODE_ENV=production          → UmsAuthGuard   (UMS validate-token → Employee email lookup)
 * NODE_ENV=anything else       → default-deny   (no guard registered = all requests rejected)
 *
 * CONFIRMED UMS INTEGRATION (2026-09-16):
 *   UMS: https://apidev.sifymodernization.digital/user-mgt/api
 *   AppId: Project-Management
 *   Keycloak issuer: http://1.6.37.35/keycloak/realms/Project-Management
 *   Token validation: POST /user/validate-token
 *   User→Employee: UMS user.email → Employee.email
 */
const useTestAuth = process.env.USE_TEST_AUTH === 'true';

const authGuardProvider = useTestAuth
  ? [{ provide: APP_GUARD, useClass: DevBypassGuard }]
  : [{ provide: APP_GUARD, useClass: UmsAuthGuard }];

const devControllers = useTestAuth ? [DevController] : [];

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
    ReportsModule,
    OrganizationsModule,
  ],
  controllers: [AppController, ...devControllers],
  providers: [
    AppService,
    ...authGuardProvider,
  ],
})
export class AppModule {}