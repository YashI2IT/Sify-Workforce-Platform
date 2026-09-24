import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => {
  const mOrg = {
    where: vi.fn(() => mOrg),
    first: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    orderBy: vi.fn(() => mOrg),
    all: vi.fn(),
  };

  const mEmp = {
    where: vi.fn(() => mEmp),
    first: vi.fn(),
    create: vi.fn(),
  };

  const txMock = {
    orm: {
      public: {
        Organization: mOrg,
        Employee: mEmp,
      }
    }
  };

  return {
    db: {
      orm: {
        public: {
          Organization: mOrg,
          Employee: mEmp,
        },
      },
      transaction: vi.fn(async (cb) => cb(txMock)),
    },
  };
});

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationsService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('getCurrentOrganization', () => {
    it('should return the organization', async () => {
      const org = { id: 'org1', name: 'Test Org' };
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(org)
      } as any);

      const result = await service.getCurrentOrganization('org1');
      expect(result).toEqual(org);
    });

    it('should throw NotFoundException if org does not exist', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.getCurrentOrganization('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOnboardingOrganization', () => {
    const umsUser = { id: 'ums1', email: 'test@example.com', name: 'Test User' };

    it('creates organization and first employee', async () => {
      // Simulate no existing employee
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      // Simulate no existing organization normalized name
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      // Mock creations
      vi.mocked(db.orm.public.Organization.create).mockResolvedValue({ id: 'org1', name: 'Org', normalizedName: 'org', organizationType: 'TECHNOLOGY', description: null } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValue({ id: 'emp1', employeeCode: 'EMP-1', name: 'Test', email: 'test@example.com' } as any);

      const result = await service.createOnboardingOrganization({ id: '1', email: 'test@example.com' }, 'Org', 'TECHNOLOGY');

      expect(result.data.organization.name).toBe('Org');
      expect(result.data.organization.organizationType).toBe('TECHNOLOGY');
      expect(db.orm.public.Organization.create).toHaveBeenCalledWith({ name: 'Org', normalizedName: 'org', organizationType: 'TECHNOLOGY', description: null });
      expect(db.orm.public.Employee.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'org1',
        email: 'test@example.com',
        role: 'ADMIN'
      }));
    });

    it('throws ConflictException if user already has an employee record', async () => {
      // Simulate existing employee
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'emp1' })
      } as any);

      await expect(service.createOnboardingOrganization({ id: '1', email: 'test@example.com' }, 'Org', 'TECHNOLOGY')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if organization normalized name exists', async () => {
      // Simulate no existing employee
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      // Simulate existing organization
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org1', name: 'Org', normalizedName: 'org' })
      } as any);

      await expect(service.createOnboardingOrganization({ id: '1', email: 'test@example.com' }, 'Org', 'TECHNOLOGY')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if unique constraint fails during transaction', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(db.orm.public.Organization.create).mockResolvedValue({ id: 'org1', name: 'Org', normalizedName: 'org', organizationType: 'TECHNOLOGY' } as any);
      
      // Simulate Prisma unique constraint error on Employee
      vi.mocked(db.orm.public.Employee.create).mockRejectedValue({ code: 'P2002' });

      await expect(service.createOnboardingOrganization({ id: '1', email: 'test@example.com' }, 'Org', 'TECHNOLOGY')).rejects.toThrow(ConflictException);
    });
  });

  describe('updateCurrentOrganization', () => {
    const existing = { id: 'org1', name: 'Test Org', normalizedName: 'test org', organizationType: 'TECHNOLOGY' };

    it('should update organization fields', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing).mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue({ ...existing, name: 'New Name', normalizedName: 'new name', organizationType: 'EDUCATION', description: 'desc' })
      } as any);

      const result = await service.updateCurrentOrganization('org1', 'actor1', { name: 'New Name', organizationType: 'EDUCATION', description: 'desc' });
      expect(result!.name).toBe('New Name');
      expect(result!.organizationType).toBe('EDUCATION');
      expect(result!.description).toBe('desc');
    });

    it('should throw ConflictException if duplicate normalized name', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing).mockResolvedValueOnce({ id: 'org2' })
      } as any);

      await expect(service.updateCurrentOrganization('org1', 'actor1', { name: 'New Name' })).rejects.toThrow(ConflictException);
    });
  });

  describe('getAvailableOrganizations', () => {
    it('should return available organizations', async () => {
      vi.mocked(db.orm.public.Organization.all).mockResolvedValueOnce([
        { id: 'org1', name: 'Org 1', organizationType: 'TECHNOLOGY' }
      ] as any);

      const result = await service.getAvailableOrganizations();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Org 1');
      expect(db.orm.public.Organization.orderBy).toHaveBeenCalled();
    });
  });

  describe('joinOrganization', () => {
    it('should throw ConflictException if user already has an employee record', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValueOnce({ id: 'emp1' })
      } as any);
      
      await expect(service.joinOrganization({ id: 'ums1', email: 'test@example.com' }, 'org1'))
        .rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if organization not found', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValueOnce(null)
      } as any);
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValueOnce(null)
      } as any);
      
      await expect(service.joinOrganization({ id: 'ums1', email: 'test@example.com' }, 'org1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should join organization and create employee', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValueOnce(null)
      } as any);
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValueOnce({ id: 'org1', name: 'Org 1', organizationType: 'TECHNOLOGY', description: null })
      } as any);

      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({
        id: 'emp1', employeeCode: 'EMP1', name: 'Test', email: 'test@example.com'
      } as any);

      const result = await service.joinOrganization({ id: 'ums1', email: 'test@example.com', name: 'Test' }, 'org1');
      expect(result.data.employee.email).toBe('test@example.com');
      expect(result.data.role).toBe('EMPLOYEE');
      expect(db.orm.public.Employee.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'org1',
        role: 'EMPLOYEE'
      }));
    });
  });

  describe('completeSetup', () => {
    it('should mark setup complete when org exists and not yet complete', async () => {
      const org = { id: 'org1', name: 'Test Org', isSetupComplete: false };
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(org),
        update: vi.fn().mockResolvedValue({ ...org, isSetupComplete: true }),
      } as any);

      const result = await service.completeSetup('org1');
      expect(result).toEqual({ success: true });
      expect(db.orm.public.Organization.where).toHaveBeenCalledWith({ id: 'org1' });
    });

    it('should return success without updating if already complete', async () => {
      const org = { id: 'org1', name: 'Test Org', isSetupComplete: true };
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(org),
        update: vi.fn(),
      } as any);

      const result = await service.completeSetup('org1');
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if org does not exist', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
      } as any);

      await expect(service.completeSetup('invalid')).rejects.toThrow(NotFoundException);
    });
  });
});
