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
      providers: [OrganizationsService],
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

    it('creates organization and employee atomically', async () => {
      // Simulate no existing employee
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      // Simulate no existing organization code
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      vi.mocked(db.orm.public.Organization.create).mockResolvedValue({ id: 'org1', name: 'Org', code: 'ORG' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValue({ id: 'emp1', employeeCode: 'EMP-1', name: 'Test User', email: 'test@example.com', role: 'ADMIN' } as any);

      const result = await service.createOnboardingOrganization(umsUser, 'Org', 'ORG');
      expect(result.data.organization.id).toBe('org1');
      expect(result.data.employee.id).toBe('emp1');
      expect(result.data.role).toBe('ADMIN');
      expect(db.orm.public.Organization.create).toHaveBeenCalledWith({ name: 'Org', code: 'ORG' });
      expect(db.orm.public.Employee.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: 'org1',
        email: 'test@example.com',
        role: 'ADMIN',
        isActive: true,
      }));
    });

    it('throws ConflictException if employee already exists', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'emp1' })
      } as any);

      await expect(service.createOnboardingOrganization(umsUser, 'Org', 'ORG')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if organization code exists', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org2' })
      } as any);

      await expect(service.createOnboardingOrganization(umsUser, 'Org', 'ORG')).rejects.toThrow(ConflictException);
    });

    it('safely throws ConflictException on concurrent employee creation (P2002)', async () => {
      // Simulate BOTH checks returning null (race condition)
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      // Simulate Organization creation succeeding
      vi.mocked(db.orm.public.Organization.create).mockResolvedValue({ id: 'org1', name: 'Org', code: 'ORG' } as any);

      // Simulate Employee creation throwing unique constraint violation
      vi.mocked(db.orm.public.Employee.create).mockRejectedValue({ code: 'P2002' });

      await expect(service.createOnboardingOrganization(umsUser, 'Org', 'ORG')).rejects.toThrow(ConflictException);
      await expect(service.createOnboardingOrganization(umsUser, 'Org', 'ORG')).rejects.toThrowError('User already has an active Workforce Employee record');
    });
  });

  describe('updateCurrentOrganization', () => {
    const existing = { id: 'org1', name: 'Test Org', code: 'TEST' };

    it('should update organization name and code', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing).mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue({ ...existing, name: 'New Name', code: 'NEW' })
      } as any);

      const result = await service.updateCurrentOrganization('org1', { name: 'New Name', code: 'NEW' });
      expect(result.name).toBe('New Name');
      expect(result.code).toBe('NEW');
    });

    it('should throw ConflictException if duplicate code', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing).mockResolvedValueOnce({ id: 'org2' })
      } as any);

      await expect(service.updateCurrentOrganization('org1', { code: 'NEW' })).rejects.toThrow(ConflictException);
    });
  });
});
