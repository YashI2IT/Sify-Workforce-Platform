import { Controller, Get, Post, Patch, Param, Body, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TeamsService } from './teams.service.js';
import { createTeamSchema, updateTeamSchema } from './dto/create-team.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { parsePagination } from '../common/pagination.dto.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Teams')
@Controller('teams')
@UseGuards(RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List teams in organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated active team records' })
  async findAll(@GetAuthContext() auth: AuthenticatedContext, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.teamsService.findAll(auth, page, limit);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get team by ID within organization' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team record' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.teamsService.findOne(id, auth);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId', 'name'],
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        name: { type: 'string', example: 'Engineering' },
        managerId: { type: 'string', nullable: true, description: 'Manager Employee UUID' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Team created' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid manager' })
  @ApiResponse({ status: 404, description: 'Organization or manager not found' })
  @ApiResponse({ status: 409, description: 'Duplicate team name' })
  async create(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = createTeamSchema.parse(body);
      return await this.teamsService.create(validatedData, auth.organizationId, auth.employeeId);
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
  @ApiOperation({ summary: 'Update an existing team' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Design' },
        managerId: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Team updated' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid manager' })
  @ApiResponse({ status: 404, description: 'Team or manager not found' })
  @ApiResponse({ status: 409, description: 'Duplicate team name' })
  async update(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = updateTeamSchema.parse(body);
      return await this.teamsService.update(id, validatedData, auth.organizationId, auth.employeeId);
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
