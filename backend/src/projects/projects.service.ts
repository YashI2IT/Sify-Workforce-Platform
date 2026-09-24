import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateProjectDto, UpdateProjectDto } from './dto/create-project.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class ProjectsService {
  constructor(private auditLogsService: AuditLogsService) {}

  async findAll(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    const organizationId = auth.organizationId;
    const isAdmin = auth.roles && auth.roles.includes('ADMIN');

    if (isAdmin) {
      const projects = await db.orm.public.Project.where({ organizationId, isActive: true })
        .orderBy(m => m.createdAt.desc())
        .limit(limit)
        .offset(offset)
        .all();
        
      const allCount = await db.orm.public.Project.where({ organizationId, isActive: true }).all();
      const total = allCount.length;

      return {
        data: projects,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      };
    }

    // EMPLOYEE / MANAGER: Only projects assigned through EmployeeProject
    if (!auth.employeeId) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const assignments = await db.orm.public.EmployeeProject.where({ employeeId: auth.employeeId }).all();
    if (!assignments || assignments.length === 0) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const assignedProjectIds = assignments.map((a: any) => a.projectId);

    // Fetch matching active projects
    const allMatching = await db.orm.public.Project.where({ organizationId, isActive: true }).all();
    const assignedProjects = allMatching.filter((p: any) => assignedProjectIds.includes(p.id));

    const paginated = assignedProjects.slice(offset, offset + limit);
    const total = assignedProjects.length;

    return {
      data: paginated,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Project not found');
      }
      const assignment = await db.orm.public.EmployeeProject.where({ projectId: id, employeeId: auth.employeeId }).first();
      if (!assignment) {
        throw new NotFoundException('Project not found');
      }
    }

    return project;
  }

  async create(createProjectDto: CreateProjectDto, auth: AuthenticatedContext) {
    const { name, code, status, isActive, description, startDate, endDate } = createProjectDto;
    const scopedOrgId = auth.organizationId;
    
    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: scopedOrgId }).first();
    const requiredRole = settings?.projectCreationPermission || 'ADMIN';
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes(requiredRole)) {
      throw new ForbiddenException(`You must be a ${requiredRole} or ADMIN to create projects`);
    }
    
    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: scopedOrgId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check unique project name within the organization
    const existingName = await db.orm.public.Project.where({ organizationId: scopedOrgId, name }).first();
    if (existingName) {
      throw new ConflictException('Project with this name already exists in the organization');
    }

    // Check unique project code within the organization
    const existingCode = await db.orm.public.Project.where({ organizationId: scopedOrgId, code }).first();
    if (existingCode) {
      throw new ConflictException('Project with this code already exists in the organization');
    }

    const projectData: any = {
      organizationId: scopedOrgId,
      name,
      code,
      status,
      isActive: isActive ?? true,
      description: description ?? null,
    };

    if (startDate !== undefined) projectData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (endDate !== undefined) projectData.endDate = endDate ? (globalThis as any).Temporal.Instant.from(new Date(endDate).toISOString()) : null;

    const project = await db.orm.public.Project.create(projectData);
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(scopedOrgId, auth.employeeId, 'PROJECT_CREATED', 'Project', project.id);
    }
    
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, reqOrganizationId: string, actorId?: string) {
    const project = await db.orm.public.Project.where({ id, organizationId: reqOrganizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const { name, code, status, isActive, description, startDate, endDate } = updateProjectDto;

    if (name && name !== project.name) {
      const existingName = await db.orm.public.Project.where({
        organizationId: project.organizationId,
        name,
      }).first();
      if (existingName) {
        throw new ConflictException('Project with this name already exists in the organization');
      }
    }

    if (code && code !== project.code) {
      const existingCode = await db.orm.public.Project.where({
        organizationId: project.organizationId,
        code,
      }).first();
      if (existingCode) {
        throw new ConflictException('Project with this code already exists in the organization');
      }
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = startDate ? (globalThis as any).Temporal.Instant.from(new Date(startDate).toISOString()) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? (globalThis as any).Temporal.Instant.from(new Date(endDate).toISOString()) : null;

    const updated = await db.orm.public.Project.where({ id }).update(updateData);
    
    if (actorId) {
      await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'PROJECT_UPDATED', 'Project', id, {
        updatedFields: Object.keys(updateProjectDto)
      });
      
      if (updateData.isActive === true && project.isActive === false) {
        await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'PROJECT_ACTIVATED', 'Project', id);
      } else if (updateData.isActive === false && project.isActive === true) {
        await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'PROJECT_DEACTIVATED', 'Project', id);
      }
    }

    return updated;
  }

  // --- Project Requirements ---

  async findRequirements(projectId: string, auth: AuthenticatedContext) {
    // Verify user has access to this project
    await this.findOne(projectId, auth);

    const requirements = await db.orm.public.ProjectRequirement.where({ projectId })
      .orderBy(r => r.createdAt.asc())
      .all();
    return requirements;
  }

  async getRequirement(id: string, auth: AuthenticatedContext) {
    const requirement = await db.orm.public.ProjectRequirement.where({ id }).first();
    if (!requirement) throw new NotFoundException('Project Requirement not found');

    await this.findOne(requirement.projectId, auth);
    return requirement;
  }

  async createRequirement(projectId: string, data: any, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive) throw new ConflictException('Cannot add requirement to inactive project');

    return db.orm.public.ProjectRequirement.create({
      projectId,
      title: data.title,
      description: data.description || null,
      isMandatory: data.isMandatory || false,
      status: data.status || 'ACTIVE'
    });
  }

  async updateRequirement(id: string, data: any, auth: AuthenticatedContext) {
    const requirement = await db.orm.public.ProjectRequirement.where({ id }).first();
    if (!requirement) throw new NotFoundException('Project Requirement not found');

    const project = await db.orm.public.Project.where({ id: requirement.projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found or unauthorized');
    if (!project.isActive) throw new ConflictException('Cannot update requirement of inactive project');

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isMandatory !== undefined) updateData.isMandatory = data.isMandatory;
    if (data.status !== undefined) updateData.status = data.status;

    return db.orm.public.ProjectRequirement.where({ id }).update(updateData);
  }

  // --- Milestones ---

  async createMilestone(projectId: string, data: any, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive) throw new ConflictException('Cannot add milestone to inactive project');

    return db.orm.public.Milestone.create({
      projectId,
      name: data.name,
      description: data.description || null,
      targetDate: data.targetDate ? (globalThis as any).Temporal.Instant.from(new Date(data.targetDate).toISOString()) : null,
      status: data.status || 'PENDING'
    });
  }

  async findMilestones(projectId: string, auth: AuthenticatedContext) {
    await this.findOne(projectId, auth); // Verify access
    return db.orm.public.Milestone.where({ projectId })
      .orderBy(m => m.createdAt.asc())
      .all();
  }

  async getMilestone(projectId: string, milestoneId: string, auth: AuthenticatedContext) {
    await this.findOne(projectId, auth); // Verify access
    const milestone = await db.orm.public.Milestone.where({ id: milestoneId, projectId }).first();
    if (!milestone) throw new NotFoundException('Milestone not found');
    return milestone;
  }

  async updateMilestone(projectId: string, milestoneId: string, data: any, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive) throw new ConflictException('Cannot update milestone of inactive project');

    const milestone = await db.orm.public.Milestone.where({ id: milestoneId, projectId }).first();
    if (!milestone) throw new NotFoundException('Milestone not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.targetDate !== undefined) updateData.targetDate = data.targetDate ? (globalThis as any).Temporal.Instant.from(new Date(data.targetDate).toISOString()) : null;
    if (data.status !== undefined) updateData.status = data.status;

    return db.orm.public.Milestone.where({ id: milestoneId }).update(updateData);
  }

  async deactivateMilestone(projectId: string, milestoneId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isActive) throw new ConflictException('Cannot deactivate milestone of inactive project');

    const milestone = await db.orm.public.Milestone.where({ id: milestoneId, projectId }).first();
    if (!milestone) throw new NotFoundException('Milestone not found');

    // Soft delete / complete (using CANCELLED status as common pattern or deleting)
    // The prompt says "deactivate/delete a milestone". We will delete it to keep it simple, 
    // unless there are tasks attached. If there are tasks, deleting might fail due to FKs depending on DB.
    // Let's implement actual deletion as we don't have isActive on Milestone.
    await db.orm.public.Milestone.where({ id: milestoneId }).delete();
    return { success: true };
  }
}
