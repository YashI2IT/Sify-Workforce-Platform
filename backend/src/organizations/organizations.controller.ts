import { Controller, Get, Patch, Post, Body, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { UmsOnboardingGuard } from '../auth/ums-onboarding.guard.js';

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
      required: ['name', 'code'],
      properties: {
        name: { type: 'string', example: 'Example Organization' },
        code: { type: 'string', example: 'EXAMPLE' },
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Organization and Admin Employee created' })
  @ApiResponse({ status: 409, description: 'Duplicate organization code or user already onboarded' })
  async createOrganization(@Body() body: any, @Req() req: any) {
    if (!body.name || typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestException('Invalid or missing organization name');
    }
    if (!body.code || typeof body.code !== 'string' || body.code.trim() === '') {
      throw new BadRequestException('Invalid or missing organization code');
    }

    return this.organizationsService.createOnboardingOrganization(req.umsUser, body.name.trim(), body.code.trim());
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current authenticated organization' })
  @ApiResponse({ status: 200, description: 'Organization record' })
  async getCurrent(@GetAuthContext() auth: AuthenticatedContext) {
    return this.organizationsService.getCurrentOrganization(auth.organizationId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update current organization details' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Acme Corp' },
        code: { type: 'string', example: 'ACME' },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  @ApiResponse({ status: 409, description: 'Duplicate organization code' })
  async updateCurrent(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    // Basic validation
    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim() === '')) {
      throw new BadRequestException('Invalid name');
    }
    if (body.code !== undefined && (typeof body.code !== 'string' || body.code.trim() === '')) {
      throw new BadRequestException('Invalid code');
    }

    return this.organizationsService.updateCurrentOrganization(auth.organizationId, body);
  }
}
