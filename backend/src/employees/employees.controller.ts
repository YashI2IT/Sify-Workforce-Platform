import { Controller, Get, Post, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { EmployeesService } from './employees.service.js';
import { createEmployeeSchema, updateEmployeeSchema } from './dto/create-employee.dto.js';

@ApiTags('Employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List all employees' })
  @ApiResponse({ status: 200, description: 'Array of employee records' })
  async findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee record' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organizationId', 'employeeCode', 'name', 'email'],
      properties: {
        organizationId: { type: 'string', description: 'Organization UUID' },
        employeeCode: { type: 'string', example: 'EMP001' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        isActive: { type: 'boolean', default: true },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Employee created' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Duplicate employee code or email' })
  async create(@Body() body: any) {
    try {
      const validatedData = createEmployeeSchema.parse(body);
      return await this.employeesService.create(validatedData);
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
  @ApiOperation({ summary: 'Update an existing employee' })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
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
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const validatedData = updateEmployeeSchema.parse(body);
      return await this.employeesService.update(id, validatedData);
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