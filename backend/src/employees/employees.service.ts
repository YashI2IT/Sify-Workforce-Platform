import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class EmployeesService {
  constructor(private auditLogsService: AuditLogsService) {}

  async findAll(auth: AuthenticatedContext, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;
    const organizationId = auth.organizationId;
    const isManagerOnly = !auth.roles.includes('ADMIN') && auth.roles.includes('MANAGER');

    let rawEmployees: any[] = [];
    let total = 0;

    if (isManagerOnly) {
      const managedTeams = await db.orm.public.Team.where({ organizationId, managerId: auth.employeeId }).all();
      const managedTeamIds = managedTeams.map(t => t.id);

      if (managedTeamIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 }
        };
      }

      const allMatching = await db.orm.public.Employee.where({ organizationId })
        .where(e => (e as any).teamId.in(managedTeamIds))
        .all();
      
      total = allMatching.length;
      allMatching.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
      rawEmployees = allMatching.slice(offset, offset + limit);
    } else {
      const [pageEmployees, countResult] = await Promise.all([
        db.orm.public.Employee.where({ organizationId })
          .orderBy(m => m.createdAt.desc())
          .limit(limit)
          .offset(offset)
          .all(),
        db.orm.public.Employee.where({ organizationId })
          .aggregate((a: any) => ({ count: a.count() })),
      ]);
      rawEmployees = pageEmployees;
      total = Number((countResult as any)?.count ?? 0);
    }

    // Fetch all teams to resolve managedTeams in memory and bypass TS relation errors
    const allTeams = await db.orm.public.Team.where({ organizationId }).select('id', 'name', 'managerId').all();

    const employees = rawEmployees.map(emp => {
      const managedTeams = allTeams
        .filter(t => t.managerId === emp.id)
        .map(t => ({ id: t.id, name: t.name }));

      return {
        ...emp,
        managedTeams
      };
    });

    return {
      data: employees,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, auth: AuthenticatedContext) {
    const employee = await db.orm.public.Employee.where({ id, organizationId: auth.organizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const isManagerOnly = !auth.roles.includes('ADMIN') && auth.roles.includes('MANAGER');
    if (isManagerOnly && id !== auth.employeeId) {
      if (!employee.teamId) {
        throw new ForbiddenException('You do not have access to this employee');
      }
      const managedTeam = await db.orm.public.Team.where({ id: employee.teamId, organizationId: auth.organizationId, managerId: auth.employeeId }).first();
      if (!managedTeam) {
        throw new ForbiddenException('You do not have access to this employee');
      }
    }

    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto, reqOrganizationId: string, token: string, actorId?: string) {
    const { teamId, email, employeeCode } = createEmployeeDto;

    const scopedOrgId = reqOrganizationId;

    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: scopedOrgId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Verify team
    if (teamId) {
      const team = await db.orm.public.Team.where({ id: teamId, organizationId: scopedOrgId }).first();
      if (!team) {
        throw new NotFoundException('Team not found in this organization');
      }
    }

    // Verify UMS Identity
    const umsBase = process.env.UMS_BASE_URL || 'https://apidev.sifymodernization.digital/user-mgt/api';
    const appId = process.env.UMS_APP_ID || 'Project-Management';
    
    let umsUserId: string;
    try {
      const response = await fetch(`${umsBase}/user/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-app-id': appId,
        },
      });

      if (response.status === 404) {
        throw new NotFoundException('No UMS account was found for this email. Use Invite Employee to onboard this person.');
      }

      if (!response.ok) {
        throw new BadRequestException('Failed to verify UMS identity.');
      }

      const body = await response.json();
      
      // If UMS returns an empty array for a 200 OK, it means the user was not found
      if (
        (Array.isArray(body) && body.length === 0) ||
        (Array.isArray(body?.data) && body.data.length === 0)
      ) {
        throw new NotFoundException('No UMS account was found for this email. Use Invite Employee to onboard this person.');
      }
      
      // Try multiple possible paths for the ID based on typical UMS/Keycloak responses
      const extractedId = body?.data?.id || body?.data?.user?.id || body?.id || (Array.isArray(body?.data) && body.data[0]?.id) || (Array.isArray(body) && body[0]?.id);
      
      if (!extractedId) {
        throw new BadRequestException(`Invalid UMS response structure. Received: ${JSON.stringify(body)}`);
      }
      
      umsUserId = extractedId;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      throw new BadRequestException(err.message || 'Error communicating with UMS');
    }

    // Check if the user is already bound in this organization
    const existingBinding = await db.orm.public.Employee.where({ organizationId: scopedOrgId, umsUserId }).first();
    if (existingBinding) {
      throw new ConflictException('This UMS user is already an employee in this organization');
    }

    // Check unique email globally (because employee_email_key is a global unique constraint)
    const existingEmail = await db.orm.public.Employee.where({ email }).first();
    if (existingEmail) {
      if (existingEmail.organizationId === scopedOrgId) {
        throw new ConflictException('Employee with this email already exists in this organization');
      } else {
        throw new ConflictException('Employee with this email is already assigned to another organization');
      }
    }

    // Check unique employee code within the organization
    if (employeeCode) {
      const existingCode = await db.orm.public.Employee.where({ organizationId: scopedOrgId, employeeCode }).first();
      if (existingCode) {
        throw new ConflictException('Employee with this code already exists in the organization');
      }
    }

    // Create the employee
    const newEmployee = await db.orm.public.Employee.create({ ...createEmployeeDto, organizationId: scopedOrgId, umsUserId, isActive: true });
    
    if (actorId) {
      await this.auditLogsService.logEvent(scopedOrgId, actorId, 'EMPLOYEE_CREATED', 'Employee', newEmployee.id);
    }
    
    return newEmployee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, reqOrganizationId: string, requestorEmployeeId?: string) {
    // Check employee exists
    const employee = await db.orm.public.Employee.where({ id, organizationId: reqOrganizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const { employeeCode, email, teamId, role } = updateEmployeeDto;

    // Prevent self-role escalation
    if (role && role !== employee.role) {
      if (id === requestorEmployeeId) {
        throw new ForbiddenException('A user cannot change their own role');
      }
    }

    // Verify team
    if (teamId !== undefined && teamId !== null) {
      const team = await db.orm.public.Team.where({ id: teamId }).first();
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      if (team.organizationId !== employee.organizationId) {
        throw new BadRequestException('Team must belong to the same organization as the employee');
      }
    }

    // Check duplicate employeeCode (if being changed)
    if (employeeCode && employeeCode !== employee.employeeCode) {
      const existingCode = await db.orm.public.Employee.where({
        organizationId: employee.organizationId,
        employeeCode,
      }).first();
      if (existingCode) {
        throw new ConflictException('Employee with this code already exists in the organization');
      }
    }

    // Check duplicate email (if being changed) globally
    if (email && email !== employee.email) {
      const existingEmail = await db.orm.public.Employee.where({ email }).first();
      if (existingEmail) {
        if (existingEmail.organizationId === employee.organizationId) {
          throw new ConflictException('Employee with this email already exists in the organization');
        } else {
          throw new ConflictException('Employee with this email is already assigned to another organization');
        }
      }
    }
    
    // Prevent self-deactivation
    if (updateEmployeeDto.isActive !== undefined && updateEmployeeDto.isActive !== employee.isActive) {
      if (id === requestorEmployeeId) {
        throw new ForbiddenException('A user cannot change their own active status');
      }
    }

    // Clean up invalid team relationships if demoted or deactivated
    const isDeactivated = updateEmployeeDto.isActive === false;
    const isDemoted = role && role !== 'MANAGER' && role !== 'ADMIN' && (employee.role === 'MANAGER' || employee.role === 'ADMIN');
    if (isDeactivated || isDemoted) {
      await db.orm.public.Team.where({ managerId: id }).update({ managerId: null });
    }

    // Update
    const updated = await db.orm.public.Employee.where({ id }).update(updateEmployeeDto);

    if (requestorEmployeeId) {
      await this.auditLogsService.logEvent(reqOrganizationId, requestorEmployeeId, 'EMPLOYEE_UPDATED', 'Employee', id, {
        updatedFields: Object.keys(updateEmployeeDto)
      });
      
      if (updateEmployeeDto.isActive === true && employee.isActive === false) {
        await this.auditLogsService.logEvent(reqOrganizationId, requestorEmployeeId, 'EMPLOYEE_ACTIVATED', 'Employee', id);
      } else if (updateEmployeeDto.isActive === false && employee.isActive === true) {
        await this.auditLogsService.logEvent(reqOrganizationId, requestorEmployeeId, 'EMPLOYEE_DEACTIVATED', 'Employee', id);
      }
    }

    return updated;
  }
}

