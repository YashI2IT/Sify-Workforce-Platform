import { Controller, Get, Query, Param, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { z } from 'zod';
import {
  dateStringSchema,
  dateRangeRefinement,
  dateRangeRefinementOptions,
  formatZodError,
} from '../common/validation.utils.js';

const employeeSummaryQuerySchema = z.object({
  targetEmployeeId: z.string().uuid().optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
}).refine(dateRangeRefinement, dateRangeRefinementOptions);

const managerDashboardQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
}).refine(dateRangeRefinement, dateRangeRefinementOptions);

const teamUtilizationQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(50),
}).refine(dateRangeRefinement, dateRangeRefinementOptions);

const projectHoursQuerySchema = z.object({
  projectId: z.string().uuid('Invalid project ID').optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
}).refine(dateRangeRefinement, dateRangeRefinementOptions);

const projectAnalysisQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  interval: z.enum(['week', 'month']).default('week'),
}).refine(dateRangeRefinement, dateRangeRefinementOptions);

const workloadQuerySchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
}).refine(dateRangeRefinement, dateRangeRefinementOptions);

const advancedAnalyticsQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  interval: z.enum(['day', 'week', 'month']).default('week'),
}).refine(dateRangeRefinement, dateRangeRefinementOptions);


