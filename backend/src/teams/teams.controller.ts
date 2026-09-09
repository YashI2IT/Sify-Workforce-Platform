import { Controller, Get, Post, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TeamsService } from './teams.service.js';
import { createTeamSchema, updateTeamSchema } from './dto/create-team.dto.js';

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List all teams' })
  @ApiResponse({ status: 200, description: 'Array of team records' })
  async findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  @ApiParam({ name: 'id', description: 'Team UUID' })
  @ApiResponse({ status: 200, description: 'Team record' })
  @ApiResponse({ status: 404, description: 'Team not found' })
  async findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
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
  async create(@Body() body: any) {
    try {
      const validatedData = createTeamSchema.parse(body);
      return await this.teamsService.create(validatedData);
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
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const validatedData = updateTeamSchema.parse(body);
      return await this.teamsService.update(id, validatedData);
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
