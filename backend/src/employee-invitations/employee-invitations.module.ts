import { Module } from '@nestjs/common';
import { EmployeeInvitationsService } from './employee-invitations.service.js';
import { EmployeeInvitationsController } from './employee-invitations.controller.js';

import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [MailModule],
  providers: [EmployeeInvitationsService],
  controllers: [EmployeeInvitationsController]
})
export class EmployeeInvitationsModule {}