@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('employee-summary')
  @ApiOperation({ summary: 'Get employee time summary report' })
  @ApiQuery({ name: 'targetEmployeeId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Employee time summary' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getEmployeeSummary(
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    const parsed = employeeSummaryQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(formatZodError(parsed.error));
    }

    const { targetEmployeeId, startDate, endDate } = parsed.data;
    
    // Auth validation
    let actualTargetId = targetEmployeeId;
    
    if (auth.roles.includes('ADMIN')) {
      // If actualTargetId is omitted, returns organization-wide data for the admin's organization
    } else if (auth.roles.includes('MANAGER')) {
      if (!actualTargetId) {
        actualTargetId = auth.employeeId; // default to self if omitted
      }
    } else if (auth.roles.includes('EMPLOYEE')) {
      if (actualTargetId && actualTargetId !== auth.employeeId) {
        throw new ForbiddenException('You can only access your own report');
      }
      actualTargetId = auth.employeeId;
    } else {
      throw new ForbiddenException('Invalid role');
    }

    // Default dates
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (isNaN(end.getTime()) || isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    
    // Normalize to YYYY-MM-DD strings for consistent DB querying based on project semantics
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const finalStartDate = formatYMD(start);
    const finalEndDate = formatYMD(end);
    
    // Enforce 90-day limit
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }

    return this.reportsService.getEmployeeSummary(actualTargetId, finalStartDate, finalEndDate, auth);
  }

  @Get('manager-dashboard')
  @ApiOperation({ summary: 'Get manager dashboard report' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Manager dashboard data' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getManagerDashboard(
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only managers can access the manager dashboard');
    }

    const parsed = managerDashboardQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(formatZodError(parsed.error));
    }

    const { startDate, endDate } = parsed.data;

    // Default dates (30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (isNaN(end.getTime()) || isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const finalStartDate = formatYMD(start);
    const finalEndDate = formatYMD(end);
    
    // Enforce 90-day limit
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }

    return this.reportsService.getManagerDashboard(finalStartDate, finalEndDate, auth);
  }

  @Get('admin-dashboard')
  @ApiOperation({ summary: 'Get admin dashboard report' })
  @ApiResponse({ status: 200, description: 'Admin dashboard data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAdminDashboard(
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can access the admin dashboard');
    }
    return this.reportsService.getAdminDashboard(auth);
  }

  @Get('manager-overdue-tasks')
  @ApiOperation({ summary: 'Get total overdue tasks for manager' })
  @ApiResponse({ status: 200, description: 'Overdue task data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getManagerOverdueTasks(
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only managers can access the manager overdue tasks');
    }
    try {
      return await this.reportsService.getManagerOverdueTasks(auth);
    } catch (e: any) {
      import('fs').then(fs => fs.appendFileSync('error.log', e.stack || e.message || String(e) + '\n'));
      throw e;
    }
  }

  @Get('resource-allocation')
  @ApiOperation({ summary: 'Get advanced capacity and resource allocation' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-08-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-08-07' })
  @ApiResponse({ status: 200, description: 'Resource Allocation data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getResourceAllocation(
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    try {
      const { startDate, endDate } = workloadQuerySchema.parse(query);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        throw new BadRequestException('Date range cannot exceed 1 year for capacity planning');
      }
      
      return await this.reportsService.getResourceAllocation(startDate, endDate, auth);
    } catch (error: any) {
      if (error && error.name === 'ZodError') {
        throw new BadRequestException(formatZodError(error));
      }
      throw error;
    }
  }

  @Get('team-utilization')
  @ApiOperation({ summary: 'Get team utilization report' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Team utilization data' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getTeamUtilization(
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('MANAGER')) {
      throw new ForbiddenException('Only managers can access the team utilization report');
    }

    const result = teamUtilizationQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: result.error.issues });
    }

    const { startDate, endDate, page, limit } = result.data;

    // Default dates (30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (isNaN(end.getTime()) || isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const finalStartDate = formatYMD(start);
    const finalEndDate = formatYMD(end);
    
    // Enforce 30-day limit for Team Utilization
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      throw new BadRequestException('Date range cannot exceed 30 days');
    }

    return this.reportsService.getTeamUtilization(finalStartDate, finalEndDate, page, limit, auth);
  }

  @Get('project-hours')
  @ApiOperation({ summary: 'Get project hours report' })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Project hours data' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getProjectHours(
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can access the project hours report');
    }

    const result = projectHoursQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: result.error.issues });
    }

    const { projectId, startDate, endDate } = result.data;

    // Default dates (365 days max range for Admin)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    if (isNaN(end.getTime()) || isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const finalStartDate = formatYMD(start);
    const finalEndDate = formatYMD(end);
    
    // Enforce 365-day limit for Project Hours
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      throw new BadRequestException('Date range cannot exceed 365 days');
    }

    return this.reportsService.getProjectHours(finalStartDate, finalEndDate, projectId, auth);
  }

  @Get('project-analysis/:projectId')
  @ApiOperation({ summary: 'Get project analysis report' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'interval', required: false, enum: ['week', 'month'] })
  @ApiResponse({ status: 200, description: 'Project analysis data' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectAnalysis(
    @Param('projectId') projectId: string,
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only admins can access the project analysis report');
    }

    const result = projectAnalysisQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: result.error.issues });
    }

    const { startDate, endDate, interval } = result.data;

    // Default dates (365 days max range for Admin)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
    
    if (isNaN(end.getTime()) || isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const finalStartDate = formatYMD(start);
    const finalEndDate = formatYMD(end);
    
    // Enforce 365-day limit for Project Analysis
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      throw new BadRequestException('Date range cannot exceed 365 days');
    }

    return this.reportsService.getProjectAnalysis(projectId, finalStartDate, finalEndDate, interval as 'week' | 'month', auth);
  }

  @Get('advanced-analytics')
  @ApiOperation({ summary: 'Get advanced analytics report' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'interval', required: false, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Advanced analytics data' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async getAdvancedAnalytics(
    @Query() query: any,
    @GetAuthContext() auth: AuthenticatedContext
  ) {
    const result = advancedAnalyticsQuerySchema.safeParse(query);
    if (!result.success) {
      throw new BadRequestException({ message: 'Validation failed', errors: result.error.issues });
    }

    const { startDate, endDate, interval } = result.data;

    // Default dates (90 days max range for performance)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    if (isNaN(end.getTime()) || isNaN(start.getTime())) {
      throw new BadRequestException('Invalid date provided');
    }
    
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];
    const finalStartDate = formatYMD(start);
    const finalEndDate = formatYMD(end);
    
    // Enforce 365-day limit for Advanced Analytics
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      throw new BadRequestException('Date range cannot exceed 365 days');
    }

    return this.reportsService.getAdvancedAnalytics(finalStartDate, finalEndDate, interval as 'day' | 'week' | 'month', auth);
  }
}

