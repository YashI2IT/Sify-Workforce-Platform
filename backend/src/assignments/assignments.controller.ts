import { Controller, Post, Delete, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service.js';

@ApiTags('Assignments')
@Controller()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('projects/:projectId/employees/:employeeId')
  @ApiOperation({ summary: 'Assign an employee to a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiResponse({ status: 201, description: 'Employee assigned to project' })
  @ApiResponse({ status: 400, description: 'Validation failed (e.g. inactive or cross-organization)' })
  @ApiResponse({ status: 404, description: 'Project or Employee not found' })
  @ApiResponse({ status: 409, description: 'Duplicate assignment' })
  async assignEmployeeToProject(
    @Param('projectId') projectId: string,
    @Param('employeeId') employeeId: string,
  ) {
    return this.assignmentsService.assignEmployeeToProject(projectId, employeeId);
  }

  @Delete('projects/:projectId/employees/:employeeId')
  @ApiOperation({ summary: 'Remove an employee from a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Employee removed from project' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  async removeEmployeeFromProject(
    @Param('projectId') projectId: string,
    @Param('employeeId') employeeId: string,
  ) {
    await this.assignmentsService.removeEmployeeFromProject(projectId, employeeId);
    return { success: true };
  }

  @Get('projects/:projectId/employees')
  @ApiOperation({ summary: 'List active employees assigned to a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Array of active employee records' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectEmployees(@Param('projectId') projectId: string) {
    return this.assignmentsService.getProjectEmployees(projectId);
  }

  @Get('employees/:employeeId/projects')
  @ApiOperation({ summary: 'List active projects assigned to an employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiResponse({ status: 200, description: 'Array of active project records' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployeeProjects(@Param('employeeId') employeeId: string) {
    return this.assignmentsService.getEmployeeProjects(employeeId);
  }
}
