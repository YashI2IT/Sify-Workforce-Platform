import { Controller, Post, Get, Patch, Delete, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TimeEntriesService } from './time-entries.service.js';
import { createTimeEntrySchema } from './dto/create-time-entry.dto.js';
import { updateTimeEntrySchema } from './dto/update-time-entry.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { parsePagination } from '../common/pagination.dto.js';

@ApiTags('Time Entries')
@Controller()
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) { }

  @Post('time-entries')
  @ApiOperation({ summary: 'Create a new time entry' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', format: 'uuid' },
        taskId: { type: 'string', format: 'uuid' },
        activityId: { type: 'string', format: 'uuid' },
        date: { type: 'string', example: '2026-09-10' },
        hours: { type: 'number', example: 8 },
        remarks: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Time entry created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid relationship' })
  @ApiResponse({ status: 404, description: 'Referenced entity not found' })
  async create(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    const result = createTimeEntrySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: result.error.issues });
    }
    return this.timeEntriesService.create(result.data, auth);
  }

  @Get('employees/:employeeId/time-entries')
  @ApiOperation({ summary: 'List an employee\'s time entries' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Array of time entries' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findAllByEmployee(
    @Param('employeeId') employeeId: string,
    @GetAuthContext() auth: AuthenticatedContext,
    @Query() query: any
  ) {
    const { page, limit } = parsePagination(query);
    return this.timeEntriesService.findAllByEmployee(employeeId, auth, page, limit);
  }

  @Get('time-entries/:id')
  @ApiOperation({ summary: 'Get a time entry by ID' })
  @ApiParam({ name: 'id', description: 'Time entry UUID' })
  @ApiResponse({ status: 200, description: 'Time entry record' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.timeEntriesService.findOne(id, auth);
  }

  @Patch('time-entries/:id')
  @ApiOperation({ summary: 'Update a time entry' })
  @ApiParam({ name: 'id', description: 'Time entry UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', format: 'uuid' },
        taskId: { type: 'string', format: 'uuid' },
        activityId: { type: 'string', format: 'uuid' },
        date: { type: 'string', example: '2026-09-10' },
        hours: { type: 'number', example: 8 },
        remarks: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Time entry updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  async update(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    const result = updateTimeEntrySchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: result.error.issues });
    }
    return this.timeEntriesService.update(id, result.data, auth);
  }

  @Delete('time-entries/:id')
  @ApiOperation({ summary: 'Delete a time entry' })
  @ApiParam({ name: 'id', description: 'Time entry UUID' })
  @ApiResponse({ status: 200, description: 'Time entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  async remove(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.timeEntriesService.remove(id, auth);
  }
}
