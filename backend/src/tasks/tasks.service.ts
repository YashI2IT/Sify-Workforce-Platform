import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto.js';

@Injectable()
export class TasksService {
  async findAllByProject(projectId: string) {
    const project = await db.orm.public.Project.where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return db.orm.public.Task.where({ projectId, isActive: true }).all();
  }

  async findOne(id: string) {
    const task = await db.orm.public.Task.where({ id }).first();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(projectId: string, createTaskDto: CreateTaskDto) {
    const { name, description, status, isActive } = createTaskDto;

    // Verify project exists
    const project = await db.orm.public.Project.where({ id: projectId }).first();
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

    const taskData = {
      projectId,
      name,
      description: description ?? null,
      status,
      isActive: isActive ?? true,
    };

    const task = await db.orm.public.Task.create(taskData);
    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await db.orm.public.Task.where({ id }).first();
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const { name, description, status, isActive } = updateTaskDto;

    // Check unique name if it is being changed
    if (name && name !== task.name) {
      const existingName = await db.orm.public.Task.where({
        projectId: task.projectId,
        name,
      }).first();
      if (existingName) {
        throw new ConflictException('Task with this name already exists in the project');
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      status?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.orm.public.Task.where({ id }).update(updateData);
    return updated;
  }
}
