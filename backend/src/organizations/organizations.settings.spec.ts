import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { db } from '../prisma/db.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('Organizations Settings & Preferences RBAC & Persistence', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;
  let mockAuditLogsService: any;

  const adminAuth = {
    employeeId: 'emp-admin',
    organizationId: 'org-1',
    roles: ['ADMIN'],
    userId: 'user-admin',
  } as any;

  const managerAuth = {
    employeeId: 'emp-mgr',
    organizationId: 'org-1',
    roles: ['MANAGER'],
    userId: 'user-mgr',
  } as any;

  const employeeAuth = {
    employeeId: 'emp-staff',
    organizationId: 'org-1',
    roles: ['EMPLOYEE'],
    userId: 'user-staff',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLogsService = {
      logEvent: vi.fn().mockResolvedValue(undefined),
    };
    service = new OrganizationsService(mockAuditLogsService);
    controller = new OrganizationsController(service);
  });

  describe('OrganizationsController - RBAC Access Control', () => {
    it('allows ADMIN to GET organization settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        organizationId: 'org-1',
        timeZone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        emailNotifications: true,
        weekStartsOn: 1,
      };

      vi.spyOn(service, 'getSettings').mockResolvedValue(mockSettings as any);

      const result = await controller.getSettings(adminAuth);
      expect(result).toEqual(mockSettings);
      expect(service.getSettings).toHaveBeenCalledWith('org-1');
    });

    it('rejects MANAGER from GET organization settings with 403 Forbidden', async () => {
      await expect(controller.getSettings(managerAuth)).rejects.toThrow(ForbiddenException);
    });

    it('rejects EMPLOYEE from GET organization settings with 403 Forbidden', async () => {
      await expect(controller.getSettings(employeeAuth)).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to PATCH organization settings', async () => {
      const payload = {
        timeZone: 'Asia/Kolkata',
        dateFormat: 'YYYY-MM-DD',
        emailNotifications: false,
      };

      vi.spyOn(service, 'updateSettings').mockResolvedValue({ id: 'settings-1', ...payload } as any);

      const result = await controller.updateSettings(payload, adminAuth);
      expect(result).toEqual({ id: 'settings-1', ...payload });
      expect(service.updateSettings).toHaveBeenCalledWith('org-1', 'emp-admin', payload);
    });

    it('rejects MANAGER from PATCH organization settings with 403 Forbidden', async () => {
      await expect(
        controller.updateSettings({ timeZone: 'Asia/Kolkata' }, managerAuth)
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects EMPLOYEE from PATCH organization settings with 403 Forbidden', async () => {
      await expect(
        controller.updateSettings({ timeZone: 'Asia/Kolkata' }, employeeAuth)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('OrganizationsService - Persistence & Validation', () => {
    it('creates default settings with timeZone, dateFormat, and emailNotifications when none exist', async () => {
      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      } as any);

      const mockCreated = {
        id: 'settings-new',
        organizationId: 'org-1',
        timeZone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        emailNotifications: true,
      };

      vi.spyOn(db.orm.public.OrganizationSettings, 'create').mockResolvedValue(mockCreated as any);

      const settings = await service.getSettings('org-1');
      expect(settings).toEqual(mockCreated);
      expect(db.orm.public.OrganizationSettings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          timeZone: 'UTC',
          dateFormat: 'DD/MM/YYYY',
          emailNotifications: true,
        })
      );
    });

    it('updates timeZone, dateFormat, and emailNotifications successfully', async () => {
      const existingSettings = {
        id: 'settings-1',
        organizationId: 'org-1',
        timeZone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        emailNotifications: true,
      };

      vi.spyOn(service, 'getSettings').mockResolvedValue(existingSettings as any);
      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        update: vi.fn().mockResolvedValue({
          ...existingSettings,
          timeZone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY',
          emailNotifications: false,
        }),
      } as any);

      const updated = await service.updateSettings('org-1', 'emp-admin', {
        timeZone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        emailNotifications: false,
      });

      expect(updated!.timeZone).toBe('America/New_York');
      expect(updated!.dateFormat).toBe('MM/DD/YYYY');
      expect(updated!.emailNotifications).toBe(false);
      expect(mockAuditLogsService.logEvent).toHaveBeenCalledWith(
        'org-1',
        'emp-admin',
        'ORGANIZATION_SETTINGS_UPDATED',
        'OrganizationSettings',
        'settings-1',
        expect.objectContaining({
          updatedFields: expect.arrayContaining(['timeZone', 'dateFormat', 'emailNotifications']),
        })
      );
    });

    it('throws BadRequestException if dateFormat is unsupported', async () => {
      vi.spyOn(service, 'getSettings').mockResolvedValue({ id: 's-1' } as any);

      await expect(
        service.updateSettings('org-1', 'emp-admin', { dateFormat: 'INVALID_FORMAT' })
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if emailNotifications is not a boolean', async () => {
      vi.spyOn(service, 'getSettings').mockResolvedValue({ id: 's-1' } as any);

      await expect(
        service.updateSettings('org-1', 'emp-admin', { emailNotifications: 'not-a-bool' as any })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('NotificationsService - Organization-wide Email Notification Policy', () => {
    let notificationsService: NotificationsService;
    let mockMailService: any;

    beforeEach(() => {
      mockMailService = {
        sendNotificationEmail: vi.fn().mockResolvedValue(undefined),
      };
      notificationsService = new NotificationsService(mockMailService);
    });

    it('suppresses email dispatch when organization settings has emailNotifications: false', async () => {
      const mockEmployee = {
        id: 'emp-1',
        name: 'Arjun Patel',
        email: 'arjun@example.com',
        organizationId: 'org-1',
      };

      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(mockEmployee),
      } as any);

      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'settings-1',
          organizationId: 'org-1',
          emailNotifications: false,
        }),
      } as any);

      // Call private dispatchEmailIfEnabled
      await (notificationsService as any).dispatchEmailIfEnabled({
        recipientId: 'emp-1',
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: 'You have been assigned to task',
      });

      expect(mockMailService.sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('dispatches email when organization settings has emailNotifications: true', async () => {
      const mockEmployee = {
        id: 'emp-1',
        name: 'Arjun Patel',
        email: 'arjun@example.com',
        organizationId: 'org-1',
      };

      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue(mockEmployee),
      } as any);

      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'settings-1',
          organizationId: 'org-1',
          emailNotifications: true,
        }),
      } as any);

      vi.spyOn(db.orm.public.UserPreference, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({
          employeeId: 'emp-1',
          emailNotifications: true,
        }),
      } as any);

      await (notificationsService as any).dispatchEmailIfEnabled({
        recipientId: 'emp-1',
        type: 'TASK_ASSIGNED',
        title: 'Task Assigned',
        message: 'You have been assigned to task',
      });

      expect(mockMailService.sendNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'arjun@example.com',
          name: 'Arjun Patel',
          title: 'Task Assigned',
        })
      );
    });
  });
});
