import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkingTimesController } from './working-times.controller.js';
import { WorkingTimesService } from './working-times.service.js';
import { db } from '../prisma/db.js';

describe('WorkingTimes - Role-Based Access Control & Security', () => {
  let controller: WorkingTimesController;
  let service: WorkingTimesService;

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

  const sampleSchedule = {
    monday: 8,
    tuesday: 8,
    wednesday: 8,
    thursday: 8,
    friday: 8,
    saturday: 0,
    sunday: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkingTimesService();
    controller = new WorkingTimesController(service);
  });

  describe('WorkingTimesController - Role-Based Access Control', () => {
    describe('GET /working-times (Organization default schedule)', () => {
      it('allows all roles to read org default schedule', async () => {
        vi.spyOn(service, 'getOrgDefault').mockResolvedValue(sampleSchedule as any);

        const adminResult = await controller.getOrgDefault(adminAuth);
        expect(adminResult).toEqual(sampleSchedule);

        const mgrResult = await controller.getOrgDefault(managerAuth);
        expect(mgrResult).toEqual(sampleSchedule);

        const staffResult = await controller.getOrgDefault(employeeAuth);
        expect(staffResult).toEqual(sampleSchedule);
      });
    });

    describe('PUT /working-times (Set organization default schedule)', () => {
      it('allows ADMIN to update default schedule', async () => {
        vi.spyOn(service, 'upsertOrgDefault').mockResolvedValue(sampleSchedule as any);

        const result = await controller.upsertOrgDefault(adminAuth, sampleSchedule);
        expect(result).toEqual(sampleSchedule);
        expect(service.upsertOrgDefault).toHaveBeenCalledWith(adminAuth, sampleSchedule);
      });

      it('rejects MANAGER from updating default schedule with 403 Forbidden', async () => {
        await expect(controller.upsertOrgDefault(managerAuth, sampleSchedule)).rejects.toThrow(ForbiddenException);
      });

      it('rejects EMPLOYEE from updating default schedule with 403 Forbidden', async () => {
        await expect(controller.upsertOrgDefault(employeeAuth, sampleSchedule)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('GET /working-times/overrides (List overrides)', () => {
      it('allows ADMIN to list employee overrides', async () => {
        const mockOverrides = [{ id: 'wt-1', employeeId: 'emp-2', ...sampleSchedule }];
        vi.spyOn(service, 'listOverrides').mockResolvedValue(mockOverrides as any);

        const result = await controller.listOverrides(adminAuth);
        expect(result).toEqual(mockOverrides);
        expect(service.listOverrides).toHaveBeenCalledWith(adminAuth);
      });

      it('rejects MANAGER from listing employee overrides with 403 Forbidden', async () => {
        await expect(controller.listOverrides(managerAuth)).rejects.toThrow(ForbiddenException);
      });

      it('rejects EMPLOYEE from listing employee overrides with 403 Forbidden', async () => {
        await expect(controller.listOverrides(employeeAuth)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('PUT /working-times/overrides/:employeeId (Upsert employee override)', () => {
      it('allows ADMIN to create or update an employee override', async () => {
        const mockOverride = { id: 'wt-1', employeeId: 'emp-target', ...sampleSchedule };
        vi.spyOn(service, 'upsertOverride').mockResolvedValue(mockOverride as any);

        const result = await controller.upsertOverride('emp-target', adminAuth, sampleSchedule);
        expect(result).toEqual(mockOverride);
        expect(service.upsertOverride).toHaveBeenCalledWith('emp-target', adminAuth, sampleSchedule);
      });

      it('rejects MANAGER from updating an employee override with 403 Forbidden', async () => {
        await expect(
          controller.upsertOverride('emp-target', managerAuth, sampleSchedule)
        ).rejects.toThrow(ForbiddenException);
      });

      it('rejects EMPLOYEE from updating an employee override with 403 Forbidden', async () => {
        await expect(
          controller.upsertOverride('emp-target', employeeAuth, sampleSchedule)
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('DELETE /working-times/overrides/:employeeId (Delete employee override)', () => {
      it('allows ADMIN to remove an employee override', async () => {
        vi.spyOn(service, 'deleteOverride').mockResolvedValue({ id: 'wt-1', isActive: false } as any);

        const result = await controller.deleteOverride('emp-target', adminAuth);
        expect(result).toEqual({ id: 'wt-1', isActive: false });
        expect(service.deleteOverride).toHaveBeenCalledWith('emp-target', adminAuth);
      });

      it('rejects MANAGER from deleting an employee override with 403 Forbidden', async () => {
        await expect(controller.deleteOverride('emp-target', managerAuth)).rejects.toThrow(ForbiddenException);
      });

      it('rejects EMPLOYEE from deleting an employee override with 403 Forbidden', async () => {
        await expect(controller.deleteOverride('emp-target', employeeAuth)).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('WorkingTimesService - Security & Authorization', () => {
    it('service listOverrides throws ForbiddenException when caller is not ADMIN', async () => {
      await expect(service.listOverrides(managerAuth)).rejects.toThrow(ForbiddenException);
      await expect(service.listOverrides(employeeAuth)).rejects.toThrow(ForbiddenException);
    });

    it('service upsertOverride throws ForbiddenException when caller is not ADMIN', async () => {
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'emp-target', organizationId: 'org-1' }),
      } as any);

      await expect(service.upsertOverride('emp-target', managerAuth, sampleSchedule)).rejects.toThrow(ForbiddenException);
      await expect(service.upsertOverride('emp-target', employeeAuth, sampleSchedule)).rejects.toThrow(ForbiddenException);
    });

    it('service deleteOverride throws ForbiddenException when caller is not ADMIN', async () => {
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'emp-target', organizationId: 'org-1' }),
      } as any);

      await expect(service.deleteOverride('emp-target', managerAuth)).rejects.toThrow(ForbiddenException);
      await expect(service.deleteOverride('emp-target', employeeAuth)).rejects.toThrow(ForbiddenException);
    });
  });
});
