import { Controller, Get, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { WorkingTimesService } from './working-times.service.js';
import type { WorkingTimeConfig } from './working-times.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Working Times')
@Controller('working-times')
@UseGuards(RolesGuard)
export class WorkingTimesController {
  constructor(private readonly workingTimesService: WorkingTimesService) {}

  @Get()
  @ApiOperation({ summary: 'Get organization default working-time schedule' })
  async getOrgDefault(@GetAuthContext() auth: AuthenticatedContext) {
    return this.workingTimesService.getOrgDefault(auth);
  }

  @Put()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Set organization default working-time schedule (ADMIN)' })
  @ApiBody({ schema: { type: 'object', properties: {
    monday: { type: 'number' }, tuesday: { type: 'number' }, wednesday: { type: 'number' },
    thursday: { type: 'number' }, friday: { type: 'number' }, saturday: { type: 'number' }, sunday: { type: 'number' }
  }}})
  async upsertOrgDefault(@GetAuthContext() auth: AuthenticatedContext, @Body() body: WorkingTimeConfig) {
    return this.workingTimesService.upsertOrgDefault(auth, body);
  }

  @Get('overrides')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'List all employee working-time overrides' })
  async listOverrides(@GetAuthContext() auth: AuthenticatedContext) {
    return this.workingTimesService.listOverrides(auth);
  }

  @Get('overrides/:employeeId')
  @ApiOperation({ summary: 'Get working-time config for a specific employee' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  async getOverride(@Param('employeeId') employeeId: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.workingTimesService.getOverride(employeeId, auth);
  }

  @Put('overrides/:employeeId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create or update working-time override for an employee (ADMIN)' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  async upsertOverride(
    @Param('employeeId') employeeId: string,
    @GetAuthContext() auth: AuthenticatedContext,
    @Body() body: WorkingTimeConfig,
  ) {
    return this.workingTimesService.upsertOverride(employeeId, auth, body);
  }

  @Delete('overrides/:employeeId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove working-time override for an employee (ADMIN)' })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  async deleteOverride(@Param('employeeId') employeeId: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.workingTimesService.deleteOverride(employeeId, auth);
  }
}
