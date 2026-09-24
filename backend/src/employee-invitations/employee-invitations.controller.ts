import { Controller, Post, Get, Delete, Body, Param, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { EmployeeInvitationsService } from './employee-invitations.service.js';
import { createInvitationSchema } from './dto/create-invitation.dto.js';
import { Roles } from '../auth/roles.decorator.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { UmsOnboardingGuard } from '../auth/ums-onboarding.guard.js';

@ApiTags('Employee Invitations')
@Controller('employee-invitations')
export class EmployeeInvitationsController {
  constructor(private readonly employeeInvitationsService: EmployeeInvitationsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new employee invitation' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        teamId: { type: 'string', nullable: true },
        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
      },
    },
  })
  async create(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = createInvitationSchema.parse(body);
      return await this.employeeInvitationsService.create(validatedData, auth.organizationId, auth.employeeId!);
    } catch (error) {
      if (error && (error as any).name === 'ZodError') {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: (error as any).errors,
        });
      }
      throw error;
    }
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List pending invitations' })
  async findAll(@GetAuthContext() auth: AuthenticatedContext) {
    const data = await this.employeeInvitationsService.findAllPending(auth.organizationId);
    return { data };
  }

  @Get('my-invitations')
  @UseGuards(UmsOnboardingGuard)
  @ApiOperation({ summary: 'List pending invitations for the current user' })
  async getMyInvitations(@Req() req: any) {
    const email = req.umsUser?.email || req.user?.email;
    const data = await this.employeeInvitationsService.findPendingForUser(email);
    return { data };
  }

  @Post(':id/accept-invite')
  @UseGuards(UmsOnboardingGuard)
  @ApiOperation({ summary: 'Accept a pending invitation by ID (Onboarding)' })
  async acceptInviteById(@Param('id') id: string, @Req() req: any) {
    const umsUser = req.umsUser || req.user;
    if (!umsUser) {
      throw new BadRequestException('User must be authenticated to accept invitation');
    }
    const data = await this.employeeInvitationsService.acceptById(id, umsUser);
    return { data };
  }

  @Post(':id/decline-invite')
  @UseGuards(UmsOnboardingGuard)
  @ApiOperation({ summary: 'Decline a pending invitation by ID (Onboarding)' })
  async declineInviteById(@Param('id') id: string, @Req() req: any) {
    const umsUser = req.umsUser || req.user;
    if (!umsUser) {
      throw new BadRequestException('User must be authenticated to decline invitation');
    }
    const data = await this.employeeInvitationsService.declineById(id, umsUser);
    return { data };
  }

  @Get(':token/details')
  @ApiOperation({ summary: 'Get public details of an invitation by token' })
  async getDetails(@Param('token') token: string) {
    const data = await this.employeeInvitationsService.getDetails(token);
    return { data };
  }

  // NOTE: This endpoint requires UMS auth, but the user might NOT be an employee yet.
  // The global UmsAuthGuard requires UMS authentication, but since this route doesn't have @Roles(),
  // it bypasses the RolesGuard organization/employee check, allowing any authenticated UMS user to call it.
  @Post(':token/accept')
  @ApiOperation({ summary: 'Accept an invitation' })
  async accept(@Param('token') token: string, @Req() req: any) {
    if (!req.umsUser) {
      throw new BadRequestException('User must be authenticated with UMS to accept invitation');
    }
    const data = await this.employeeInvitationsService.accept(token, req.umsUser);
    return { data };
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  async cancel(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return await this.employeeInvitationsService.cancel(id, auth.organizationId);
  }

  @Post(':id/resend')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resend a pending or expired invitation' })
  async resend(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return await this.employeeInvitationsService.resend(id, auth.organizationId);
  }
}
