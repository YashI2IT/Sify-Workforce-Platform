import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { PublicHolidaysService } from './public-holidays.service.js';
import { db } from '../prisma/db.js';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => {
  const mPublicHoliday = {
    where: vi.fn(() => mPublicHoliday),
    all: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    create: vi.fn(),
  };
  return {
    db: {
      orm: {
        public: {
          PublicHoliday: mPublicHoliday,
        },
      },
      transaction: vi.fn(async (cb: any) => cb({
        orm: {
          public: {
            PublicHoliday: mPublicHoliday,
          }
        }
      })),
    },
  };
});

describe('PublicHolidaysService', () => {
  let service: PublicHolidaysService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PublicHolidaysService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<PublicHolidaysService>(PublicHolidaysService);
  });

  const adminAuth = { employeeId: 'admin1', organizationId: 'org1', roles: ['ADMIN'] } as any;

  it('should reject empty CSV', async () => {
    const csv = Buffer.from('');
    await expect(service.importCsv(adminAuth, csv)).rejects.toThrow(BadRequestException);
  });

  it('should reject missing columns', async () => {
    const csv = Buffer.from('name,active\nTest,true');
    await expect(service.importCsv(adminAuth, csv)).rejects.toThrow('Missing required column: date');
  });

  it('should reject extra columns', async () => {
    const csv = Buffer.from('date,name,active,extra\n2026-01-01,Test,true,1');
    await expect(service.importCsv(adminAuth, csv)).rejects.toThrow('Extra columns found: extra');
  });

  it('should handle small CSV (valid)', async () => {
    const csv = Buffer.from('date,name,active\n2026-01-01,New Year,true\n2026-01-26,Republic Day,1');
    const result = await service.importCsv(adminAuth, csv);
    expect(result.total).toBe(2);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(db.orm.public.PublicHoliday.create).toHaveBeenCalledTimes(2);
  });

  it('should handle duplicates in DB', async () => {
    const csv = Buffer.from('date,name,active\n2026-01-01,New Year,true');
    vi.mocked(db.orm.public.PublicHoliday.all).mockResolvedValueOnce([{ id: 'h1', date: '2026-01-01', name: 'New Year', isActive: true }] as any);
    const result = await service.importCsv(adminAuth, csv);
    expect(result.skipped).toBe(1);
    expect(result.success).toBe(0);
  });
  
  it('should return errors for invalid rows and rollback', async () => {
    const csv = Buffer.from('date,name,active\n2026-13-01,Invalid,true\n2026-01-01,,true');
    const result = await service.importCsv(adminAuth, csv) as any;
    expect(result.failed).toBe(2);
    expect(result.errors.length).toBe(2);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
