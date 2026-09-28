import { Controller, Get, Post, Patch, Delete, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { createProjectSchema, updateProjectSchema } from './dto/create-project.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { parsePagination } from '../common/pagination.dto.js';
import { Roles } from '../auth/roles.decorator.js';

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
    return this.projectsService.findAll(auth, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID within organization' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project record' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.findOne(id, auth);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Get factual project health indicators' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project health data' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getHealth(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.getProjectHealth(id, auth);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'code', 'status'],
      properties: {
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
      return await this.projectsService.create(validatedData, auth);
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
  @Roles('ADMIN')
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
      return await this.projectsService.update(id, validatedData, auth.organizationId, auth.employeeId);
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

  // --- Project Requirements ---

  @Get(':id/requirements')
  @ApiOperation({ summary: 'List project requirements' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async findRequirements(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.findRequirements(id, auth);
  }

  @Post(':id/requirements')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create project requirement' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' }, isMandatory: { type: 'boolean' }, status: { type: 'string' } } } })
  async createRequirement(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    if (!body.title) throw new BadRequestException('Validation failed: title is required');
    return this.projectsService.createRequirement(id, body, auth);
  }

  // --- Milestones ---

  @Get(':id/milestones')
  @ApiOperation({ summary: 'List project milestones' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async findMilestones(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.findMilestones(id, auth);
  }

  @Get(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Get specific milestone' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone UUID' })
  async getMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return this.projectsService.getMilestone(id, milestoneId, auth);
  }

  @Post(':id/milestones')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a project milestone' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiBody({ schema: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, description: { type: 'string' }, targetDate: { type: 'string', format: 'date-time' }, status: { type: 'string' } } } })
  async createMilestone(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    if (!body.name) throw new BadRequestException('Validation failed: name is required');
    return this.projectsService.createMilestone(id, body, auth);
  }

  @Patch(':id/milestones/:milestoneId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a project milestone' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone UUID' })
  @ApiBody({ schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, targetDate: { type: 'string', format: 'date-time' }, status: { type: 'string' } } } })
  async updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() body: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return this.projectsService.updateMilestone(id, milestoneId, body, auth);
  }

  @Delete(':id/milestones/:milestoneId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a project milestone' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone UUID' })
  async deleteMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return this.projectsService.deactivateMilestone(id, milestoneId, auth);
  }
}
