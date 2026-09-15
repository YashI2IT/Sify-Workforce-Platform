import { Controller, Get, Post, Patch, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { createProjectSchema, updateProjectSchema } from './dto/create-project.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { parsePagination } from '../common/pagination.dto.js';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List active projects in organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated active project records' })
  async findAll(@GetAuthContext() auth: AuthenticatedContext, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.projectsService.findAll(auth.organizationId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID within organization' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project record' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.findOne(id, auth.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId', 'name', 'code', 'status'],
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        name: { type: 'string', example: 'Core Platform Modernization' },
        code: { type: 'string', example: 'PRJ-CORE' },
        status: { type: 'string', example: 'ACTIVE' },
        isActive: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Project created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Duplicate project name or code in organization' })
  async create(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = createProjectSchema.parse(body);
      return await this.projectsService.create(validatedData, auth.organizationId);
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
  @ApiOperation({ summary: 'Update an existing project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Core Platform v2' },
        code: { type: 'string', example: 'PRJ-CORE-V2' },
        status: { type: 'string', example: 'IN_PROGRESS' },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Project updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Duplicate project name or code in organization' })
  async update(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = updateProjectSchema.parse(body);
      return await this.projectsService.update(id, validatedData, auth.organizationId);
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
