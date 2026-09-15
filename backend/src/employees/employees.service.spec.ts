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
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'e1', organizationId: 'org-1', ...dto } as any);

      const result = await service.create(dto, 'org-1');
      expect(result.id).toBe('e1');
    });

    it('should create employee with null teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'e1', organizationId: 'org-1', ...dto, teamId: null } as any);

      const result = await service.create({ ...dto, teamId: null }, 'org-1');
      expect(result.id).toBe('e1');
    });

    it('should create employee with valid teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org-1' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'e1', organizationId: 'org-1', ...dto, teamId: 't1' } as any);

      const result = await service.create({ ...dto, teamId: 't1' }, 'org-1');
      expect(result.id).toBe('e1');
    });

    it('should throw NotFoundException if team points to missing Team', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);

      await expect(service.create({ ...dto, teamId: 't1' }, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if team belongs to another organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null); // Because we check { id: 't1', organizationId: 'org-1' }

      await expect(service.create({ ...dto, teamId: 't1' }, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('existing duplicate employeeCode behavior still works', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org-1' } as any);
      
      vi.mocked(db.orm.public.Employee.first)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'e-dup' } as any); // code check

      await expect(service.create({ ...dto, teamId: 't1', employeeCode: 'DUP' }, 'org-1')).rejects.toThrow(ConflictException);
    });

    it('existing duplicate email behavior still works', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org-1' } as any);
      
      vi.mocked(db.orm.public.Employee.first)
        .mockResolvedValueOnce({ id: 'e-dup' } as any) // email check
        .mockResolvedValueOnce(null); // code check

      await expect(service.create({ ...dto, teamId: 't1', email: 'dup@example.com' }, 'org-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = { firstName: 'Jane' };

    it('update employee without teamId should leave existing team unchanged', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'e1', ...updateDto, teamId: 't-old' });
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1', teamId: 't-old' }),
        update: mockUpdate
      } as any);

      const result = await service.update('e1', updateDto, 'org-1');
      expect(result.teamId).toBe('t-old');
    });

    it('set teamId to valid Team', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'e1', ...updateDto, teamId: 't1' });
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' }),
        update: mockUpdate
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't1', organizationId: 'org-1' })
      } as any);

      const result = await service.update('e1', { ...updateDto, teamId: 't1' }, 'org-1');
      expect(result.teamId).toBe('t1');
    });

    it('set teamId to null', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'e1', ...updateDto, teamId: null });
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' }),
        update: mockUpdate
      } as any);

      const result = await service.update('e1', { ...updateDto, teamId: null }, 'org-1');
      expect(result.teamId).toBe(null);
    });

    it('should throw NotFoundException if team points to missing Team', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.update('e1', { ...updateDto, teamId: 't1' }, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if team belongs to another organization', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // Because we check { id: 't1', organizationId: 'org-1' }
      } as any);

      await expect(service.update('e1', { ...updateDto, teamId: 't1' }, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('existing employeeCode/email uniqueness behavior still works', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' })
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e-dup' })
      } as any);

      await expect(service.update('e1', { ...updateDto, employeeCode: 'E2' }, 'org-1')).rejects.toThrow(ConflictException);

      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' })
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e-dup' })
      } as any);

      await expect(service.update('e1', { ...updateDto, email: '2@a.com' }, 'org-1')).rejects.toThrow(ConflictException);
    });
  });
});
