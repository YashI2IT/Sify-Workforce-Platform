import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UmsAuthGuard } from './ums-auth.guard.js';
import { ForbiddenException } from '@nestjs/common';

export const mockDbFirst = vi.fn().mockResolvedValue({ id: 'emp_id', organizationId: 'org_id', role: 'EMPLOYEE', isActive: true });

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        Employee: {
          where: () => ({
            first: mockDbFirst,
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
      expect(UmsAuthGuard.mapRoles('admin')).toEqual(['ADMIN']);
    });

    it('maps MANAGER role correctly', () => {
      expect(UmsAuthGuard.mapRoles('MANAGER')).toEqual(['MANAGER']);
      expect(UmsAuthGuard.mapRoles('manager')).toEqual(['MANAGER']);
    });

    it('maps EMPLOYEE role correctly', () => {
      expect(UmsAuthGuard.mapRoles('EMPLOYEE')).toEqual(['EMPLOYEE']);
      expect(UmsAuthGuard.mapRoles('employee')).toEqual(['EMPLOYEE']);
    });

    it('returns empty array when role is empty string (no role assigned)', () => {
      expect(UmsAuthGuard.mapRoles('')).toEqual([]);
    });

    it('returns empty array when role is null or undefined', () => {
      expect(UmsAuthGuard.mapRoles(null as any)).toEqual([]);
      expect(UmsAuthGuard.mapRoles(undefined as any)).toEqual([]);
    });

    it('returns empty array for unknown role name', () => {
      expect(UmsAuthGuard.mapRoles('SUPERUSER')).toEqual([]);
    });
  });

  describe('canActivate', () => {
    let guard: UmsAuthGuard;
    let mockCtx: any;
    let mockRequest: any;

    beforeEach(() => {
      guard = new UmsAuthGuard();
      mockRequest = { headers: {}, path: '/api/v1/employees' };
      mockCtx = {
        switchToHttp: () => ({ getRequest: () => mockRequest }),
      };
      mockDbFirst.mockResolvedValue({ id: 'emp_id', organizationId: 'org_id', role: 'EMPLOYEE', isActive: true });
      vi.clearAllMocks();
    });

    it('rejects request with no Authorization header', async () => {
      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(false);
    });

    it('rejects request with non-Bearer Authorization header', async () => {
      mockRequest.headers['authorization'] = 'Basic dXNlcjpwYXNz';
      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(false);
    });

    it('rejects when UMS returns invalid token', async () => {
      mockRequest.headers['authorization'] = 'Bearer invalid_token';
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: false } }),
      } as any);

      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(false);
    });

    it('rejects when UMS returns non-ok response', async () => {
      mockRequest.headers['authorization'] = 'Bearer expired_token';
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as any);

      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(false);
    });

    it('rejects when UMS fetch throws (network error)', async () => {
      mockRequest.headers['authorization'] = 'Bearer some_token';
      
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(false);
    });
    it('throws ForbiddenException when mapped roles are empty or unknown', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'uuid', email: 'test@example.com' } } }),
      } as any);

      // Simulate Employee with invalid role
      mockDbFirst.mockResolvedValueOnce({ id: 'emp_id', organizationId: 'org_id', role: 'INVALID_ROLE', isActive: true });

      await expect(guard.canActivate(mockCtx)).rejects.toThrow(ForbiddenException);
    });

    it('returns true and populates request.user for valid UMS user + existing Employee + valid role', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'ums_uuid', email: 'test@example.com', role: { roleName: 'EMPLOYEE' } } } }),
      } as any);

      const result = await guard.canActivate(mockCtx);
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        userId: 'ums_uuid',
        employeeId: 'emp_id',
        organizationId: 'org_id',
        roles: ['EMPLOYEE'],
      });
    });

    it('throws WORKFORCE_ONBOARDING_REQUIRED for valid UMS user + no Employee', async () => {
      mockRequest.headers['authorization'] = 'Bearer valid_token';
      
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { valid: true, user: { id: 'ums_uuid', email: 'test@example.com', role: { roleName: 'EMPLOYEE' } } } }),
      } as any);

      // Simulate no existing Employee in DB
      mockDbFirst.mockResolvedValueOnce(null);

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
  });
});
