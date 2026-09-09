import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto.js';

@Injectable()
export class EmployeesService {
  async findAll() {
    return db.orm.public.Employee.all();
  }

  async findOne(id: string) {
    const employee = await db.orm.public.Employee.where({ id }).first();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
  }

  async create(createEmployeeDto: CreateEmployeeDto) {
    const { organizationId, employeeCode, email, teamId } = createEmployeeDto;

    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Verify team
    if (teamId) {
      const team = await db.orm.public.Team.where({ id: teamId }).first();
      if (!team) {
        throw new NotFoundException('Team not found');
      }
      if (team.organizationId !== organizationId) {
        throw new BadRequestException('Team must belong to the same organization as the employee');
      }
    }

    // Respect the unique organization + employeeCode constraint
    const existingCode = await db.orm.public.Employee.where({ organizationId, employeeCode }).first();
    if (existingCode) {
      throw new ConflictException('Employee with this code already exists in the organization');
    }

    // Respect the unique organization + email constraint
    const existingEmail = await db.orm.public.Employee.where({ organizationId, email }).first();
    if (existingEmail) {
      throw new ConflictException('Employee with this email already exists in the organization');
    }

    // Create the employee
    const newEmployee = await db.orm.public.Employee.create(createEmployeeDto);
    return newEmployee;
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    // Check employee exists
    const employee = await db.orm.public.Employee.where({ id }).first();
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

