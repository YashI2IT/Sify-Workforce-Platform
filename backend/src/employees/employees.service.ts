import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    const { organizationId, employeeCode, email } = createEmployeeDto;

    // Verify organization exists
    const organization = await db.orm.public.Organization.where({ id: organizationId }).first();
    if (!organization) {
      throw new NotFoundException('Organization not found');
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

    const { employeeCode, email } = updateEmployeeDto;

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
