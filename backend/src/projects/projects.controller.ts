import { Controller, Get, Post, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { createProjectSchema, updateProjectSchema } from './dto/create-project.dto.js';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active projects' })
  @ApiResponse({ status: 200, description: 'Array of active project records' })
  async findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project record' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
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
  async create(@Body() body: any) {
    try {
      const validatedData = createProjectSchema.parse(body);
      return await this.projectsService.create(validatedData);
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
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const validatedData = updateProjectSchema.parse(body);
      return await this.projectsService.update(id, validatedData);
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
