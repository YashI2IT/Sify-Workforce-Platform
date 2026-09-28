import { Controller, Get, Post, Patch, Delete, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service.js';
import { createTaskSchema, updateTaskSchema } from './dto/create-task.dto.js';
import { createCommentSchema, updateCommentSchema } from './dto/task-comment.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List all active tasks for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Array of active task records' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findAllByProject(@Param('projectId') projectId: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.tasksService.findAllByProject(projectId, auth);
  }

  @Post('projects/:projectId/tasks')
  // @Roles omitted to allow Admin, Manager, and Employee (Service handles fine-grained RBAC)
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
        priority: { type: 'string', example: 'HIGH' },
        assigneeId: { type: 'string', nullable: true },
        startDate: { type: 'string', format: 'date-time', nullable: true },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        estimatedHours: { type: 'number', nullable: true },
        parentTaskId: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Task created' })
  @ApiResponse({ status: 400, description: 'Validation failed or project inactive' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Duplicate task name in project' })
  async create(@Param('projectId') projectId: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = createTaskSchema.parse(body);
      return await this.tasksService.create(projectId, validatedData, auth);
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
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.tasksService.findOne(id, auth);
  }

  @Patch('tasks/:id')
  // @Roles omitted to allow Admin, Manager, and Employee (Service handles fine-grained RBAC)
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
        priority: { type: 'string' },
        assigneeId: { type: 'string', nullable: true },
        startDate: { type: 'string', format: 'date-time', nullable: true },
        dueDate: { type: 'string', format: 'date-time', nullable: true },
        estimatedHours: { type: 'number', nullable: true },
        parentTaskId: { type: 'string', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Task updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'Duplicate task name in project' })
  async update(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = updateTaskSchema.parse(body);
      return await this.tasksService.update(id, validatedData, auth);
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

  // --- Task Dependencies ---

  @Get('tasks/:id/dependencies')
  @ApiOperation({ summary: 'List task dependencies' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  async findDependencies(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.tasksService.findDependencies(id, auth);
  }

  @Post('tasks/:id/dependencies')
  // @Roles omitted to allow fine-grained service RBAC
  @ApiOperation({ summary: 'Create task dependency' })
  @ApiParam({ name: 'id', description: 'Predecessor Task UUID' })
  @ApiBody({ schema: { type: 'object', required: ['successorId'], properties: { successorId: { type: 'string' } } } })
  async addDependency(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    if (!body.successorId) throw new BadRequestException('Validation failed: successorId is required');
    return this.tasksService.addDependency(id, body.successorId, auth);
  }

  @Delete('tasks/:id/dependencies/:successorId')
  // @Roles omitted to allow fine-grained service RBAC
  @ApiOperation({ summary: 'Delete task dependency' })
  @ApiParam({ name: 'id', description: 'Predecessor Task UUID' })
  @ApiParam({ name: 'successorId', description: 'Successor Task UUID' })
  async deleteDependency(
    @Param('id') id: string,
    @Param('successorId') successorId: string,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return this.tasksService.removeDependency(id, successorId, auth);
  }

  // --- Task Comments ---

  @Get('projects/:projectId/tasks/:taskId/comments')
  @ApiOperation({ summary: 'Get comments for a task' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  async getComments(
    @Param('taskId') taskId: string,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return await this.tasksService.getComments(taskId, auth);
  }

  @Post('projects/:projectId/tasks/:taskId/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiBody({ schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string' } } } })
  async addComment(
    @Param('taskId') taskId: string,
    @Body() body: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    try {
      const validatedData = createCommentSchema.parse(body);
      return await this.tasksService.addComment(taskId, validatedData.comment, auth);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        throw new BadRequestException({ message: 'Validation failed', errors: error.errors });
      }
      throw error;
    }
  }

  @Patch('projects/:projectId/tasks/:taskId/comments/:commentId')
  @ApiOperation({ summary: 'Edit a task comment' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  @ApiBody({ schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string' } } } })
  async editComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() body: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    try {
      const validatedData = updateCommentSchema.parse(body);
      return await this.tasksService.editComment(taskId, commentId, validatedData.comment, auth);
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        throw new BadRequestException({ message: 'Validation failed', errors: error.errors });
      }
      throw error;
    }
  }

  @Delete('projects/:projectId/tasks/:taskId/comments/:commentId')
  @ApiOperation({ summary: 'Delete a task comment' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'taskId', description: 'Task UUID' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  async deleteComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    return await this.tasksService.deleteComment(taskId, commentId, auth);
  }
}
