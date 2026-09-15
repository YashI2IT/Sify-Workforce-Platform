import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateActivityDto, UpdateActivityDto } from './dto/create-activity.dto.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

@Injectable()
export class ActivitiesService {
  async findAllByProject(projectId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId }).first();
    if (!project || project.organizationId !== auth.organizationId) {
      throw new NotFoundException('Project not found');
    }

    return db.orm.public.Activity.where({ projectId, isActive: true }).all();
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const activity = await db.orm.public.Activity.where({ id }).first();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    const project = await db.orm.public.Project.where({ id: activity.projectId }).first();
    if (!project || project.organizationId !== auth.organizationId) {
      throw new NotFoundException('Activity not found');
    }
    return activity;
  }

  async create(projectId: string, createActivityDto: CreateActivityDto, auth: AuthenticatedContext) {
    const { name, description, isActive } = createActivityDto;

    // Verify project exists
    const project = await db.orm.public.Project.where({ id: projectId }).first();
    if (!project || project.organizationId !== auth.organizationId) {
      throw new NotFoundException('Project not found');
    }

    // Reject creation under an inactive Project
    if (!project.isActive) {
      throw new BadRequestException('Cannot create an activity under an inactive project');
    }

    // Check unique activity name within the project
    const existingName = await db.orm.public.Activity.where({ projectId, name }).first();
    if (existingName) {
      throw new ConflictException('Activity with this name already exists in the project');
    }

    const activityData = {
      projectId,
      name,
      description: description ?? null,
      isActive: isActive ?? true,
    };

    const activity = await db.orm.public.Activity.create(activityData);
    return activity;
  }

  async update(id: string, updateActivityDto: UpdateActivityDto, auth: AuthenticatedContext) {
    const activity = await db.orm.public.Activity.where({ id }).first();
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    const project = await db.orm.public.Project.where({ id: activity.projectId }).first();
    if (!project || project.organizationId !== auth.organizationId) {
      throw new NotFoundException('Activity not found');
    }

    const { name, description, isActive } = updateActivityDto;

    // Check unique name if it is being changed
    if (name && name !== activity.name) {
      const existingName = await db.orm.public.Activity.where({
        projectId: activity.projectId,
        name,
      }).first();
      if (existingName) {
        throw new ConflictException('Activity with this name already exists in the project');
      }
    }

    const updateData: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.orm.public.Activity.where({ id }).update(updateData);
    return updated;
  }
}
