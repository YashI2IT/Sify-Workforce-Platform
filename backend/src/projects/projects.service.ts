import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto.js';

@Injectable()
export class ProjectsService {
  async findAll() {
    return db.orm.public.Project.where({ isActive: true }).all();
  }

  async findOne(id: string) {
    const project = await db.orm.public.Project.where({ id }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(createProjectDto: CreateProjectDto) {
    const { organizationId, name, code, status, isActive } = createProjectDto;

    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check unique project name within the organization
    const existingName = await db.orm.public.Project.where({ organizationId, name }).first();
    if (existingName) {
      throw new ConflictException('Project with this name already exists in the organization');
    }

    // Check unique project code within the organization
    const existingCode = await db.orm.public.Project.where({ organizationId, code }).first();
    if (existingCode) {
      throw new ConflictException('Project with this code already exists in the organization');
    }

    // Explicitly construct the create payload
    const projectData = {
      organizationId,
      name,
      code,
      status,
      isActive: isActive ?? true,
    };

    const project = await db.orm.public.Project.create(projectData);
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    const project = await db.orm.public.Project.where({ id }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const { name, code, status, isActive } = updateProjectDto;

    // Check unique name if it is being changed
    if (name && name !== project.name) {
      const existingName = await db.orm.public.Project.where({
        organizationId: project.organizationId,
        name,
      }).first();
      if (existingName) {
        throw new ConflictException('Project with this name already exists in the organization');
      }
    }

    // Check unique code if it is being changed
    if (code && code !== project.code) {
      const existingCode = await db.orm.public.Project.where({
        organizationId: project.organizationId,
        code,
      }).first();
      if (existingCode) {
        throw new ConflictException('Project with this code already exists in the organization');
      }
    }

    // Explicitly construct the allowed update fields
    const updateData: {
      name?: string;
      code?: string;
      status?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await db.orm.public.Project.where({ id }).update(updateData);
    return updated;
  }
}
