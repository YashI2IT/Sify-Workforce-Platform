import { Injectable, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

function getNowInstant(): any {
  if (typeof (globalThis as any).Temporal?.Now?.instant === 'function') {
    return (globalThis as any).Temporal.Now.instant();
  }
  return new Date();
}

function isAfter(instantA: any, instantB: any): boolean {
  if (!instantA || !instantB) return false;
  try {
    if (typeof (globalThis as any).Temporal?.Instant?.compare === 'function' && typeof instantA?.epochNanoseconds !== 'undefined') {
      return (globalThis as any).Temporal.Instant.compare(instantA, instantB) > 0;
    }
  } catch {
    // fallback
  }
  const timeA = instantA instanceof Date ? instantA.getTime() : new Date(instantA.toString()).getTime();
  const timeB = instantB instanceof Date ? instantB.getTime() : new Date(instantB.toString()).getTime();
  return timeA > timeB;
}

@Injectable()
export class OrganizationsService {
  constructor(private auditLogsService: AuditLogsService) {}

  async createOnboardingOrganization(umsUser: { id: string; email: string; name?: string; username?: string }, orgName: string, orgType: string, description?: string) {
    let existingEmployee = null;
    try {
      existingEmployee = await db.orm.public.Employee.where({ email: umsUser.email }).first();
    } catch (err) {}

    if (existingEmployee) {
      throw new ConflictException('User already has an active Workforce Employee record');
    }

    const normalizedName = orgName.trim().toLowerCase();
    let existingOrg = null;
    try {
      existingOrg = await db.orm.public.Organization.where({ normalizedName }).first();
    } catch (err) {}

    if (existingOrg) {
      throw new ConflictException(`An organization named '${orgName}' already exists.`);
    }

    try {
      const result = await db.transaction(async (tx) => {
        const organization = await tx.orm.public.Organization.create({
          name: orgName,
          normalizedName,
          organizationType: orgType,
          description: description || null,
        });

        const name = umsUser.name || umsUser.username || umsUser.email.split('@')[0];
        const employeeCode = `EMP-${Math.floor(Math.random() * 1000000)}`;

        const employee = await tx.orm.public.Employee.create({
          organizationId: organization.id,
          employeeCode: employeeCode,
          name: name,
          email: umsUser.email,
          isActive: true,
          role: 'ADMIN',
          umsUserId: umsUser.id,
        });

        return {
          data: {
            organization: {
              id: organization.id,
              name: organization.name,
              organizationType: organization.organizationType,
              description: organization.description,
            },
            employee: {
              id: employee.id,
              employeeCode: employee.employeeCode,
              name: employee.name,
              email: employee.email,
            },
            role: 'ADMIN',
          }
        };
      });

      await this.auditLogsService.logEvent(result.data.organization.id, result.data.employee.id, 'ORGANIZATION_CREATED', 'Organization', result.data.organization.id);
      await this.auditLogsService.logEvent(result.data.organization.id, result.data.employee.id, 'EMPLOYEE_CREATED', 'Employee', result.data.employee.id);

      return result;
    } catch (err: any) {
      if (err instanceof ConflictException) throw err;
      if (err.code === 'P2002' || err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique constraint'))) {
        throw new ConflictException('User already has an active Workforce Employee record');
      }
      throw new InternalServerErrorException(`Transaction failed: ${err.message || err.toString()}`);
    }
  }

  async getCurrentOrganization(organizationId: string) {
    const org = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async getSetupStatus(organizationId: string) {
    const org = await db.orm.public.Organization.where({ id: organizationId }).first();
    const employeeCountRes = await db.orm.public.Employee.where({ organizationId }).aggregate((a: any) => ({ count: a.count() })) as { count: number } | undefined;
    const employeeCount = employeeCountRes?.count || 0;

    const teamCountRes = await db.orm.public.Team.where({ organizationId }).aggregate((a: any) => ({ count: a.count() })) as { count: number } | undefined;
    const teamCount = teamCountRes?.count || 0;

    const teams = await db.orm.public.Team.where({ organizationId }).all();
    const hasManagers = teams.some(t => t.managerId != null);

    const employees = await db.orm.public.Employee.where({ organizationId }).all();
    const hasRoles = employees.some(e => e.role !== 'EMPLOYEE' && e.role !== 'ADMIN');

    const isProfileSaved = !!(org && (isAfter(org.updatedAt, org.createdAt) || org.isSetupComplete));

    return {
      data: {
        isProfileSaved,
        hasEmployees: employeeCount > 1,
        hasTeams: teamCount > 0,
        hasRoles,
        hasManagers
      }
    };
  }

  async completeSetup(organizationId: string) {
    const org = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    
    if (org.isSetupComplete) {
      return { success: true };
    }

    await db.orm.public.Organization.where({ id: organizationId }).update({
      isSetupComplete: true,
      updatedAt: getNowInstant(),
    });

    return { success: true };
  }

  async updateCurrentOrganization(organizationId: string, actorId: string, updateData: { name?: string; organizationType?: string; description?: string }) {
    const org = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const data: any = {};
    if (updateData.name !== undefined && updateData.name !== org.name) {
      const normalizedName = updateData.name.trim().toLowerCase();
      if (normalizedName !== org.normalizedName) {
        const existingName = await db.orm.public.Organization.where({ normalizedName }).first();
        if (existingName) {
          throw new ConflictException(`An organization named '${updateData.name}' already exists.`);
        }
      }
      data.name = updateData.name;
      data.normalizedName = normalizedName;
    }

    if (updateData.organizationType !== undefined) data.organizationType = updateData.organizationType;
    if (updateData.description !== undefined) data.description = updateData.description;
    data.updatedAt = getNowInstant();

    const updated = await db.orm.public.Organization.where({ id: organizationId }).update(data);
    
    this.auditLogsService.logEvent(organizationId, actorId, 'ORGANIZATION_UPDATED', 'Organization', organizationId, {
      updatedFields: Object.keys(data).filter(k => k !== 'updatedAt')
    });

    return updated;
  }

  async getAvailableOrganizations() {
    const orgs = await db.orm.public.Organization.orderBy(o => o.name.asc()).all();
    return orgs.map(org => ({
      id: org.id,
      name: org.name,
      organizationType: org.organizationType,
    }));
  }

  async joinOrganization(umsUser: { id: string; email: string; name?: string; username?: string }, orgId: string) {
    let existingEmployee = null;
    try {
      existingEmployee = await db.orm.public.Employee.where({ email: umsUser.email }).first();
    } catch (err) {}

    if (existingEmployee) {
      throw new ConflictException('User already has an active Workforce Employee record');
    }

    const org = await db.orm.public.Organization.where({ id: orgId }).first();
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const name = umsUser.name || umsUser.username || umsUser.email.split('@')[0];
    const employeeCode = `EMP-${Math.floor(Math.random() * 1000000)}`;

    try {
      return await db.transaction(async (tx) => {
        const employee = await tx.orm.public.Employee.create({
          organizationId: org.id,
          employeeCode: employeeCode,
          name: name,
          email: umsUser.email,
          isActive: true,
          role: 'EMPLOYEE',
          umsUserId: umsUser.id,
        });

        return {
          data: {
            organization: {
              id: org.id,
              name: org.name,
              organizationType: org.organizationType,
              description: org.description,
            },
            employee: {
              id: employee.id,
              employeeCode: employee.employeeCode,
              name: employee.name,
              email: employee.email,
            },
            role: 'EMPLOYEE',
          }
        };
      });
    } catch (err: any) {
      if (err.code === 'P2002' || err.code === '23505' || (err.message && err.message.toLowerCase().includes('unique constraint'))) {
        throw new ConflictException('User already has an active Workforce Employee record');
      }
      throw new InternalServerErrorException(`Failed to join organization: ${err.message || err.toString()}`);
    }
  }

  async getSettings(organizationId: string) {
    let settings = await db.orm.public.OrganizationSettings.where({ organizationId }).first();
    if (!settings) {
      settings = await db.orm.public.OrganizationSettings.create({
        organizationId,
      });
    }
    return settings;
  }

  async updateSettings(organizationId: string, payload: any) {
    const settings = await this.getSettings(organizationId);
    
    // Only allow updating supported fields
    const updates: any = {};
    if (payload.weekStartsOn !== undefined) updates.weekStartsOn = payload.weekStartsOn;
    if (payload.timeZone !== undefined) updates.timeZone = payload.timeZone;
    if (payload.defaultEmployeeRole !== undefined) updates.defaultEmployeeRole = payload.defaultEmployeeRole;
    if (payload.projectCreationPermission !== undefined) updates.projectCreationPermission = payload.projectCreationPermission;
    if (payload.projectAssignmentPermission !== undefined) updates.projectAssignmentPermission = payload.projectAssignmentPermission;

    const updated = await db.orm.public.OrganizationSettings.where({ id: settings.id }).update(updates);
    return updated;
  }
}
