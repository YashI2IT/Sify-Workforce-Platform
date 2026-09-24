import { Controller, Get, Param, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TimesheetsService } from './timesheets.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { parsePagination } from '../common/pagination.dto.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Timesheets')
@Controller('timesheets')
@UseGuards(RolesGuard)
export class TimesheetsController {
  constructor(private readonly timesheetsService: TimesheetsService) {}

  @Get('my-timesheets')
  @ApiOperation({ summary: 'Get timesheets for the authenticated employee' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMyTimesheets(@GetAuthContext() auth: AuthenticatedContext, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.timesheetsService.findMyTimesheets(auth, page, limit);
  }

  @Get('approvals')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get pending timesheet approvals for the manager' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findApprovals(@GetAuthContext() auth: AuthenticatedContext, @Query() query: any) {
    const { page, limit } = parsePagination(query);
    return this.timesheetsService.findPendingApprovals(auth, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific timesheet' })
  @ApiParam({ name: 'id', description: 'Timesheet UUID' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.timesheetsService.findOne(id, auth);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit a DRAFT or REJECTED timesheet' })
  @ApiParam({ name: 'id', description: 'Timesheet UUID' })
  async submit(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.timesheetsService.submit(id, auth);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve a SUBMITTED timesheet (Manager only)' })
  @ApiParam({ name: 'id', description: 'Timesheet UUID' })
  async approve(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.timesheetsService.approve(id, auth);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject a SUBMITTED timesheet (Manager only)' })
  @ApiParam({ name: 'id', description: 'Timesheet UUID' })
  @ApiBody({ schema: { type: 'object', properties: { comment: { type: 'string' } } } })
  async reject(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext, @Body('comment') comment: string) {
    return this.timesheetsService.reject(id, auth, comment);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get audit history for a specific timesheet' })
  @ApiParam({ name: 'id', description: 'Timesheet UUID' })
  async getHistory(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.timesheetsService.getHistory(id, auth);
  }
}
