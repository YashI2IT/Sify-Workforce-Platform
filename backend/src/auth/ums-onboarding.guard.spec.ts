import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UmsOnboardingGuard } from './ums-onboarding.guard.js';
import { ConflictException } from '@nestjs/common';

export const mockDbFirstOnboarding = vi.fn().mockResolvedValue(null);

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        Employee: {
          where: () => ({
            first: mockDbFirstOnboarding,
          }),
        },
      },
    },
  },
}));

describe('UmsOnboardingGuard', () => {
  let guard: UmsOnboardingGuard;
  let mockCtx: any;
  let mockRequest: any;

  beforeEach(() => {
    guard = new UmsOnboardingGuard();
    mockRequest = { headers: {}, path: '/api/v1/organizations' };
    mockCtx = {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    };
    mockDbFirstOnboarding.mockResolvedValue(null);
    vi.clearAllMocks();
  });

  it('rejects if no authorization header', async () => {
    await expect(guard.canActivate(mockCtx)).rejects.toThrow('Missing or invalid Authorization header');
  });

  it('sets umsUser and returns true if UMS valid and no Employee exists', async () => {
    mockRequest.headers['authorization'] = 'Bearer valid_token';
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { valid: true, user: { id: 'ums1', email: 'test@example.com' } } }),
    } as any);

    const result = await guard.canActivate(mockCtx);
    expect(result).toBe(true);
    expect(mockRequest.umsUser).toEqual({ id: 'ums1', email: 'test@example.com' });
  });

  it('throws ConflictException if UMS valid but Employee DOES exist by email', async () => {
    mockRequest.headers['authorization'] = 'Bearer valid_token';
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { valid: true, user: { id: 'ums1', email: 'test@example.com' } } }),
    } as any);

    mockDbFirstOnboarding
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'emp1' });

    await expect(guard.canActivate(mockCtx)).rejects.toThrow(ConflictException);
  });

  it('throws ConflictException if UMS valid but Employee DOES exist by umsUserId', async () => {
    mockRequest.headers['authorization'] = 'Bearer valid_token';
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { valid: true, user: { id: 'ums1', email: 'test@example.com' } } }),
    } as any);

    mockDbFirstOnboarding
      .mockResolvedValueOnce({ id: 'emp1' }); // first call returns employee

    await expect(guard.canActivate(mockCtx)).rejects.toThrow(ConflictException);
  });
});
