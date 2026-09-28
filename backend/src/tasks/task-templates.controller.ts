import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TaskTemplatesService } from './task-templates.service.js';
import { createTaskTemplateSchema, updateTaskTemplateSchema } from './dto/task-template.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Task Templates')
@Controller('projects/:projectId/task-templates')
export class TaskTemplatesController {
  constructor(private readonly templatesService: TaskTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all task templates for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async findAllByProject(@Param('projectId') projectId: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.templatesService.findAllByProject(projectId, auth);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new task template under a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async create(@Param('projectId') projectId: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = createTaskTemplateSchema.parse(body);
      return await this.templatesService.create(projectId, validatedData, auth);
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

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a task template' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() body: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    try {
      const validatedData = updateTaskTemplateSchema.parse(body);
      return await this.templatesService.update(projectId, id, validatedData, auth);
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

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete a task template' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return this.templatesService.remove(projectId, id, auth);
  }
}
