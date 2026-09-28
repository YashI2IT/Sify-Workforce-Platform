import { Injectable, ForbiddenException } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';
import { PaginatedResponse } from '../common/pagination.dto.js';

@Injectable()
export class AuditLogsService {
  
  /**
   * Internal method for writing audit logs from other services.
   * Does NOT check permissions, so it should only be called by trusted backend code.
   */
  async logEvent(
    organizationId: string,
    actorId: string | null,
    action: string,
    resourceType: string,
    resourceId?: string,
    details?: any,
    externalTx?: any
  ): Promise<void> {
    try {
      const orm = externalTx ? externalTx.orm : db.orm;
      let safeDetails = details;
      if (safeDetails && typeof safeDetails === 'object') {
        safeDetails = { ...safeDetails };
        const sensitiveKeys = ['password', 'token', 'refreshToken', 'secret', 'apiKey'];
        for (const key of sensitiveKeys) {
          if (key in safeDetails) {
            safeDetails[key] = '[REDACTED]';
          }
        }
      }

      await orm.public.AuditLog.create({
        organizationId,
        actorId,
        action,
        resourceType,
        resourceId: resourceId || null,
        details: safeDetails ? JSON.stringify(safeDetails) : null,
      });
    } catch (e) {
      console.error('Failed to write audit log', e);
      // We generally do not want to crash the main business operation if audit logging fails
      // However, for strict compliance systems, you might want to throw here.
    }
  }

  /**
   * Retrieves paginated audit logs for a given organization.
   * Restricts to ADMIN only.
   */
  async findOrganizationAuditLogs(
    auth: AuthenticatedContext,
    page: number = 1,
    limit: number = 50,
    filters?: {
      actorId?: string;
      action?: string;
      resourceType?: string;
      resourceId?: string;
      from?: Date;
      to?: Date;
    }
  ): Promise<PaginatedResponse<any>> {
    if (!auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only Administrators can view organization audit logs');
    }

    const offset = (page - 1) * limit;

    let query = db.orm.public.AuditLog.where({ organizationId: auth.organizationId });

    if (filters?.actorId) {
      query = query.where({ actorId: filters.actorId });
    }
    if (filters?.action) {
      query = query.where({ action: filters.action });
    }
    if (filters?.resourceType) {
      query = query.where({ resourceType: filters.resourceType });
    }
    if (filters?.resourceId) {
      query = query.where({ resourceId: filters.resourceId });
    }
    if (filters?.from) {
      query = query.where((log: any) => log.createdAt.gte(filters.from!));
    }
    if (filters?.to) {
      query = query.where((log: any) => log.createdAt.lte(filters.to!));
    }

    const rawLogs = await query
      .include('actor')
      .orderBy((log: any) => log.createdAt.desc())
      .limit(limit)
      .offset(offset)
      .all();

    const countAgg = await query.aggregate((a: any) => ({ count: a.count() }));
    const total = Number((countAgg as any)?.count || 0);

    const formattedLogs = rawLogs.map((log: any) => ({
      id: log.id,
      organizationId: log.organizationId,
      actorId: log.actorId,
      actorName: log.actor?.name || 'System / Unknown',
      actorEmail: log.actor?.email || null,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      details: log.details ? JSON.parse(log.details) : null,
      createdAt: log.createdAt,
    }));

    return {
      data: formattedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
