import { Controller, Get, Post, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service.js';
import { createTaskSchema, updateTaskSchema } from './dto/create-task.dto.js';

@ApiTags('Tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List all active tasks for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Array of active task records' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAllByProject(@Param('projectId') projectId: string) {
    return this.tasksService.findAllByProject(projectId);
  }

  @Post('projects/:projectId/tasks')
  @ApiOperation({ summary: 'Create a new task under a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'status'],
      properties: {
        name: { type: 'string', example: 'Design Database Schema' },
        description: { type: 'string', nullable: true, example: 'Create ER diagrams' },
        status: { type: 'string', example: 'TODO' },
        isActive: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 400, description: 'Validation failed or project inactive' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Duplicate task name in project' })
  async create(@Param('projectId') projectId: string, @Body() body: any) {
    try {
      const validatedData = createTaskSchema.parse(body);
      return await this.tasksService.create(projectId, validatedData);
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

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task record' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update an existing task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Updated Task Name' },
        description: { type: 'string', nullable: true, example: 'Updated description' },
        status: { type: 'string', example: 'IN_PROGRESS' },
        isActive: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'Duplicate task name in project' })
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const validatedData = updateTaskSchema.parse(body);
      return await this.tasksService.update(id, validatedData);
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
