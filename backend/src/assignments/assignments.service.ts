import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class AssignmentsService {
  constructor(private auditLogsService: AuditLogsService) {}

  private async validateManagerAccess(employeeId: string, auth: AuthenticatedContext) {
    if (auth.roles.includes('ADMIN')) return;
    if (employeeId === auth.employeeId) return; // Can self-assign if permitted
    
    const employee = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!employee) throw new NotFoundException('Employee not found');
    
    if (employee.teamId) {
      const team = await db.orm.public.Team.where({ id: employee.teamId, organizationId: auth.organizationId }).first();
      if (team && team.managerId === auth.employeeId) {
        return; // Authorized
      }
    }
    throw new ForbiddenException('You can only assign or remove employees from teams you manage');
  }

  async assignEmployeeToProject(projectId: string, employeeId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Project is inactive or completed/on-hold');
    }

    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: auth.organizationId }).first();
    const requiredRole = settings?.projectAssignmentPermission || 'MANAGER';
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes(requiredRole)) {
      throw new ForbiddenException(`You must be a ${requiredRole} or ADMIN to assign employees to projects`);
    }

    await this.validateManagerAccess(employeeId, auth);

    const employee = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (!employee.isActive) {
      throw new BadRequestException('Employee is inactive');
    }

    if (project.organizationId !== employee.organizationId) {
      throw new BadRequestException('Employee and Project must belong to the same organization');
    }

    const existingAssignment = await db.orm.public.EmployeeProject.where({
      projectId,
      employeeId,
    }).first();

    if (existingAssignment) {
      throw new ConflictException('Employee is already assigned to this project');
    }

    const assignment = await db.orm.public.EmployeeProject.create({
      projectId,
      employeeId,
    });
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'EMPLOYEE_ASSIGNED_TO_PROJECT', 'Project', projectId, {
        assignedEmployeeId: employeeId
      });
    }

    return assignment;
  }

  async removeEmployeeFromProject(projectId: string, employeeId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (!project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
      throw new BadRequestException('Project is inactive or completed/on-hold');
    }

    const settings = await db.orm.public.OrganizationSettings.where({ organizationId: auth.organizationId }).first();
    const requiredRole = settings?.projectAssignmentPermission || 'MANAGER';
    if (!auth.roles.includes('ADMIN') && !auth.roles.includes(requiredRole)) {
      throw new ForbiddenException(`You must be a ${requiredRole} or ADMIN to remove employees from projects`);
    }

    await this.validateManagerAccess(employeeId, auth);

    const existingAssignment = await db.orm.public.EmployeeProject.where({
      projectId,
      employeeId,
    }).first();

    if (!existingAssignment) {
      throw new NotFoundException('Assignment not found');
    }

    await db.orm.public.EmployeeProject.where({ projectId, employeeId }).delete();
    
    if (auth.employeeId) {
      await this.auditLogsService.logEvent(auth.organizationId, auth.employeeId, 'EMPLOYEE_REMOVED_FROM_PROJECT', 'Project', projectId, {
        removedEmployeeId: employeeId
      });
    }
  }

  async getProjectEmployees(projectId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin) {
      if (!auth.employeeId) {
        throw new NotFoundException('Project not found');
      }
      const myAssignment = await db.orm.public.EmployeeProject.where({ projectId, employeeId: auth.employeeId }).first();
      if (!myAssignment) {
        throw new NotFoundException('Project not found');
      }
    }

    const assignments = await db.orm.public.EmployeeProject.where({ projectId })
      .include('employee')
      .all();

    return assignments
      .map((a: any) => a.employee)
      .filter((e: any) => e && e.isActive);
  }

  async getUnassignedEmployees(projectId: string, auth: AuthenticatedContext) {
    const project = await db.orm.public.Project.where({ id: projectId, organizationId: auth.organizationId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Fetch all active employees in organization
    const orgEmployees = await db.orm.public.Employee.where({ organizationId: auth.organizationId, isActive: true }).all();

    // Fetch existing assignments
    const assignments = await db.orm.public.EmployeeProject.where({ projectId }).all();
    const assignedEmployeeIds = new Set(assignments.map((a: any) => a.employeeId));

    // Return unassigned employees
    return orgEmployees.filter((e: any) => !assignedEmployeeIds.has(e.id));
  }

  async getEmployeeProjects(employeeId: string, auth: AuthenticatedContext) {
    const employee = await db.orm.public.Employee.where({ id: employeeId, organizationId: auth.organizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const isAdmin = auth.roles && auth.roles.includes('ADMIN');
    if (!isAdmin && auth.employeeId !== employeeId) {
      throw new ForbiddenException('Cannot view projects for another employee');
    }

    const assignments = await db.orm.public.EmployeeProject.where({ employeeId })
      .include('project')
      .all();

    return assignments
      .map((a: any) => a.project)
      .filter((p: any) => p && p.isActive && p.organizationId === auth.organizationId);
  }
}
