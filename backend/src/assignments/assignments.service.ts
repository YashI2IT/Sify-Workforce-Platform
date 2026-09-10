import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class AssignmentsService {
  async assignEmployeeToProject(projectId: string, employeeId: string) {
    const project = await db.orm.public.Project.where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (!project.isActive) {
      throw new BadRequestException('Project is inactive');
    }

    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
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

    return assignment;
  }

  async removeEmployeeFromProject(projectId: string, employeeId: string) {
    const existingAssignment = await db.orm.public.EmployeeProject.where({
      projectId,
      employeeId,
    }).first();

    if (!existingAssignment) {
      throw new NotFoundException('Assignment not found');
    }

    await db.orm.public.EmployeeProject.where({ projectId, employeeId }).delete();
  }

  async getProjectEmployees(projectId: string) {
    const project = await db.orm.public.Project.where({ id: projectId }).first();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const assignments = await db.orm.public.EmployeeProject.where({ projectId })
      .include('employee')
      .all();

    // Filter to only return active employees per normal operational use
    return assignments
      .map((a) => a.employee)
      .filter((e) => e && e.isActive);
  }

  async getEmployeeProjects(employeeId: string) {
    const employee = await db.orm.public.Employee.where({ id: employeeId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const assignments = await db.orm.public.EmployeeProject.where({ employeeId })
      .include('project')
      .all();

    // Filter to only return active projects per normal operational use
    return assignments
      .map((a) => a.project)
      .filter((p) => p && p.isActive);
  }
}
