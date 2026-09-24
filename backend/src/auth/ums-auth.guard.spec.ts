import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UmsAuthGuard } from './ums-auth.guard.js';
import { ForbiddenException } from '@nestjs/common';

export const mockDbFirst = vi.fn().mockResolvedValue({ id: 'emp_id', organizationId: 'org_id', role: 'EMPLOYEE', isActive: true, umsUserId: null });
export const mockDbUpdate = vi.fn().mockResolvedValue(null);

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        Employee: {
          where: () => ({
            first: mockDbFirst,
            update: mockDbUpdate,
          }),
        },
      },
    },
  },
}));

describe('UmsAuthGuard', () => {
  describe('mapRoles', () => {
    it('maps ADMIN role correctly', () => {
      expect(UmsAuthGuard.mapRoles('ADMIN')).toEqual(['ADMIN']);
    });
    it('returns empty array for unknown role name', () => {
      expect(UmsAuthGuard.mapRoles('SUPERUSER')).toEqual([]);
    });
  });

  describe('canActivate identity binding', () => {
    let guard: UmsAuthGuard;
    let mockCtx: any;
    let mockRequest: any;

    beforeEach(() => {
      guard = new UmsAuthGuard();
      mockRequest = { headers: {}, path: '/api/v1/employees' };
      mockCtx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
      };
      
      // Default to returning null on all DB lookups to require explicit mocking per test
      mockDbFirst.mockResolvedValue(null);
      mockDbUpdate.mockResolvedValue(null);
      
      vi.clearAllMocks();
    });

    it('CASE A: Existing Employee with matching umsUserId authenticates normally', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'ums_uuid_1', email: 'test@example.com' } } }),
      } as any);

      // 1st call: lookup by umsUserId -> returns Employee A
      // 2nd call: lookup by email -> returns Employee A (same ID)
      mockDbFirst
        .mockResolvedValueOnce({ id: 'emp_1', umsUserId: 'ums_uuid_1', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' })
        .mockResolvedValueOnce({ id: 'emp_1', umsUserId: 'ums_uuid_1', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' });

      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(true);
      expect(mockRequest.user.userId).toBe('ums_uuid_1');
      expect(mockRequest.user.employeeId).toBe('emp_1');
    });

    it('CASE B: Existing Employee with NULL umsUserId + matching email -> binds UMS user ID safely', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'ums_uuid_2', email: 'unbound@example.com' } } }),
      } as any);

      // 1st call: lookup by umsUserId -> null
      // 2nd call: lookup by email -> returns Employee B (umsUserId: null)
      // 3rd call: reload after update -> returns Employee B
      mockDbFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'emp_2', umsUserId: null, email: 'unbound@example.com', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' })
        .mockResolvedValueOnce({ id: 'emp_2', umsUserId: 'ums_uuid_2', email: 'unbound@example.com', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' });

      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(true);
      
      expect(mockDbUpdate).toHaveBeenCalledWith({ umsUserId: 'ums_uuid_2' });
      expect(mockRequest.user.userId).toBe('ums_uuid_2');
    });

    it('CASE C: Employee email matches, but email is already bound to a DIFFERENT UMS user', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'malicious_ums_uuid', email: 'stolen@example.com' } } }),
      } as any);

      // 1st call: lookup by umsUserId -> null
      // 2nd call: lookup by email -> returns Employee B (bound to different umsUserId)
      mockDbFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'emp_2', umsUserId: 'legit_ums_uuid', email: 'stolen@example.com', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' });

      await expect(guard.canActivate(mockCtx)).rejects.toThrow(ForbiddenException);
    });

    it('CASE D: UMS user matches Employee A, but UMS email matches Employee B (Identity Conflict)', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'ums_uuid_1', email: 'stolen@example.com' } } }),
      } as any);

      // 1st call: lookup by umsUserId -> returns Employee A
      // 2nd call: lookup by email -> returns Employee B
      mockDbFirst
        .mockResolvedValueOnce({ id: 'emp_1', umsUserId: 'ums_uuid_1', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' })
        .mockResolvedValueOnce({ id: 'emp_2', umsUserId: null, role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' });

      await expect(guard.canActivate(mockCtx)).rejects.toThrow(ForbiddenException);
    });

    it('CASE E: No matching Employee by umsUserId or email throws WORKFORCE_ONBOARDING_REQUIRED', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'new_ums_uuid', email: 'new@example.com' } } }),
      } as any);

      // 1st call: lookup by umsUserId -> null
      // 2nd call: lookup by email -> null
      mockDbFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      try {
        await guard.canActivate(mockCtx);
        expect.fail('Should have thrown ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.getResponse()).toMatchObject({
          code: 'WORKFORCE_ONBOARDING_REQUIRED',
        });
      }
    });

    it('rejects concurrent duplicate binding (update fails)', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'ums_uuid_3', email: 'race@example.com' } } }),
      } as any);

      // 1st call: lookup by umsUserId -> null
      // 2nd call: lookup by email -> returns unbound Employee
      mockDbFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'emp_3', umsUserId: null, email: 'race@example.com', role: 'EMPLOYEE', isActive: true, organizationId: 'org_1' });

      // Update throws
      mockDbUpdate.mockRejectedValueOnce(new Error('Concurrent update violation'));

      try {
        await guard.canActivate(mockCtx);
        expect.fail('Should have thrown ForbiddenException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect(err.getResponse()).toMatchObject({
          code: 'IDENTITY_BINDING_FAILED',
        });
      }
    });
  });
});
