import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: { 
            getEmployeeSummary: vi.fn().mockResolvedValue({}),
            getManagerDashboard: vi.fn().mockResolvedValue({}),
            getTeamUtilization: vi.fn().mockResolvedValue({}),
            getProjectHours: vi.fn().mockResolvedValue({}),
            getProjectAnalysis: vi.fn().mockResolvedValue({}),
            getWorkload: vi.fn().mockResolvedValue([]),
            getAdminDashboard: vi.fn().mockResolvedValue({})
          }
        }
      ],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    service = module.get<ReportsService>(ReportsService);
  });

  const authCtx = (roles: string[] = ['EMPLOYEE']): AuthenticatedContext => ({
    userId: '123e4567-e89b-12d3-a456-426614174000', employeeId: '123e4567-e89b-12d3-a456-426614174000', organizationId: 'org1', roles
  });

  it('8. Default 30-day range', async () => {
    await controller.getEmployeeSummary({}, authCtx());
    expect(service.getEmployeeSummary).toHaveBeenCalled();
    const args = vi.mocked(service.getEmployeeSummary).mock.calls[0];
    const start = new Date(args[1]);
    const end = new Date(args[2]);
    const diff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    expect(diff).toBeCloseTo(30, 0);
  });

  it('9. Custom range', async () => {
    await controller.getEmployeeSummary({ startDate: '2026-08-01', endDate: '2026-08-10' }, authCtx());
    expect(service.getEmployeeSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', '2026-08-01', '2026-08-10', expect.any(Object));
  });

  it('10. >90 days rejected', async () => {
    await expect(controller.getEmployeeSummary({ startDate: '2026-01-01', endDate: '2026-06-01' }, authCtx()))
      .rejects.toThrow(BadRequestException);
  });

  it('11. invalid start date rejected', async () => {
    await expect(controller.getEmployeeSummary({ startDate: 'invalid' }, authCtx()))
      .rejects.toThrow(BadRequestException);
  });

  it('12. invalid end date rejected', async () => {
    await expect(controller.getEmployeeSummary({ endDate: '2026-08-32' }, authCtx()))
      .rejects.toThrow(BadRequestException); // Regex YYYY-MM-DD will pass 32 but Date parsing will fail or we can rely on zod regex
  });

  it('13. end < start rejected', async () => {
    await expect(controller.getEmployeeSummary({ startDate: '2026-08-10', endDate: '2026-08-01' }, authCtx()))
      .rejects.toThrow(BadRequestException);
  });
  
  it('1. Employee self access', async () => {
    await controller.getEmployeeSummary({ targetEmployeeId: '123e4567-e89b-12d3-a456-426614174000' }, authCtx(['EMPLOYEE']));
    expect(service.getEmployeeSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', expect.any(String), expect.any(String), expect.any(Object));
  });

  it('2. Employee other employee denied', async () => {
    await expect(controller.getEmployeeSummary({ targetEmployeeId: '123e4567-e89b-12d3-a456-426614174001' }, authCtx(['EMPLOYEE'])))
      .rejects.toThrow(ForbiddenException);
  });

  it('3. Manager own access', async () => {
    await controller.getEmployeeSummary({ targetEmployeeId: '123e4567-e89b-12d3-a456-426614174000' }, authCtx(['MANAGER']));
    expect(service.getEmployeeSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', expect.any(String), expect.any(String), expect.any(Object));
  });
  
  it('Manager default to self if omitted', async () => {
    await controller.getEmployeeSummary({}, authCtx(['MANAGER']));
    expect(service.getEmployeeSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', expect.any(String), expect.any(String), expect.any(Object));
  });

  it('6. Admin organization employee access', async () => {
    await controller.getEmployeeSummary({ targetEmployeeId: '123e4567-e89b-12d3-a456-426614174001' }, authCtx(['ADMIN']));
    expect(service.getEmployeeSummary).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001', expect.any(String), expect.any(String), expect.any(Object));
  });
  
  it('Admin organization-wide access when targetEmployeeId is omitted', async () => {
    await controller.getEmployeeSummary({}, authCtx(['ADMIN']));
    expect(service.getEmployeeSummary).toHaveBeenCalledWith(undefined, expect.any(String), expect.any(String), expect.any(Object));
  });

  describe('Admin Dashboard Endpoint', () => {
    it('allows ADMIN role', async () => {
      await controller.getAdminDashboard(authCtx(['ADMIN']));
      expect(service.getAdminDashboard).toHaveBeenCalled();
    });

    it('rejects MANAGER role', async () => {
      await expect(controller.getAdminDashboard(authCtx(['MANAGER'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects EMPLOYEE role', async () => {
      await expect(controller.getAdminDashboard(authCtx(['EMPLOYEE'])))
        .rejects.toThrow(ForbiddenException);
    });
  });
  
  describe('Manager Dashboard Endpoint', () => {
    it('allows MANAGER role', async () => {
      await controller.getManagerDashboard({}, authCtx(['MANAGER']));
      expect(service.getManagerDashboard).toHaveBeenCalled();
    });

    it('rejects EMPLOYEE role', async () => {
      await expect(controller.getManagerDashboard({}, authCtx(['EMPLOYEE'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects ADMIN role without MANAGER', async () => {
      await expect(controller.getManagerDashboard({}, authCtx(['ADMIN'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('enforces 90-day limit', async () => {
      await expect(controller.getManagerDashboard({ startDate: '2026-01-01', endDate: '2026-06-01' }, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
    });

    it('validates dates', async () => {
      await expect(controller.getManagerDashboard({ startDate: 'invalid' }, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Team Utilization Endpoint', () => {
    it('allows MANAGER role', async () => {
      await controller.getTeamUtilization({ page: 1, limit: 10 }, authCtx(['MANAGER']));
      expect(service.getTeamUtilization).toHaveBeenCalled();
    });

    it('rejects EMPLOYEE role', async () => {
      await expect(controller.getTeamUtilization({}, authCtx(['EMPLOYEE'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects ADMIN role without MANAGER', async () => {
      await expect(controller.getTeamUtilization({}, authCtx(['ADMIN'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('enforces 30-day limit', async () => {
      await expect(controller.getTeamUtilization({ startDate: '2026-01-01', endDate: '2026-06-01' }, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
    });

    it('validates pagination params', async () => {
      await expect(controller.getTeamUtilization({ page: -1 }, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
      
      await expect(controller.getTeamUtilization({ limit: 101 }, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Project Hours Endpoint', () => {
    it('allows ADMIN role', async () => {
      await controller.getProjectHours({}, authCtx(['ADMIN']));
      expect(service.getProjectHours).toHaveBeenCalled();
    });

    it('rejects MANAGER role', async () => {
      await expect(controller.getProjectHours({}, authCtx(['MANAGER'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects EMPLOYEE role', async () => {
      await expect(controller.getProjectHours({}, authCtx(['EMPLOYEE'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('enforces 365-day limit', async () => {
      await expect(controller.getProjectHours({ startDate: '2024-01-01', endDate: '2026-06-01' }, authCtx(['ADMIN'])))
        .rejects.toThrow(BadRequestException);
    });
    
    it('validates custom date range', async () => {
      await controller.getProjectHours({ startDate: '2026-01-01', endDate: '2026-06-01' }, authCtx(['ADMIN']));
      expect(service.getProjectHours).toHaveBeenCalled();
    });

    it('validates project ID', async () => {
      await expect(controller.getProjectHours({ projectId: 'invalid' }, authCtx(['ADMIN'])))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Workload Endpoint', () => {
    it('validates dates are required and valid', async () => {
      await expect(controller.getWorkload({}, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
      
      await expect(controller.getWorkload({ startDate: '2026-08-01', endDate: 'invalid' }, authCtx(['MANAGER'])))
        .rejects.toThrow(BadRequestException);
    });

    it('allows MANAGER role and passes data to service', async () => {
      await controller.getWorkload({ startDate: '2026-08-01', endDate: '2026-08-07' }, authCtx(['MANAGER']));
      expect(service.getWorkload).toHaveBeenCalledWith('2026-08-01', '2026-08-07', expect.any(Object));
    });
  });

  describe('Project Analysis Endpoint', () => {
    it('allows ADMIN role', async () => {
      await controller.getProjectAnalysis('123e4567-e89b-12d3-a456-426614174000', {}, authCtx(['ADMIN']));
      expect(service.getProjectAnalysis).toHaveBeenCalled();
    });

    it('rejects MANAGER role', async () => {
      await expect(controller.getProjectAnalysis('123e4567-e89b-12d3-a456-426614174000', {}, authCtx(['MANAGER'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects EMPLOYEE role', async () => {
      await expect(controller.getProjectAnalysis('123e4567-e89b-12d3-a456-426614174000', {}, authCtx(['EMPLOYEE'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('enforces 365-day limit', async () => {
      await expect(controller.getProjectAnalysis('123e4567-e89b-12d3-a456-426614174000', { startDate: '2024-01-01', endDate: '2026-06-01' }, authCtx(['ADMIN'])))
        .rejects.toThrow(BadRequestException);
    });

    it('validates interval enum', async () => {
      await expect(controller.getProjectAnalysis('123e4567-e89b-12d3-a456-426614174000', { interval: 'invalid' }, authCtx(['ADMIN'])))
        .rejects.toThrow(BadRequestException);
    });
    
    it('uses default week interval', async () => {
      await controller.getProjectAnalysis('123e4567-e89b-12d3-a456-426614174000', {}, authCtx(['ADMIN']));
      expect(service.getProjectAnalysis).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000', expect.any(String), expect.any(String), 'week', expect.any(Object));
    });
  });
});
