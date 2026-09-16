import { Test, TestingModule } from '@nestjs/testing';
import { DevBypassGuard } from './dev-bypass.guard.js';
import { ExecutionContext } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        Employee: {
          where: vi.fn(() => ({ first: vi.fn() }))
        }
      }
    }
  }
}));

describe('DevBypassGuard', () => {
  let guard: DevBypassGuard;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DevBypassGuard],
    }).compile();
    guard = module.get<DevBypassGuard>(DevBypassGuard);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    const req = {
      path: '/api/v1/some-endpoint',
      headers,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as any;
  };

  it('1. development role override works when explicitly enabled', async () => {
    process.env.NODE_ENV = 'development';
    vi.mocked(db.orm.public.Employee.where).mockReturnValue({
      first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org1', isActive: true })
    } as any);

    const ctx = createMockContext({
      'x-dev-employee-id': 'e1',
      'x-dev-org-id': 'org1',
      'x-dev-roles': 'MANAGER, ADMIN'
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest() as any;
    expect(req.user.roles).toEqual(['MANAGER', 'ADMIN']);
  });

  it('2. production/default environment ignores or rejects it', async () => {
    process.env.NODE_ENV = 'production';
    
    const ctx = createMockContext({
      'x-dev-employee-id': 'e1',
      'x-dev-org-id': 'org1',
      'x-dev-roles': 'ADMIN'
    });

    const result = await guard.canActivate(ctx);
    // Guard must reject completely in production
    expect(result).toBe(false);
  });

  it('3. organization isolation remains intact', async () => {
    process.env.NODE_ENV = 'development';
    // Mock DB finding NO employee because org doesn't match
    vi.mocked(db.orm.public.Employee.where).mockReturnValue({
      first: vi.fn().mockResolvedValue(null)
    } as any);

    const ctx = createMockContext({
      'x-dev-employee-id': 'e1',
      'x-dev-org-id': 'wrong-org', // mismatch
      'x-dev-roles': 'ADMIN'
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(false);
  });
});
