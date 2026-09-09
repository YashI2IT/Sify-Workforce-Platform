import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateTeamDto, UpdateTeamDto } from './dto/create-team.dto.js';

@Injectable()
export class TeamsService {
  async findAll() {
    return db.orm.public.Team.all();
  }

  async findOne(id: string) {
    const team = await db.orm.public.Team.where({ id }).first();
    if (!team) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  async create(createTeamDto: CreateTeamDto) {
    const { organizationId, name, managerId } = createTeamDto;

    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check unique team name within the organization
    const existingName = await db.orm.public.Team.where({ organizationId, name }).first();
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
      if (manager.organizationId !== organizationId) {
        throw new BadRequestException('Manager must belong to the same organization as the team');
      }
    }

    const team = await db.orm.public.Team.create(createTeamDto);
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    const team = await db.orm.public.Team.where({ id }).first();
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
      }
    }

    const updated = await db.orm.public.Team.where({ id }).update(updateTeamDto);
    return updated;
  }
}
