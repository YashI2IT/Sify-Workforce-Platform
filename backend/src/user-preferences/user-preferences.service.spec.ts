import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPreferencesService } from './user-preferences.service.js';
import { db } from '../prisma/db.js';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        UserPreference: {
          where: vi.fn(() => ({ first: vi.fn(), update: vi.fn() })),
          create: vi.fn()
        }
      }
    },
    transaction: vi.fn(async (cb) => {
      return await cb(db);
    })
  }
}));
describe('UserPreferencesService', () => {
  let service: UserPreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPreferencesService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<UserPreferencesService>(UserPreferencesService);
  });
  it('should handle unique constraint errors gracefully in getMyPreferences', async () => {
    // Mock db.orm.public.UserPreference.where().first() to return null first, then throw P2002, then return existing
    const mFirst = vi.fn()
      .mockResolvedValueOnce(null) // first try: doesn't exist
      .mockResolvedValueOnce({ id: 'pref1' }); // retry: it exists now
      
    const mCreate = vi.fn().mockRejectedValue({ code: 'P2002', message: 'Unique constraint failed' });

    vi.mocked(db.orm.public.UserPreference.where).mockReturnValue({ first: mFirst } as any);
    vi.mocked(db.orm.public.UserPreference.create).mockImplementation(mCreate);

    const auth = { employeeId: 'e1', organizationId: 'o1', userId: 'u1', roles: [] };
    const res = await service.getMyPreferences(auth);
    
    expect(res).toEqual({ id: 'pref1' });
    expect(mFirst).toHaveBeenCalledTimes(2);
    expect(mCreate).toHaveBeenCalledTimes(1);
  });

  it('should handle unique constraint errors gracefully in updateMyPreferences', async () => {
    const patchMock = vi.fn().mockResolvedValue({ id: 'pref2', updated: true });
    
    // Within transaction, mock first() and create()
    const tx = {
      orm: {
        public: {
          UserPreference: {
            where: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              update: patchMock
            }),
            create: vi.fn().mockRejectedValue({ code: 'P2002', message: 'Unique constraint failed' })
          }
        }
      }
    };

    // First transaction throws P2002 on create
    // Second transaction succeeds on update (because first() will return the newly created row)
    let txCount = 0;
    vi.mocked(db.transaction).mockImplementation(async (cb) => {
      txCount++;
      if (txCount === 1) {
        return await cb(tx);
      } else {
        tx.orm.public.UserPreference.where = vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ id: 'pref2' }),
          update: patchMock
        });
        return await cb(tx);
      }
    });

    const auth = { employeeId: 'e2', organizationId: 'o1', userId: 'u1', roles: [] };
    const res = await service.updateMyPreferences(auth, { theme: 'dark' });
    
    expect(res).toEqual({ id: 'pref2', updated: true });
    expect(txCount).toBe(2);
  });

  it('should reject invalid themes with BadRequestException instead of ForbiddenException', async () => {
    const auth = { employeeId: 'e1', organizationId: 'o1', userId: 'u1', roles: [] };
    await expect(service.updateMyPreferences(auth, { theme: 'invalid' })).rejects.toThrow(BadRequestException);
  });
});
