import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from './auth.controller.js';
import { db } from '../prisma/db.js';

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        Employee: {
          where: vi.fn(),
        },
        Organization: {
          where: vi.fn(),
        },
      },
    },
  },
}));

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController();
  });

  describe('GET /auth/me', () => {
    it('returns unauthenticated response when neither req.user nor req.umsUser is present', async () => {
      const req = {};
      const res = await controller.getMe(req);

      expect(res).toEqual({
        data: {
          authenticated: false,
          onboardingRequired: false,
          roles: [],
        },
      });
    });

    it('returns onboardingRequired: true when UMS user has no Workforce employee', async () => {
      const req = {
        umsUser: { id: 'ums-uuid-1', email: 'newuser@example.com' },
        onboardingRequired: true,
        employee: null,
      };

      const res = await controller.getMe(req);

      expect(res).toEqual({
        data: {
          authenticated: true,
          onboardingRequired: true,
          employee: null,
          organization: null,
          roles: [],
          isInitialSetup: false,
          umsUserEmail: 'newuser@example.com',
        },
      });
    });

    it('returns employee, org, and roles for existing employee', async () => {
      const mockEmployee = {
        id: 'emp-1',
        organizationId: 'org-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'EMPLOYEE',
        isActive: true,
      };
      const mockOrg = {
        id: 'org-1',
        name: 'Acme Corp',
        isSetupComplete: true,
      };

      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockOrg),
      } as any);

      const req = {
        umsUser: { id: 'ums-uuid-2', email: 'jane@example.com' },
        onboardingRequired: false,
        employee: mockEmployee,
        roles: ['EMPLOYEE'],
      };

      const res = await controller.getMe(req);

      expect(res).toEqual({
        data: {
          authenticated: true,
          onboardingRequired: false,
          employee: mockEmployee,
          organization: mockOrg,
          roles: ['EMPLOYEE'],
          isInitialSetup: false,
          umsUserEmail: 'jane@example.com',
        },
      });
    });

    it('identifies initial setup required for ADMIN when org setup is incomplete', async () => {
      const mockAdmin = {
        id: 'emp-admin',
        organizationId: 'org-admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
      };
      const mockOrg = {
        id: 'org-admin',
        name: 'New Corp',
        isSetupComplete: false,
      };

      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockOrg),
      } as any);

      const req = {
        umsUser: { id: 'ums-uuid-admin', email: 'admin@example.com' },
        onboardingRequired: false,
        employee: mockAdmin,
        roles: ['ADMIN'],
      };

      const res = await controller.getMe(req);

      expect(res.data.isInitialSetup).toBe(true);
      expect(res.data.roles).toEqual(['ADMIN']);
      expect(res.data.onboardingRequired).toBe(false);
    });

    it('resolves employee and org in dev/bypass mode via req.user', async () => {
      const mockEmployee = {
        id: 'dev-emp-1',
        organizationId: 'dev-org-1',
        name: 'Dev Admin',
        email: 'dev@example.com',
        role: 'ADMIN',
        isActive: true,
      };
      const mockOrg = {
        id: 'dev-org-1',
        name: 'Dev Org',
        isSetupComplete: true,
      };

      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockEmployee),
      } as any);
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockOrg),
      } as any);

      const req = {
        user: {
          userId: 'dev-user',
          employeeId: 'dev-emp-1',
          organizationId: 'dev-org-1',
          roles: ['ADMIN'],
          email: 'dev@example.com',
        },
      };

      const res = await controller.getMe(req);

      expect(res.data.authenticated).toBe(true);
      expect(res.data.employee).toEqual(mockEmployee);
      expect(res.data.organization).toEqual(mockOrg);
      expect(res.data.roles).toEqual(['ADMIN']);
      expect(res.data.isInitialSetup).toBe(false);
    });
  });
});
