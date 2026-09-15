import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto.js';
import { PaginatedResponse } from '../common/pagination.dto.js';

@Injectable()
export class EmployeesService {
  async findAll(organizationId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;

    const employees = await db.orm.public.Employee.where({ organizationId, isActive: true })
      .orderBy(m => m.createdAt.desc())
      .limit(limit)
      .offset(offset)
      .all();
      
    const allCount = await db.orm.public.Employee.where({ organizationId, isActive: true }).all();
    const total = allCount.length;

    return {
      data: employees,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }

  async findOne(id: string, organizationId: string) {
    const employee = await db.orm.public.Employee.where({ id, organizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto, reqOrganizationId: string) {
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

    // Check unique email within the organization
    const existingEmail = await db.orm.public.Employee.where({ organizationId: scopedOrgId, email }).first();
    if (existingEmail) {
      throw new ConflictException('Employee with this email already exists in the organization');
    }

    // Check unique employee code within the organization
    if (employeeCode) {
      const existingCode = await db.orm.public.Employee.where({ organizationId: scopedOrgId, employeeCode }).first();
      if (existingCode) {
        throw new ConflictException('Employee with this code already exists in the organization');
      }
    }

    // Create the employee
    const newEmployee = await db.orm.public.Employee.create({ ...createEmployeeDto, organizationId: scopedOrgId });
    return newEmployee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto, reqOrganizationId: string) {
    // Check employee exists
    const employee = await db.orm.public.Employee.where({ id, organizationId: reqOrganizationId }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const { employeeCode, email, teamId } = updateEmployeeDto;

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

    // Check duplicate email (if being changed)
    if (email && email !== employee.email) {
      const existingEmail = await db.orm.public.Employee.where({
        organizationId: employee.organizationId,
        email,
      }).first();
      if (existingEmail) {
        throw new ConflictException('Employee with this email already exists in the organization');
      }
    }

    // Update
    const updated = await db.orm.public.Employee.where({ id }).update(updateEmployeeDto);
    return updated;
  }
}

