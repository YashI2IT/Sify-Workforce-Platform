import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TimesheetSubmissionsService } from './timesheet-submissions.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { MailService } from '../mail/mail.service.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

// ─── Minimal mock helpers ─────────────────────────────────────────────────────

const makeChain = (rows: any[] = []) => {
  const chain: any = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    select: vi.fn(() => chain),
    like: vi.fn(() => chain),
    in: vi.fn(() => chain),
    first: vi.fn(async () => rows[0] ?? null),
    all: vi.fn(async () => rows),
    create: vi.fn(async (d: any) => ({ id: 'new-id', ...d })),
    update: vi.fn(async (d: any) => ({ id: 'upd-id', ...d })),
    delete: vi.fn(async () => ({})),
    aggregate: vi.fn(async () => ({ count: rows.length })),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    desc: vi.fn(() => chain),
    asc: vi.fn(() => chain),
  };
  return chain;
};

// We'll configure specific mocks per test using a shared state variable
let mockState: Record<string, any> = {};

vi.mock('../prisma/db.js', () => {
  const get = (table: string) => ({
    get rows() { return mockState[table] ?? []; },
    where: vi.fn(function(this: any) { return makeChain(mockState[table] ?? []); }),
    create: vi.fn(async (d: any) => ({ id: `${table}-new`, ...d })),
    update: vi.fn(async (d: any) => ({ id: `${table}-upd`, ...d })),
    delete: vi.fn(async () => ({})),
  });

  return {
    db: {
      orm: {
        public: new Proxy({}, {
          get(_: any, table: string) { return get(table); },
        }),
      },
      transaction: vi.fn(async (cb: any) => {
        // Simple tx mock that uses the same global orm
        return cb({
          orm: {
            public: new Proxy({}, {
              get(_: any, table: string) { return get(table); },
            }),
          },
        });
      }),
    },
  };
});

import { db } from '../prisma/db.js';

const authCtx = (overrides: Partial<AuthenticatedContext> = {}): AuthenticatedContext => ({
  userId: 'u1', employeeId: 'emp1', organizationId: 'org1', roles: [], ...overrides,
});

describe('TimesheetSubmissionsService', () => {
  let service: TimesheetSubmissionsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockState = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimesheetSubmissionsService,
        { provide: AuditLogsService, useValue: { logEvent: vi.fn() } },
        { provide: NotificationsService, useValue: { createNotification: vi.fn() } },
        { provide: MailService, useValue: {
          sendTimesheetApprovalEmail: vi.fn().mockResolvedValue(undefined),
          sendTimesheetRejectionEmail: vi.fn().mockResolvedValue(undefined),
          sendTimesheetResubmissionEmail: vi.fn().mockResolvedValue(undefined),
          sendTimesheetReminderEmail: vi.fn().mockResolvedValue(undefined),
        }},
      ],
    }).compile();

    service = module.get<TimesheetSubmissionsService>(TimesheetSubmissionsService);
  });

  // ─── reject() ────────────────────────────────────────────────────────────────

  describe('reject()', () => {
    it('throws BadRequestException when comment is empty', async () => {
      // rejection check happens before db lookup
      await expect(service.reject('sub1', '', authCtx({ roles: ['MANAGER'] }))).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when comment is whitespace only', async () => {
      await expect(service.reject('sub1', '   ', authCtx({ roles: ['MANAGER'] }))).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when submission does not exist', async () => {
      mockState['TimesheetSubmission'] = []; // nothing in table
      await expect(service.reject('missing-id', 'reason', authCtx({ roles: ['MANAGER'] }))).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when submission is already APPROVED', async () => {
      mockState['TimesheetSubmission'] = [{ id: 'sub1', employeeId: 'emp1', status: 'APPROVED' }];
      mockState['Team'] = [{ id: 't1', managerId: 'emp1', organizationId: 'org1' }];
      mockState['Employee'] = [{ id: 'emp1', teamId: 't1', organizationId: 'org1' }];
      await expect(
        service.reject('sub1', 'too late', authCtx({ roles: ['ADMIN'] }))
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approve() ────────────────────────────────────────────────────────────────

  describe('approve()', () => {
    it('throws NotFoundException when submission does not exist', async () => {
      mockState['TimesheetSubmission'] = [];
      await expect(service.approve('missing', authCtx({ roles: ['MANAGER'] }))).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when submission is already APPROVED', async () => {
      mockState['TimesheetSubmission'] = [{ id: 'sub1', employeeId: 'emp1', status: 'APPROVED' }];
      mockState['Team'] = [{ id: 't1', managerId: 'emp1', organizationId: 'org1' }];
      mockState['Employee'] = [{ id: 'emp1', teamId: 't1', organizationId: 'org1' }];
      await expect(
        service.approve('sub1', authCtx({ roles: ['ADMIN'] }))
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when submission is REJECTED (not SUBMITTED)', async () => {
      mockState['TimesheetSubmission'] = [{ id: 'sub1', employeeId: 'emp1', status: 'REJECTED' }];
      mockState['Employee'] = [{ id: 'emp1', teamId: 't1', organizationId: 'org1' }];
      mockState['Team'] = [{ id: 't1', managerId: 'emp1', organizationId: 'org1' }];
      await expect(
        service.approve('sub1', authCtx({ roles: ['ADMIN'] }))
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findMySubmissions() ──────────────────────────────────────────────────────

  describe('findMySubmissions()', () => {
    it('returns an empty array when no submissions exist', async () => {
      mockState['TimesheetSubmission'] = [];
      const result = await service.findMySubmissions(authCtx());
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });
});
