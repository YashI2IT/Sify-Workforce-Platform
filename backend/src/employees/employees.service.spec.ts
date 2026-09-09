import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => {
  const mEmp = {
    all: vi.fn(),
    where: vi.fn(() => mEmp),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mOrg = {
    where: vi.fn(() => mOrg),
    first: vi.fn(),
  };
  const mTeam = {
    where: vi.fn(() => mTeam),
    first: vi.fn(),
  };

  return {
    db: {
      orm: {
        public: {
          Employee: mEmp,
          Organization: mOrg,
          Team: mTeam,
        }
      }
    }
  };
});

describe('EmployeesService', () => {
  let service: EmployeesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeesService],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { organizationId: 'org1', employeeCode: 'E1', name: 'John', email: 'j@example.com', isActive: true };

    it('should create employee without teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // code
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // email
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'emp1', ...dto } as any);

      const result = await service.create(dto);
      expect(result).toEqual({ id: 'emp1', ...dto });
    });

    it('should create employee with null teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // code
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // email
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'emp1', ...dto, teamId: null } as any);

      const result = await service.create({ ...dto, teamId: null });
      expect(result).toEqual({ id: 'emp1', ...dto, teamId: null });
    });

    it('should create employee with valid teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // code
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // email
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'emp1', ...dto, teamId: 't1' } as any);

      const result = await service.create({ ...dto, teamId: 't1' });
      expect(result).toEqual({ id: 'emp1', ...dto, teamId: 't1' });
    });

    it('should throw NotFoundException if team points to missing Team', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);

      await expect(service.create({ ...dto, teamId: 't1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if team belongs to another organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org2' } as any);

      await expect(service.create({ ...dto, teamId: 't1' })).rejects.toThrow(BadRequestException);
    });

    it('existing duplicate employeeCode behavior still works', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp2' } as any); // existing code

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('existing duplicate email behavior still works', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null); // code pass
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp2' } as any); // existing email

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('update employee without teamId should leave existing team unchanged', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1', teamId: 'oldT' } as any);
      vi.mocked(db.orm.public.Employee.update).mockResolvedValueOnce({ id: 'emp1', teamId: 'oldT', name: 'NewName' } as any);

      const result = await service.update('emp1', { name: 'NewName' });
      expect(result).toEqual({ id: 'emp1', teamId: 'oldT', name: 'NewName' });
    });

    it('set teamId to valid Team', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.update).mockResolvedValueOnce({ id: 'emp1', teamId: 't1' } as any);

      const result = await service.update('emp1', { teamId: 't1' });
      expect(result).toEqual({ id: 'emp1', teamId: 't1' });
    });

    it('set teamId to null', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1', teamId: 't1' } as any);
      vi.mocked(db.orm.public.Employee.update).mockResolvedValueOnce({ id: 'emp1', teamId: null } as any);

      const result = await service.update('emp1', { teamId: null });
      expect(result).toEqual({ id: 'emp1', teamId: null });
    });

    it('should throw NotFoundException if team points to missing Team', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);

      await expect(service.update('emp1', { teamId: 't1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if team belongs to another organization', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org2' } as any);

      await expect(service.update('emp1', { teamId: 't1' })).rejects.toThrow(BadRequestException);
    });

    it('existing employeeCode/email uniqueness behavior still works', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1', employeeCode: 'E1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp2' } as any); // duplicate code
      await expect(service.update('emp1', { employeeCode: 'E2' })).rejects.toThrow(ConflictException);

      vi.clearAllMocks();
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp1', organizationId: 'org1', email: '1@a.com' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'emp2' } as any); // duplicate email
      await expect(service.update('emp1', { email: '2@a.com' })).rejects.toThrow(ConflictException);
    });
  });
});
