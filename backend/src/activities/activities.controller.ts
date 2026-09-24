import { Controller, Get, Post, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service.js';
import { createActivitySchema, updateActivitySchema } from './dto/create-activity.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Activities')
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('projects/:projectId/activities')
  @ApiOperation({ summary: 'List all active activities for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Array of active activity records' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAllByProject(@Param('projectId') projectId: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.activitiesService.findAllByProject(projectId, auth);
  }

  @Post('projects/:projectId/activities')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new activity under a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', example: 'Development' },
        description: { type: 'string', nullable: true, example: 'Software development work' },
        isActive: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Activity created' })
  @ApiResponse({ status: 400, description: 'Validation failed or project inactive' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Duplicate activity name in project' })
  async create(@Param('projectId') projectId: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = createActivitySchema.parse(body);
      return await this.activitiesService.create(projectId, validatedData, auth);
    } catch (error: any) {
      if (error && error.name === 'ZodError') {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      throw error;
    }
  }

  @Get('activities/:id')
  @ApiOperation({ summary: 'Get activity by ID' })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Activity record' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.activitiesService.findOne(id, auth);
  }

  @Patch('activities/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an existing activity' })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Activity Name' },
        description: { type: 'string', nullable: true, example: 'Updated description' },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  @ApiResponse({ status: 409, description: 'Duplicate activity name in project' })
  async update(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = updateActivitySchema.parse(body);
      return await this.activitiesService.update(id, validatedData, auth);
    } catch (error: any) {
      if (error && error.name === 'ZodError') {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      throw error;
    }
  }
}
