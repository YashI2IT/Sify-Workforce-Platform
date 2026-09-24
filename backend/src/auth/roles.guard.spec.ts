import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from './roles.decorator.js';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (roles: string[] | null, requiredRoles: string[] | null): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: roles ? { roles } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('allows access if no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = mockContext(['EMPLOYEE'], null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects access if user is undefined or has no roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = mockContext(null, ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access if user has required role (ADMIN allows ADMIN)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = mockContext(['ADMIN'], ['ADMIN']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects access if user does not have required role (MANAGER rejected when required ADMIN)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = mockContext(['MANAGER'], ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects access if user does not have required role (EMPLOYEE rejected when required ADMIN)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = mockContext(['EMPLOYEE'], ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects access for unknown/invalid roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);
    const context = mockContext(['UNKNOWN'], ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows access if user has one of multiple required roles (MANAGER allows [ADMIN, MANAGER])', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MANAGER']);
    const context = mockContext(['MANAGER'], ['ADMIN', 'MANAGER']);
    expect(guard.canActivate(context)).toBe(true);
  });
});
