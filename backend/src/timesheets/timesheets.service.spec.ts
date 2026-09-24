import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetsService } from './timesheets.service.js';
import { WorkingTimesService } from '../working-times/working-times.service.js';
import { db } from '../prisma/db.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mTimesheet = {
    where: vi.fn(() => mTimesheet),
    first: vi.fn(),
    all: vi.fn(),
    update: vi.fn(),
  };
  const mEmployee = { where: vi.fn(() => mEmployee), first: vi.fn() };
  const mTeam = { where: vi.fn(() => mTeam), first: vi.fn(), all: vi.fn() };
  // WorkingTime mock – resolveConfigForEmployee calls .where().first()
  const mWorkingTime = { where: vi.fn(() => mWorkingTime), first: vi.fn().mockResolvedValue(null), eq: vi.fn() };
  // PublicHoliday mock – calculateExpectedHours calls .where().all()
  const mPublicHoliday = { where: vi.fn(() => mPublicHoliday), all: vi.fn().mockResolvedValue([]), gte: vi.fn(), lte: vi.fn() };

  return {
    db: {
      orm: {
        public: {
          Timesheet: mTimesheet,
          Employee: mEmployee,
          Team: mTeam,
          TimesheetAudit: {
            create: vi.fn(),
            where: vi.fn(() => ({ orderBy: vi.fn(() => ({ all: vi.fn() })) }))
          },
          WorkingTime: mWorkingTime,
          PublicHoliday: mPublicHoliday,
        },
      },
      client: {
        query: vi.fn(),
      }
    },
  };
});

describe('TimesheetsService - Security Tests', () => {
  let service: TimesheetsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimesheetsService, WorkingTimesService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();
    service = module.get<TimesheetsService>(TimesheetsService);
  });

  const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'manager1', organizationId: 'org1', roles: [] };

  describe('Organization Isolation', () => {
    it('should throw ForbiddenException if trying to submit a timesheet from another organization', async () => {
      // Setup the timesheet
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'DRAFT' })
      } as any);

      // Setup Employee query to return null (meaning employee is not in auth.organizationId)
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.submit('ts1', authCtx)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if trying to view a timesheet from another organization', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('ts1', authCtx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Manager Approval / Rejection', () => {
    it('22. MANAGER cannot approve another manager\'s team timesheet', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'SUBMITTED' })
      } as any);
      // Employee is in same org but belongs to team with a different manager
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e2', organizationId: 'org1', teamId: 't1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't1', organizationId: 'org1', managerId: 'different-manager' })
      } as any);

      await expect(service.approve('ts1', authCtx)).rejects.toThrow(ForbiddenException);
    });

    it('23. MANAGER cannot reject another manager\'s team timesheet', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'SUBMITTED' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e2', organizationId: 'org1', teamId: 't1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't1', organizationId: 'org1', managerId: 'different-manager' })
      } as any);

      await expect(service.reject('ts1', authCtx, 'bad timesheet')).rejects.toThrow(ForbiddenException);
    });

    it('24. Cross-organization approval is rejected', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'SUBMITTED' })
      } as any);
      // Employee is in different org
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null) // null returned because of organizationId mismatch filter
      } as any);

      await expect(service.approve('ts1', authCtx)).rejects.toThrow(ForbiddenException);
    });

    it('25. ADMIN can approve timesheet for any employee in their organization', async () => {
      const adminAuthCtx: AuthenticatedContext = { userId: 'u2', employeeId: 'admin1', organizationId: 'org1', roles: ['ADMIN'] };
      
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'SUBMITTED' }),
        update: vi.fn().mockResolvedValue({ id: 'ts1', status: 'APPROVED' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e2', organizationId: 'org1', teamId: 't1' })
      } as any);

      const res = await service.approve('ts1', adminAuthCtx);
      expect(res!.status).toBe('APPROVED');
    });
  });

  describe('Audit / Status History', () => {
    it('should create SUBMITTED audit on submit', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'manager1', status: 'DRAFT' }),
        update: vi.fn().mockResolvedValue({ id: 'ts1', status: 'SUBMITTED' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'manager1', organizationId: 'org1' })
      } as any);

      await service.submit('ts1', authCtx);
      
      expect(db.orm.public.TimesheetAudit.create).toHaveBeenCalledWith(expect.objectContaining({
        timesheetId: 'ts1',
        actorId: 'manager1',
        action: 'SUBMITTED',
        comments: null
      }));
    });

    it('should create RESUBMITTED audit on submit from REJECTED state', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'manager1', status: 'REJECTED' }),
        update: vi.fn().mockResolvedValue({ id: 'ts1', status: 'SUBMITTED' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'manager1', organizationId: 'org1' })
      } as any);

      await service.submit('ts1', authCtx);
      
      expect(db.orm.public.TimesheetAudit.create).toHaveBeenCalledWith(expect.objectContaining({
        timesheetId: 'ts1',
        actorId: 'manager1',
        action: 'RESUBMITTED',
        comments: null
      }));
    });

    it('should create REJECTED audit with comment', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'SUBMITTED' }),
        update: vi.fn().mockResolvedValue({ id: 'ts1', status: 'REJECTED' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e2', organizationId: 'org1', teamId: 't1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't1', organizationId: 'org1', managerId: 'manager1' })
      } as any);

      await service.reject('ts1', authCtx, 'incomplete hours');
      
      expect(db.orm.public.TimesheetAudit.create).toHaveBeenCalledWith(expect.objectContaining({
        timesheetId: 'ts1',
        actorId: 'manager1',
        action: 'REJECTED',
        comments: 'incomplete hours'
      }));
    });

    it('should create APPROVED audit', async () => {
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'ts1', employeeId: 'e2', status: 'SUBMITTED' }),
        update: vi.fn().mockResolvedValue({ id: 'ts1', status: 'APPROVED' })
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e2', organizationId: 'org1', teamId: 't1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't1', organizationId: 'org1', managerId: 'manager1' })
      } as any);

      await service.approve('ts1', authCtx);
      
      expect(db.orm.public.TimesheetAudit.create).toHaveBeenCalledWith(expect.objectContaining({
        timesheetId: 'ts1',
        actorId: 'manager1',
        action: 'APPROVED',
        comments: null
      }));
    });
  });
});
