import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { AuditLogsService, formatAuditAction, formatDetailsSummary } from './audit-logs.service.js';
import { AuditLogsController } from './audit-logs.controller.js';
import { db } from '../prisma/db.js';

describe('AuditLogsService & AuditLogsController', () => {
  let service: AuditLogsService;
  let controller: AuditLogsController;

  const adminAuth = {
    employeeId: 'emp-admin-1',
    organizationId: 'org-sify-1',
    roles: ['ADMIN'],
    userId: 'user-admin-1',
  } as any;

  const managerAuth = {
    employeeId: 'emp-mgr-1',
    organizationId: 'org-sify-1',
    roles: ['MANAGER'],
    userId: 'user-mgr-1',
  } as any;

  const employeeAuth = {
    employeeId: 'emp-staff-1',
    organizationId: 'org-sify-1',
    roles: ['EMPLOYEE'],
    userId: 'user-staff-1',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuditLogsService();
    controller = new AuditLogsController(service);
  });

  describe('formatAuditAction & formatDetailsSummary', () => {
    it('converts technical enum names to human-readable action labels', () => {
      expect(formatAuditAction('PROJECT_CREATED')).toBe('Project created');
      expect(formatAuditAction('TIME_ENTRY_CREATED')).toBe('Time entry created');
      expect(formatAuditAction('TIMESHEET_APPROVED')).toBe('Timesheet approved');
      expect(formatAuditAction('EMPLOYEE_ASSIGNED_TO_PROJECT')).toBe('Assigned to project');
      expect(formatAuditAction('CUSTOM_UNKNOWN_EVENT')).toBe('Custom unknown event');
      expect(formatAuditAction('')).toBe('Unknown action');
    });

    it('formats before-and-after change diffs when changes object is present', () => {
      const details = {
        changes: {
          status: { from: 'ACTIVE', to: 'INACTIVE' },
          priority: { from: 'MEDIUM', to: 'HIGH' },
        },
      };
      const summary = formatDetailsSummary(details);
      expect(summary).toBe('status: ACTIVE → INACTIVE · priority: MEDIUM → HIGH');
    });

    it('formats updated field names when updatedFields is present', () => {
      const details = { updatedFields: ['name', 'description', 'timeZone'] };
      const summary = formatDetailsSummary(details);
      expect(summary).toBe('Changed fields: Name, Description, Time zone');
    });

    it('formats invited email details', () => {
      const details = { invitedEmail: 'newhire@sify.com', role: 'EMPLOYEE' };
      expect(formatDetailsSummary(details)).toBe('Invited newhire@sify.com (EMPLOYEE)');
    });

    it('formats time entry hours and date', () => {
      const details = { hours: 8, date: '2026-10-22' };
      expect(formatDetailsSummary(details)).toBe('8 hrs on 2026-10-22');
    });

    it('formats assigned and removed employee names in details summary', () => {
      expect(formatDetailsSummary({ assignedEmployeeName: 'Yash Borade' })).toBe('Assigned: Yash Borade');
      expect(formatDetailsSummary({ removedEmployeeName: 'Priya Sharma' })).toBe('Removed: Priya Sharma');
    });

    it('handles null or empty details gracefully without fabricating values', () => {
      expect(formatDetailsSummary(null)).toBe('No additional details recorded');
      expect(formatDetailsSummary({})).toBe('No additional details recorded');
    });
  });

  describe('Authorization and Access Control', () => {
    it('throws ForbiddenException if non-admin/manager attempts to view audit logs', async () => {
      await expect(service.findOrganizationAuditLogs(employeeAuth)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if non-admin/manager attempts to get filter options', async () => {
      await expect(service.getFilterOptions(employeeAuth)).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if non-admin/manager attempts to export audit logs', async () => {
      await expect(service.exportAuditLogs(employeeAuth, {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Database Scoping and Querying', () => {
    it('scopes queries strictly to auth.organizationId and enforces max limit 100', async () => {
      const mockRawLogs = [
        {
          id: 'log-1',
          organizationId: 'org-sify-1',
          actorId: 'emp-admin-1',
          actor: { name: 'Arjun Admin', email: 'admin@sify.com' },
          action: 'PROJECT_UPDATED',
          resourceType: 'Project',
          resourceId: 'proj-1',
          details: JSON.stringify({ updatedFields: ['status'] }),
          createdAt: new Date('2026-10-22T10:00:00Z'),
        },
      ];

      const mockQueryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockRawLogs),
        aggregate: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue(mockQueryBuilder);

      const result = await service.findOrganizationAuditLogs(adminAuth, 1, 200);

      expect(db.orm.public.AuditLog.where).toHaveBeenCalledWith({ organizationId: 'org-sify-1' });
      // Enforced max limit is 100
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
      expect(result.meta.limit).toBe(100);
      expect(result.data.length).toBe(1);
      expect(result.data[0].readableAction).toBe('Project updated');
      expect(result.data[0].actorName).toBe('Arjun Admin');
    });

    it('applies sortOrder asc and desc correctly', async () => {
      const mockQueryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({ count: 0 }),
      };

      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue(mockQueryBuilder);

      await service.findOrganizationAuditLogs(adminAuth, 1, 50, { sortOrder: 'asc' });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();

      await service.findOrganizationAuditLogs(adminAuth, 1, 50, { sortOrder: 'desc' });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
    });

    it('provides graceful fallbacks for deleted or system actors', async () => {
      const mockRawLogs = [
        {
          id: 'log-sys',
          organizationId: 'org-sify-1',
          actorId: null,
          actor: null,
          action: 'PUBLIC_HOLIDAY_CREATED',
          resourceType: 'PublicHoliday',
          resourceId: 'hol-1',
          details: null,
          createdAt: new Date('2026-10-22T08:00:00Z'),
        },
        {
          id: 'log-del',
          organizationId: 'org-sify-1',
          actorId: 'deleted-emp-id',
          actor: null,
          action: 'TIME_ENTRY_DELETED',
          resourceType: 'TimeEntry',
          resourceId: 'entry-9',
          details: JSON.stringify({ hours: 4 }),
          createdAt: new Date('2026-10-22T09:00:00Z'),
        },
      ];

      const mockQueryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockRawLogs),
        aggregate: vi.fn().mockResolvedValue({ count: 2 }),
      };

      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue(mockQueryBuilder);

      const res = await service.findOrganizationAuditLogs(adminAuth, 1, 50);
      expect(res.data[0].actorName).toBe('System');
      expect(res.data[1].actorName).toBe('Former Employee');
    });
  });

  describe('Export Functionality', () => {
    it('exports audit logs as properly escaped CSV with RFC 4180 compliance', async () => {
      const mockRawLogs = [
        {
          id: 'log-101',
          organizationId: 'org-sify-1',
          actorId: 'emp-1',
          actor: { name: 'Priya "Lead" Sharma', email: 'priya@sify.com' },
          action: 'PROJECT_UPDATED',
          resourceType: 'Project',
          resourceId: 'proj-101',
          details: JSON.stringify({ comment: 'Updated status, budget, & timeline' }),
          createdAt: new Date('2026-10-22T10:30:00Z'),
        },
      ];

      const mockQueryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockRawLogs),
        aggregate: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue(mockQueryBuilder);

      const result = await service.exportAuditLogs(adminAuth, { format: 'csv' });

      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toContain('.csv');
      expect(result.content).toContain('Event ID,Timestamp (UTC),Actor Name');
      expect(result.content).toContain('"Priya ""Lead"" Sharma"');
      expect(result.content).toContain('Project updated');
      expect(result.count).toBe(1);
    });

    it('exports audit logs as JSON structured records', async () => {
      const mockRawLogs = [
        {
          id: 'log-102',
          organizationId: 'org-sify-1',
          actorId: 'emp-2',
          actor: { name: 'Rahul Verma', email: 'rahul@sify.com' },
          action: 'TIME_ENTRY_CREATED',
          resourceType: 'TimeEntry',
          resourceId: 'entry-2',
          details: JSON.stringify({ hours: 8, date: '2026-10-22' }),
          createdAt: new Date('2026-10-22T11:00:00Z'),
        },
      ];

      const mockQueryBuilder: any = {
        where: vi.fn().mockReturnThis(),
        include: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue(mockRawLogs),
        aggregate: vi.fn().mockResolvedValue({ count: 1 }),
      };

      vi.spyOn(db.orm.public.AuditLog, 'where').mockReturnValue(mockQueryBuilder);

      const result = await service.exportAuditLogs(adminAuth, { format: 'json' });

      expect(result.mimeType).toBe('application/json');
      expect(result.filename).toContain('.json');
      const parsed = JSON.parse(result.content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].id).toBe('log-102');
      expect(parsed[0].readableAction).toBe('Time entry created');
      expect(parsed[0].details.hours).toBe(8);
    });
  });

  describe('Controller Endpoints Delegation', () => {
    it('delegates export query to exportAuditLogs and sets download response headers', async () => {
      const mockRes: any = {
        setHeader: vi.fn(),
        send: vi.fn().mockReturnValue('csv-data'),
      };

      vi.spyOn(service, 'exportAuditLogs').mockResolvedValue({
        filename: 'audit.csv',
        mimeType: 'text/csv',
        content: 'id,action\n1,PROJECT_CREATED',
        count: 1,
        totalMatching: 1,
      });

      await controller.exportLogs(adminAuth, mockRes, 'csv', 'proj');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="audit.csv"');
      expect(mockRes.send).toHaveBeenCalledWith('id,action\n1,PROJECT_CREATED');
    });

    it('delegates filter options query to getFilterOptions', async () => {
      vi.spyOn(service, 'getFilterOptions').mockResolvedValue({
        actions: [{ value: 'PROJECT_CREATED', label: 'Project created' }],
        resourceTypes: [{ value: 'Project', label: 'Project' }],
        actors: [],
      });

      const options = await controller.getFilterOptions(adminAuth);
      expect(options.actions[0].label).toBe('Project created');
    });
  });
});
