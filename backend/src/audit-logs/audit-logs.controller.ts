import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditLogsService } from './audit-logs.service.js';
import { UmsAuthGuard } from '../auth/ums-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(UmsAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) { }

  @Get('filter-options')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get available audit log filter options' })
  async getFilterOptions(@GetAuthContext() auth: AuthenticatedContext) {
    return this.auditLogsService.getFilterOptions(auth);
  }

  @Get('export')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Export organization audit logs as CSV or JSON' })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resourceType', required: false, type: String })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['desc', 'asc'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async exportLogs(
    @GetAuthContext() auth: AuthenticatedContext,
    @Res() res: Response,
    @Query('format') format?: 'csv' | 'json',
    @Query('search') search?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sortOrder') sortOrder?: 'desc' | 'asc',
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 5000;
    const result = await this.auditLogsService.exportAuditLogs(auth, {
      format,
      search,
      actorId,
      action,
      resourceType,
      resourceId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      sortOrder,
      limit: parsedLimit,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Total-Count', result.totalMatching.toString());
    res.setHeader('X-Export-Count', result.count.toString());
    return res.send(result.content);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Get organization audit logs (Admin and Manager)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'resourceType', required: false, type: String })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['desc', 'asc'] })
  async getAuditLogs(
    @GetAuthContext() auth: AuthenticatedContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('sortOrder') sortOrder?: 'desc' | 'asc',
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 50;

    return this.auditLogsService.findOrganizationAuditLogs(auth, pageNumber, limitNumber, {
      actorId,
      action,
      resourceType,
      resourceId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      search,
      sortOrder,
    });
  }
}

