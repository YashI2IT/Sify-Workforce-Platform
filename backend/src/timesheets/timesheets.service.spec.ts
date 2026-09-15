import { Test, TestingModule } from '@nestjs/testing';
import { TimesheetsService } from './timesheets.service.js';
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

  return {
    db: {
      orm: {
        public: {
          Timesheet: mTimesheet,
          Employee: mEmployee,
          Team: mTeam,
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
      providers: [TimesheetsService],
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
    it('should throw ForbiddenException if wrong manager tries to approve', async () => {
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

    it('should throw ForbiddenException if wrong manager tries to reject', async () => {
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
  });
});
