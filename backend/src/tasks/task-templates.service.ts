import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import type { CreateTaskTemplateDto, UpdateTaskTemplateDto } from './dto/task-template.dto.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

@Injectable()
export class TaskTemplatesService {
  async findAllByProject(projectId: string, auth: AuthenticatedContext) {
    // Project and org verification
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');

    const templates = await db.orm.public.TaskTemplate.where({ projectId })
      .orderBy(m => m.createdAt.desc())
      .all();

    return templates;
  }

  async create(projectId: string, dto: CreateTaskTemplateDto, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');

    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot create a template under an inactive or completed/on-hold project');
    }

    // Check unique template name within the project
    const existingName = await db.orm.public.TaskTemplate.where({ projectId, name: dto.name }).first();
    if (existingName) {
      throw new ConflictException('Template with this name already exists in the project');
    }

    if (dto.assigneeId) {
      const assignment = await db.orm.public.EmployeeProject.where({ employeeId: dto.assigneeId, projectId }).first();
      if (!assignment) {
        throw new BadRequestException('Assignee is not a member of this project');
      }
    }

    const templateData: any = {
      projectId,
      name: dto.name,
      taskName: dto.taskName,
      description: dto.description ?? null,
      priority: dto.priority ?? 'MEDIUM',
      estimatedHours: dto.estimatedHours ?? null,
      recurrence: dto.recurrence ?? null,
      isActive: dto.isActive ?? true,
      creatorId: auth.employeeId ?? null,
    };

    if (dto.assigneeId !== undefined) templateData.assigneeId = dto.assigneeId;

    return await db.orm.public.TaskTemplate.create(templateData);
  }

  async update(projectId: string, templateId: string, dto: UpdateTaskTemplateDto, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');

    const template = await db.orm.public.TaskTemplate.where({ id: templateId, projectId }).first();
    if (!template) throw new NotFoundException('Template not found');

    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot update a template under an inactive or completed/on-hold project');
    }

    if (dto.name && dto.name !== template.name) {
      const existingName = await db.orm.public.TaskTemplate.where({ projectId, name: dto.name }).first();
      if (existingName) {
        throw new ConflictException('Template with this name already exists in the project');
      }
    }

    if (dto.assigneeId) {
      const assignment = await db.orm.public.EmployeeProject.where({ employeeId: dto.assigneeId, projectId }).first();
      if (!assignment) {
        throw new BadRequestException('Assignee is not a member of this project');
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.taskName !== undefined) updateData.taskName = dto.taskName;
    if (dto.description !== undefined) updateData.description = dto.description ?? null;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.estimatedHours !== undefined) updateData.estimatedHours = dto.estimatedHours ?? null;
    if (dto.assigneeId !== undefined) updateData.assigneeId = dto.assigneeId;
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence ?? null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (Object.keys(updateData).length === 0) return template;

    updateData.updatedAt = new Date();

    const updated = await db.orm.public.TaskTemplate.where({ id: templateId }).update(updateData);
    return updated;
  }

  async remove(projectId: string, templateId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');

    const template = await db.orm.public.TaskTemplate.where({ id: templateId, projectId }).first();
    if (!template) throw new NotFoundException('Template not found');

    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Cannot remove a template under an inactive or completed/on-hold project');
    }

    await db.orm.public.TaskTemplate.where({ id: templateId }).delete();
    return { success: true };
  }
}
