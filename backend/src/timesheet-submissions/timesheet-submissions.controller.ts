import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { TimesheetSubmissionsService } from './timesheet-submissions.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Timesheet Submissions')
@Controller('timesheet-submissions')
@UseGuards(RolesGuard)
export class TimesheetSubmissionsController {
  constructor(private readonly service: TimesheetSubmissionsService) {}

  // ── Employee endpoints ────────────────────────────────────────────────────

  @Get('my')
  @ApiOperation({ summary: 'Get all submissions for the authenticated employee' })
  async findMine(@GetAuthContext() auth: AuthenticatedContext) {
    return this.service.findMySubmissions(auth);
  }

  @Post('submit-today')
  @ApiOperation({ summary: 'Submit all DRAFT time entries for a specific date' })
  @ApiBody({ schema: { type: 'object', properties: { date: { type: 'string', example: '2026-09-29' } } } })
  async submitToday(@Body('date') date: string, @GetAuthContext() auth: AuthenticatedContext) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    return this.service.submitToday(date, auth);
  }

  @Post('submit-week')
  @ApiOperation({ summary: 'Submit all DRAFT time entries for the current week containing the given date' })
  @ApiBody({ schema: { type: 'object', properties: { weekDate: { type: 'string', example: '2026-09-29' } } } })
  async submitWeek(@Body('weekDate') weekDate: string, @GetAuthContext() auth: AuthenticatedContext) {
    if (!weekDate || !/^\d{4}-\d{2}-\d{2}$/.test(weekDate)) {
      throw new BadRequestException('weekDate must be in YYYY-MM-DD format');
    }
    return this.service.submitWeek(weekDate, auth);
  }

  // ── Manager endpoints ─────────────────────────────────────────────────────

  @Get('pending')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get all SUBMITTED submissions pending manager approval' })
  async findPending(@GetAuthContext() auth: AuthenticatedContext) {
    return this.service.findPendingSubmissions(auth);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific submission detail' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  async findOne(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.service.findOneSubmission(id, auth);
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Approve a SUBMITTED submission' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  async approve(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.service.approve(id, auth);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Reject a SUBMITTED submission (remark is mandatory)' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiBody({ schema: { type: 'object', required: ['comment'], properties: { comment: { type: 'string' } } } })
  async reject(
    @Param('id') id: string,
    @Body('comment') comment: string,
    @GetAuthContext() auth: AuthenticatedContext,
  ) {
    return this.service.reject(id, comment, auth);
  }
}
