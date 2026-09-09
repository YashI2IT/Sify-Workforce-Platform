import { Controller, Get, Post, Patch, Param, Body, BadRequestException } from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { createEmployeeSchema, updateEmployeeSchema } from './dto/create-employee.dto.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
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