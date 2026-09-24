import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTeamDto, UpdateTeamDto } from './dto/create-team.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class TeamsService {
  constructor(private auditLogsService: AuditLogsService) {}

  async findAll(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    const organizationId = auth.organizationId;
    const isManagerOnly = !auth.roles.includes('ADMIN') && auth.roles.includes('MANAGER');

    const query = isManagerOnly
      ? { organizationId, managerId: auth.employeeId }
      : { organizationId };

    const teams = await db.orm.public.Team.where(query)
      .orderBy(m => m.createdAt.desc())
      .limit(limit)
      .offset(offset)
      .all();

    const allTeams = await db.orm.public.Team.where(query).all();
    const total = allTeams.length;

    // Resolve member counts for each team
    const allEmps = await db.orm.public.Employee.where({ organizationId, isActive: true }).select('id', 'teamId').all();
    const memberCounts = new Map<string, number>();
    for (const emp of allEmps) {
      if (emp.teamId) {
        memberCounts.set(emp.teamId, (memberCounts.get(emp.teamId) || 0) + 1);
      }
    }

    const data = teams.map(t => ({
      ...t,
      memberCount: memberCounts.get(t.id) || 0
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const team = await db.orm.public.Team.where({ id, organizationId: auth.organizationId }).first();
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const isManagerOnly = !auth.roles.includes('ADMIN') && auth.roles.includes('MANAGER');
    if (isManagerOnly && team.managerId !== auth.employeeId) {
      throw new ForbiddenException('You do not have access to this team');
    }

    const members = await db.orm.public.Employee.where({ teamId: team.id, organizationId: auth.organizationId, isActive: true }).all();
    return {
      ...team,
      memberCount: members.length
    };
  }

  async create(createTeamDto: CreateTeamDto, reqOrganizationId: string, actorId?: string) {
    const { name, managerId } = createTeamDto;

    const scopedOrgId = reqOrganizationId;

    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: scopedOrgId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check unique team name within the organization
    const existingName = await db.orm.public.Team.where({ organizationId: scopedOrgId, name }).first();
    if (existingName) {
      throw new ConflictException('Team with this name already exists in the organization');
    }

    // Check manager validity if provided
    if (managerId) {
      const manager = await db.orm.public.Employee.where({ id: managerId }).first();
      if (!manager) {
        throw new NotFoundException('Manager not found');
      }
      if (!manager.isActive) {
        throw new BadRequestException('Manager must be an active employee');
      }
      if (manager.organizationId !== scopedOrgId) {
        throw new BadRequestException('Manager must belong to the same organization as the team');
      }
      if (manager.role !== 'MANAGER') {
        throw new BadRequestException('Assigned employee must have the MANAGER role');
      }
    }

    const team = await db.orm.public.Team.create({
      ...createTeamDto,
      organizationId: scopedOrgId,
    });

    if (actorId) {
      await this.auditLogsService.logEvent(scopedOrgId, actorId, 'TEAM_CREATED', 'Team', team.id);
      if (managerId) {
        await this.auditLogsService.logEvent(scopedOrgId, actorId, 'TEAM_MANAGER_ASSIGNED', 'Team', team.id);
      }
    }

    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, reqOrganizationId: string, actorId?: string) {
    const team = await db.orm.public.Team.where({ id, organizationId: reqOrganizationId }).first();
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const { name, managerId } = updateTeamDto;

    // Check unique name if it is being changed
    if (name && name !== team.name) {
      const existingName = await db.orm.public.Team.where({
        organizationId: team.organizationId,
        name,
      }).first();
      if (existingName) {
        throw new ConflictException('Team with this name already exists in the organization');
      }
    }

    // Check manager validity if provided
    if (managerId !== undefined) {
      if (managerId !== null) {
        const manager = await db.orm.public.Employee.where({ id: managerId }).first();
        if (!manager) {
          throw new NotFoundException('Manager not found');
        }
        if (!manager.isActive) {
          throw new BadRequestException('Manager must be an active employee');
        }
        if (manager.organizationId !== team.organizationId) {
          throw new BadRequestException('Manager must belong to the same organization as the team');
        }
        if (manager.role !== 'MANAGER') {
          throw new BadRequestException('Assigned employee must have the MANAGER role');
        }
      }
    }

    const updated = await db.orm.public.Team.where({ id }).update(updateTeamDto);

    if (actorId) {
      await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'TEAM_UPDATED', 'Team', id, {
        updatedFields: Object.keys(updateTeamDto)
      });
      
      if (updateTeamDto.managerId !== undefined && updateTeamDto.managerId !== team.managerId) {
        if (updateTeamDto.managerId === null) {
          await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'TEAM_MANAGER_REMOVED', 'Team', id);
        } else {
          await this.auditLogsService.logEvent(reqOrganizationId, actorId, 'TEAM_MANAGER_ASSIGNED', 'Team', id);
        }
      }
    }

    return updated;
  }
}
