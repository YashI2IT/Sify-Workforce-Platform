import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import crypto from 'crypto';
import { MailService } from '../mail/mail.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class EmployeeInvitationsService {
  constructor(
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService
  ) {}
  async create(createInvitationDto: CreateInvitationDto, reqOrganizationId: string, reqEmployeeId: string) {
    const { email, name, role, teamId, username, password } = createInvitationDto;

    // Verify organization
    const organization = await db.orm.public.Organization.where({ id: reqOrganizationId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: reqOrganizationId }).first();
    const finalRole = role || settings?.defaultEmployeeRole || 'EMPLOYEE';

    // Verify team
    let team = null;
    if (teamId) {
      team = await db.orm.public.Team.where({ id: teamId, organizationId: reqOrganizationId }).first();
      if (!team) {
        throw new NotFoundException('Team not found in this organization');
      }
    }

    // Check if an active employee already exists with this email
    const existingEmployee = await db.orm.public.Employee.where({ email }).first();
    if (existingEmployee) {
      throw new ConflictException('An employee with this email already exists in the system');
    }

    // Check if a pending invitation already exists with this email
    const pendingInvitation = await db.orm.public.EmployeeInvitation.where({ email, status: 'PENDING' }).first();
    if (pendingInvitation) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Connect directly to UMS backend to create real user record
    if (username && password) {
      const umsBase = process.env.UMS_BASE_URL || 'https://apidev.sifymodernization.digital/user-mgt/api';
      const appId = process.env.UMS_APP_ID || 'Project-Management';

      try {
        const nameParts = (name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || username;
        const lastName = nameParts.slice(1).join(' ') || '';

        const umsRes = await fetch(`${umsBase}/user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-app-id': appId,
          },
          body: JSON.stringify({
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: password,
            firstName,
            lastName,
          }),
        });

        if (!umsRes.ok) {
          const errData: any = await umsRes.json().catch(() => null);
          const errMsg = errData?.message || errData?.error || `UMS user creation failed (${umsRes.status})`;
          if (umsRes.status === 409 || (typeof errMsg === 'string' && (errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('conflict')))) {
            throw new ConflictException(errMsg || 'A user with this username or email already exists in UMS.');
          }
          throw new BadRequestException(errMsg);
        }
      } catch (err: any) {
        if (err instanceof ConflictException || err instanceof BadRequestException) {
          throw err;
        }
        throw new BadRequestException(err?.message || 'Failed to communicate with UMS to create user record.');
      }
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 7 days expiry
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 7);
    const expiresAt = (globalThis as any).Temporal.Instant.from(expiresDate.toISOString());

    const invitation = await db.orm.public.EmployeeInvitation.create({
      organizationId: reqOrganizationId,
      email,
      name,
      role: finalRole,
      teamId,
      invitedBy: reqEmployeeId,
      tokenHash,
      expiresAt,
      status: 'PENDING',
    });

    try {
      if (username && password) {
        await this.mailService.sendInvitationCredentialsEmail({
          email,
          name,
          username,
          password,
          orgName: organization.name,
          role: finalRole,
          teamName: team ? team.name : null,
        });
      } else {
        await this.mailService.sendInvitationEmail(
          email,
          name,
          organization.name,
          finalRole,
          team ? team.name : null,
          token
        );
      }
    } catch (error) {
      // Delete the invitation if email fails to keep state clean
      await db.orm.public.EmployeeInvitation.where({ id: invitation.id }).delete();
      throw error;
    }

    if (reqEmployeeId) {
      await this.auditLogsService.logEvent(reqOrganizationId, reqEmployeeId, 'INVITATION_CREATED', 'EmployeeInvitation', invitation.id, {
        invitedEmail: email
      });
    }

    return invitation;
  }

  async findAllPending(organizationId: string) {
    return await db.orm.public.EmployeeInvitation.where({ organizationId, status: 'PENDING' }).all();
  }

  async findPendingForUser(email: string) {
    if (!email) return [];
    const invitations = await db.orm.public.EmployeeInvitation.where({ email, status: 'PENDING' }).all();
    const nowEpoch = Date.now();

    const activeInvitations = [];
    for (const inv of invitations) {
      const expiresEpoch = typeof inv.expiresAt === 'object' && inv.expiresAt.epochMilliseconds
        ? Number(inv.expiresAt.epochMilliseconds)
        : new Date(inv.expiresAt as any).getTime();

      if (nowEpoch > expiresEpoch) {
        await db.orm.public.EmployeeInvitation.where({ id: inv.id }).update({ status: 'EXPIRED' }).catch(() => {});
        continue;
      }

      const org = await db.orm.public.Organization.where({ id: inv.organizationId }).first();
      const inviter = await db.orm.public.Employee.where({ id: inv.invitedBy }).first();
      let teamName = null;
      if (inv.teamId) {
        const team = await db.orm.public.Team.where({ id: inv.teamId }).first();
        teamName = team?.name || null;
      }

      activeInvitations.push({
        id: inv.id,
        email: inv.email,
        name: inv.name,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        organizationId: inv.organizationId,
        organizationName: org?.name || 'Unknown Organization',
        organizationType: org?.organizationType || 'TECHNOLOGY',
        inviterName: inviter?.name || 'Administrator',
        teamName,
      });
    }

    return activeInvitations;
  }

  async acceptById(id: string, umsUser: any) {
    const invitation = await db.orm.public.EmployeeInvitation.where({ id }).first();
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is already ${invitation.status.toLowerCase()}`);
    }

    const nowEpoch = Date.now();
    const expiresEpoch = typeof invitation.expiresAt === 'object' && invitation.expiresAt.epochMilliseconds
      ? Number(invitation.expiresAt.epochMilliseconds)
      : new Date(invitation.expiresAt as any).getTime();

    if (nowEpoch > expiresEpoch) {
      await db.orm.public.EmployeeInvitation.where({ id: invitation.id }).update({ status: 'EXPIRED' });
      throw new BadRequestException('Invitation has expired');
    }

    const userEmail = umsUser.email?.trim().toLowerCase();
    const inviteEmail = invitation.email?.trim().toLowerCase();
    if (!userEmail || userEmail !== inviteEmail) {
      throw new BadRequestException('INVITATION_EMAIL_MISMATCH');
    }

    const organization = await db.orm.public.Organization.where({ id: invitation.organizationId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingEmployee = await db.orm.public.Employee.where({ email: invitation.email }).first();
    if (existingEmployee) {
      throw new ConflictException('An employee with this email already exists in the system');
    }

    try {
      const result = await db.transaction(async (tx) => {
        const newEmployee = await tx.orm.public.Employee.create({
          organizationId: invitation.organizationId,
          name: invitation.name || umsUser.name || umsUser.username || invitation.email.split('@')[0],
          email: invitation.email,
          role: invitation.role || 'EMPLOYEE',
          teamId: invitation.teamId,
          isActive: true,
          umsUserId: umsUser.id,
          employeeCode: `EMP-${Math.floor(Math.random() * 100000)}`
        });

        await tx.orm.public.EmployeeInvitation.where({ id: invitation.id }).update({
          status: 'ACCEPTED',
          acceptedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()),
        });

        return {
          employee: newEmployee,
          organization,
        };
      });
      
      await this.auditLogsService.logEvent(invitation.organizationId, result.employee.id, 'INVITATION_ACCEPTED', 'EmployeeInvitation', invitation.id);
      
      return result;
    } catch (err: any) {
      if (err instanceof ConflictException || err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      console.error('Error accepting invitation by id:', err);
      throw new BadRequestException('Failed to accept invitation and create employee');
    }
  }

  async declineById(id: string, umsUser: any) {
    const invitation = await db.orm.public.EmployeeInvitation.where({ id }).first();
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is already ${invitation.status.toLowerCase()}`);
    }

    const nowEpoch = Date.now();
    const expiresEpoch = typeof invitation.expiresAt === 'object' && invitation.expiresAt.epochMilliseconds
      ? Number(invitation.expiresAt.epochMilliseconds)
      : new Date(invitation.expiresAt as any).getTime();

    if (nowEpoch > expiresEpoch) {
      await db.orm.public.EmployeeInvitation.where({ id: invitation.id }).update({ status: 'EXPIRED' });
      throw new BadRequestException('Invitation has expired');
    }

    const userEmail = umsUser.email?.trim().toLowerCase();
    const inviteEmail = invitation.email?.trim().toLowerCase();
    if (!userEmail || userEmail !== inviteEmail) {
      throw new BadRequestException('INVITATION_EMAIL_MISMATCH');
    }

    await db.orm.public.EmployeeInvitation.where({ id: invitation.id }).update({
      status: 'DECLINED',
    });

    // Since the user is not an employee in the org yet, we can't easily attribute to an actorId in the org.
    // Let's use the inviter as the actor or just systemic.
    if (invitation.invitedBy) {
      await this.auditLogsService.logEvent(invitation.organizationId, invitation.invitedBy, 'INVITATION_DECLINED', 'EmployeeInvitation', invitation.id);
    }

    return { success: true };
  }

  async getDetails(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await db.orm.public.EmployeeInvitation.where({ tokenHash }).first();

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    const org = await db.orm.public.Organization.where({ id: invitation.organizationId }).first();
    const inviter = await db.orm.public.Employee.where({ id: invitation.invitedBy }).first();
    
    let teamName = null;
    if (invitation.teamId) {
      const team = await db.orm.public.Team.where({ id: invitation.teamId }).first();
      teamName = team?.name || null;
    }

    return {
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: org?.name || 'Unknown Organization',
      inviterName: inviter?.name || 'Unknown User',
      teamName,
    };
  }

  async accept(token: string, umsUser: any) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invitation = await db.orm.public.EmployeeInvitation.where({ tokenHash }).first();
    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid token');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is already ${invitation.status.toLowerCase()}`);
    }

    const nowEpoch = Date.now();
    const expiresEpoch = typeof invitation.expiresAt === 'object' && invitation.expiresAt.epochMilliseconds
      ? Number(invitation.expiresAt.epochMilliseconds)
      : new Date(invitation.expiresAt as any).getTime();

    if (nowEpoch > expiresEpoch) {
      // update status to EXPIRED
      await db.orm.public.EmployeeInvitation.where({ id: invitation.id }).update({ status: 'EXPIRED' });
      throw new BadRequestException('Invitation has expired');
    }

    // Email matching validation
    if (umsUser.email !== invitation.email) {
      throw new BadRequestException('INVITATION_EMAIL_MISMATCH');
    }

    // Check if Employee already exists globally
    const existingEmployee = await db.orm.public.Employee.where({ email: invitation.email }).first();
    if (existingEmployee) {
      throw new ConflictException('An employee with this email already exists in the system');
    }

    // Create Employee and mark invitation ACCEPTED
    try {
      const newEmployee = await db.transaction(async (tx) => {
        const emp = await tx.orm.public.Employee.create({
          organizationId: invitation.organizationId,
          name: invitation.name,
          email: invitation.email,
          role: invitation.role,
          teamId: invitation.teamId,
          isActive: true,
          umsUserId: umsUser.id,
          employeeCode: `EMP-${Math.floor(Math.random() * 100000)}`
        });

        await tx.orm.public.EmployeeInvitation.where({ id: invitation.id }).update({
          status: 'ACCEPTED',
          acceptedAt: (globalThis as any).Temporal.Instant.from(new Date().toISOString()),
        });
        
        return emp;
      });

      await this.auditLogsService.logEvent(invitation.organizationId, newEmployee.id, 'INVITATION_ACCEPTED', 'EmployeeInvitation', invitation.id);

      return newEmployee;
    } catch (err) {
      console.error('Error accepting invitation:', err);
      throw new BadRequestException('Failed to accept invitation and create employee');
    }
  }

  async cancel(id: string, reqOrganizationId: string) {
    const invitation = await db.orm.public.EmployeeInvitation.where({ id, organizationId: reqOrganizationId }).first();
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel invitation that is ${invitation.status.toLowerCase()}`);
    }

    await db.orm.public.EmployeeInvitation.where({ id }).update({ status: 'CANCELLED' });

    if (invitation.invitedBy) {
      // In a real scenario we'd pass actorId. Here we'll fallback to invitedBy or systemic.
      await this.auditLogsService.logEvent(reqOrganizationId, invitation.invitedBy, 'INVITATION_REVOKED', 'EmployeeInvitation', id);
    }

    return { success: true };
  }

  async resend(id: string, reqOrganizationId: string) {
    const invitation = await db.orm.public.EmployeeInvitation.where({ id, organizationId: reqOrganizationId }).first();
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Cannot resend accepted invitation');
    }

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 7 days expiry
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 7);
    const expiresAt = (globalThis as any).Temporal.Instant.from(expiresDate.toISOString());

    const updatedInvitation = await db.orm.public.EmployeeInvitation.where({ id }).update({
      tokenHash,
      expiresAt,
      status: 'PENDING',
    });

    const organization = await db.orm.public.Organization.where({ id: reqOrganizationId }).first();
    let team = null;
    if (invitation.teamId) {
      team = await db.orm.public.Team.where({ id: invitation.teamId }).first();
    }

    await this.mailService.sendInvitationEmail(
      invitation.email,
      invitation.name,
      organization!.name,
      invitation.role,
      team ? team.name : null,
      token
    );
    
    if (invitation.invitedBy) {
      await this.auditLogsService.logEvent(reqOrganizationId, invitation.invitedBy, 'INVITATION_RESENT', 'EmployeeInvitation', id);
    }

    return updatedInvitation;
  }
}
