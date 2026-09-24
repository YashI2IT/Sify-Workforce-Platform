import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

@Injectable()
export class TasksService {
  async findAllByProject(projectId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Project not found');
      }
      const assignment = await db.orm.public.EmployeeProject.where({ projectId, employeeId: auth.employeeId }).first();
      if (!assignment) {
        throw new NotFoundException('Project not found');
      }
    }

    return db.orm.public.Task.where({ projectId, isActive: true }).all();
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const task = await db.orm.public.Task.where({ id }).first();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const project = await db.orm.public.Project.where({ id: task.projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Task not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Task not found');
      }
      const assignment = await db.orm.public.EmployeeProject.where({ projectId: task.projectId, employeeId: auth.employeeId }).first();
      if (!assignment) {
        throw new NotFoundException('Task not found');
      }
    }

    return task;
  }

  async create(projectId: string, createTaskDto: CreateTaskDto, auth: AuthenticatedContext) {
    const { 
      name, description, status, isActive, 
      priority, assigneeId, startDate, dueDate, estimatedHours, parentTaskId
    } = createTaskDto;

    // Verify project exists and belongs to organization
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Reject creation under an inactive Project
    if (!project.isActive) {
      throw new BadRequestException('Cannot create a task under an inactive project');
    }

    // Check unique task name within the project
    const existingName = await db.orm.public.Task.where({ projectId, name }).first();
    if (existingName) {
      throw new ConflictException('Task with this name already exists in the project');
    }

    // Basic date validation
    if (startDate && dueDate && new Date(startDate) > new Date(dueDate)) {
      throw new BadRequestException('startDate must be before or equal to dueDate');
    }

    // Parent task validation
    if (parentTaskId) {
      const parentTask = await db.orm.public.Task.where({ id: parentTaskId, projectId }).first();
      if (!parentTask) {
        throw new BadRequestException('Invalid parent task within this project');
      }
    }

    // Assignee validation
    if (assigneeId) {
      const assignment = await db.orm.public.EmployeeProject.where({ employeeId: assigneeId, projectId }).first();
      if (!assignment) {
        throw new BadRequestException('Assignee is not a member of this project');
      }
    }

    const taskData: any = {
      projectId,
      name,
      description: description ?? null,
      status,
      isActive: isActive ?? true,
      priority: priority ?? 'MEDIUM',
      creatorId: auth.employeeId ?? null,
    };

    if (assigneeId !== undefined) taskData.assigneeId = assigneeId;
    if (startDate !== undefined) taskData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (dueDate !== undefined) taskData.dueDate = dueDate ? (globalThis as any).Temporal.Instant.from(new Date(dueDate).toISOString()) : null;
    if (estimatedHours !== undefined) taskData.estimatedHours = estimatedHours;
    if (parentTaskId !== undefined) taskData.parentTaskId = parentTaskId;

    const task = await db.orm.public.Task.create(taskData);
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, auth: AuthenticatedContext) {
    const task = await db.orm.public.Task.where({ id }).first();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const project = await db.orm.public.Project.where({ id: task.projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Task not found');
    }

    const { 
      name, description, status, isActive,
      priority, assigneeId, startDate, dueDate, estimatedHours, parentTaskId
    } = updateTaskDto;

    // Check unique name if it is being changed
    if (name && name !== task.name) {
      const existingName = await db.orm.public.Task.where({
        projectId: task.projectId,
        name,
      }).first();
      if (existingName && existingName.id !== task.id) {
        throw new ConflictException('Task with this name already exists in the project');
      }
    }

    // Date validation
    const newStartDate = startDate !== undefined ? (startDate ? new Date(startDate) : null) : task.startDate;
    const newDueDate = dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate;
    if (newStartDate && newDueDate && new Date(newStartDate.toString()) > new Date(newDueDate.toString())) {
      throw new BadRequestException('startDate must be before or equal to dueDate');
    }

    // Parent task validation
    if (parentTaskId !== undefined && parentTaskId !== null) {
      if (parentTaskId === task.id) {
         throw new BadRequestException('Task cannot be its own parent');
      }
      const parentTask = await db.orm.public.Task.where({ id: parentTaskId, projectId: task.projectId }).first();
      if (!parentTask) {
        throw new BadRequestException('Invalid parent task within this project');
      }
    }

    // Assignee validation
    if (assigneeId !== undefined && assigneeId !== null) {
      const assignment = await db.orm.public.EmployeeProject.where({ employeeId: assigneeId, projectId: task.projectId }).first();
      if (!assignment) {
        throw new BadRequestException('Assignee is not a member of this project');
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (startDate !== undefined) updateData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? (globalThis as any).Temporal.Instant.from(new Date(dueDate).toISOString()) : null;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (parentTaskId !== undefined) updateData.parentTaskId = parentTaskId;

    const updated = await db.orm.public.Task.where({ id }).update(updateData);
    return updated;
  }

  async addDependency(predecessorId: string, successorId: string, auth: AuthenticatedContext) {
    if (predecessorId === successorId) {
      throw new BadRequestException('Task cannot depend on itself');
    }

    const predecessor = await db.orm.public.Task.where({ id: predecessorId }).first();
    const successor = await db.orm.public.Task.where({ id: successorId }).first();

    if (!predecessor || !successor) {
      throw new NotFoundException('One or both tasks not found');
    }

    if (predecessor.projectId !== successor.projectId) {
      throw new BadRequestException('Cross-project dependencies are not allowed');
    }

    // Security check: ensure user has access to this project
    const project = await db.orm.public.Project.where({ id: predecessor.projectId, organizationId: auth.organizationId }).first();
    if (!project) {
       throw new NotFoundException('Project not found');
    }

    // Check if duplicate
    const existing = await db.orm.public.TaskDependency.where({ predecessorId, successorId }).first();
    if (existing) {
      throw new ConflictException('Dependency already exists');
    }

    return db.orm.public.TaskDependency.create({
      predecessorId,
      successorId,
      type: 'FS'
    });
  }

  async findDependencies(taskId: string, auth: AuthenticatedContext) {
    await this.findOne(taskId, auth); // Access check
    
    const predecessors = await db.orm.public.TaskDependency.where({ successorId: taskId }).all();
    const successors = await db.orm.public.TaskDependency.where({ predecessorId: taskId }).all();

    return { predecessors, successors };
  }

  async removeDependency(taskId: string, successorId: string, auth: AuthenticatedContext) {
    // Security check via finding the task
    await this.findOne(taskId, auth);

    const dependency = await db.orm.public.TaskDependency.where({ predecessorId: taskId, successorId }).first();
    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await db.orm.public.TaskDependency.where({ predecessorId: taskId, successorId }).delete();
    return { success: true };
  }
}
