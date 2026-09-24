import { Controller, Get, Post, Patch, Param, Body, Query, BadRequestException, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { EmployeesService } from './employees.service.js';
import { createEmployeeSchema, updateEmployeeSchema } from './dto/create-employee.dto.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { parsePagination } from '../common/pagination.dto.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List employees in organization' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated active employee records' })
  async findAll(@GetAuthContext() auth: AuthenticatedContext, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.employeesService.findAll(auth, page, limit);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get employee by ID within organization' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee record' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.employeesService.findOne(id, auth);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId', 'employeeCode', 'name', 'email'],
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        teamId: { type: 'string', nullable: true, description: 'Team UUID' },
        employeeCode: { type: 'string', example: 'EMP001' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        isActive: { type: 'boolean', default: true },
        role: { type: 'string', enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'], default: 'EMPLOYEE' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Employee created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Duplicate employee code or email' })
  async create(@Body() body: any, @GetAuthContext() auth: AuthenticatedContext, @Headers('authorization') authHeader: string) {
    try {
      const bodyWithOrg = { ...body, organizationId: auth.organizationId };
      const validatedData = createEmployeeSchema.parse(bodyWithOrg);
      const token = authHeader?.replace(/^Bearer\s/i, '');
      return await this.employeesService.create(validatedData, auth.organizationId, token);
    } catch (error) {
      if (error && (error as any).name === 'ZodError') {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: (error as any).errors,
        });
      }
      throw error;
    }
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an existing employee' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', nullable: true, description: 'Team UUID' },
        employeeCode: { type: 'string', example: 'EMP002' },
        name: { type: 'string', example: 'Jane Doe' },
        email: { type: 'string', format: 'email', example: 'jane@example.com' },
        isActive: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Employee updated' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 409, description: 'Duplicate employee code or email' })
  async update(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    try {
      const validatedData = updateEmployeeSchema.parse(body);
      return await this.employeesService.update(id, validatedData, auth.organizationId, auth.employeeId);
    } catch (error) {
      if (error && (error as any).name === 'ZodError') {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: (error as any).errors,
        });
      }
      throw error;
    }
  }
}