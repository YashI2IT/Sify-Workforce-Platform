import { Controller, Get, Patch, Post, Body, BadRequestException, ForbiddenException, UseGuards, Req, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { UmsOnboardingGuard } from '../auth/ums-onboarding.guard.js';

export const VALID_ORGANIZATION_TYPES = [
  'TECHNOLOGY',
  'EDUCATION',
  'HEALTHCARE',
  'FINANCE',
  'MANUFACTURING',
  'RETAIL',
  'NGO',
  'GOVERNMENT',
  'OTHER',
] as const;

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(UmsOnboardingGuard)
  @ApiOperation({ summary: 'Create a new main organization (Onboarding ONLY)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'organizationType'],
      properties: {
        name: { type: 'string', example: 'Example Organization' },
        organizationType: { type: 'string', example: 'TECHNOLOGY' },
        description: { type: 'string', example: 'A tech company' },
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Organization and Admin Employee created' })
  @ApiResponse({ status: 409, description: 'Duplicate organization name or user already onboarded' })
  async createOrganization(@Body() body: any, @Req() req: any) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestException('Invalid or missing organization name');
    }
    
    if (!body.organizationType || typeof body.organizationType !== 'string' || !(VALID_ORGANIZATION_TYPES as readonly string[]).includes(body.organizationType)) {
      throw new BadRequestException('Invalid or missing organization type');
    }

    let description: string | undefined = undefined;
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.length > 500) {
        throw new BadRequestException('Description must be a string up to 500 characters');
      }
      description = body.description.trim();
    }

    return this.organizationsService.createOnboardingOrganization(req.umsUser, body.name.trim(), body.organizationType, description);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current authenticated organization' })
  @ApiResponse({ status: 200, description: 'Organization record' })
  async getCurrent(@GetAuthContext() auth: AuthenticatedContext) {
    return this.organizationsService.getCurrentOrganization(auth.organizationId);
  }

  @Get('current/setup-status')
  @ApiOperation({ summary: 'Get checklist metrics for initial organization setup' })
  @ApiResponse({ status: 200, description: 'Setup status metrics' })
  async getSetupStatus(@GetAuthContext() auth: AuthenticatedContext) {
    return this.organizationsService.getSetupStatus(auth.organizationId);
  }

  @Patch('current/setup/complete')
  @ApiOperation({ summary: 'Mark organization setup as complete' })
  @ApiResponse({ status: 200, description: 'Setup completed' })
  async completeSetup(@GetAuthContext() auth: AuthenticatedContext) {
    if (!auth.roles?.includes('ADMIN')) {
      throw new BadRequestException('Only admins can complete setup');
    }
    return this.organizationsService.completeSetup(auth.organizationId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update current organization details' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Acme Corp' },
        organizationType: { type: 'string', example: 'TECHNOLOGY' },
        description: { type: 'string', example: 'Updated desc' },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  @ApiResponse({ status: 403, description: 'Only admins can update organization profile' })
  @ApiResponse({ status: 409, description: 'Duplicate organization name' })
  async updateCurrent(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    if (!auth.roles?.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can update organization profile');
    }

    // Basic validation
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      throw new BadRequestException('Invalid name');
    }
    
    if (body.organizationType !== undefined) {
      if (typeof body.organizationType !== 'string' || !(VALID_ORGANIZATION_TYPES as readonly string[]).includes(body.organizationType)) {
        throw new BadRequestException('Invalid organization type');
      }
    }

    if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 500)) {
      throw new BadRequestException('Description must be a string up to 500 characters');
    }

    return this.organizationsService.updateCurrentOrganization(auth.organizationId, auth.employeeId, {
      name: body.name?.trim(),
      organizationType: body.organizationType,
      description: body.description?.trim(),
    });
  }



  @Get('current/settings')
  @ApiOperation({ summary: 'Get current organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings record' })
  async getSettings(@GetAuthContext() auth: AuthenticatedContext) {
    return this.organizationsService.getSettings(auth.organizationId);
  }

  @Patch('current/settings')
  @ApiOperation({ summary: 'Update current organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings updated' })
  @ApiResponse({ status: 403, description: 'Only admins can update organization settings' })
  async updateSettings(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    if (!auth.roles?.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can update organization settings');
    }
    return this.organizationsService.updateSettings(auth.organizationId, auth.employeeId!, body);
  }
}
