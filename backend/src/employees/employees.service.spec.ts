import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => {
  const mEmp = {
    all: vi.fn(),
    where: vi.fn(() => mEmp),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
    orderBy: vi.fn(() => mEmp),
    limit: vi.fn(() => mEmp),
    offset: vi.fn(() => mEmp),
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
      providers: [EmployeesService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { organizationId: 'org1', employeeCode: 'E1', name: 'John', email: 'j@example.com', isActive: true };

    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: 'ums-user-123' } }),
      }) as any;
    });

    it('should create employee without teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'e1', ...dto, organizationId: 'org-1', umsUserId: 'ums-user-123' } as any);

      const result = await service.create(dto, 'org-1', 'fake-token');
      expect(result.id).toBe('e1');
    });

    it('should create employee with null teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'e1', ...dto, organizationId: 'org-1', teamId: null } as any);

      const result = await service.create({ ...dto, teamId: null }, 'org-1', 'fake-token');
      expect(result.id).toBe('e1');
    });

    it('should create employee with valid teamId', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org-1' } as any);
      vi.mocked(db.orm.public.Employee.create).mockResolvedValueOnce({ id: 'e1', ...dto, organizationId: 'org-1', teamId: 't1' } as any);

      const result = await service.create({ ...dto, teamId: 't1' }, 'org-1', 'fake-token');
      expect(result.id).toBe('e1');
    });

    it('should throw NotFoundException if team points to missing Team', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);

      await expect(service.create({ ...dto, teamId: 't1' }, 'org-1', 'fake-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if team belongs to another organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null); // Because we check { id: 't1', organizationId: 'org-1' }

      await expect(service.create({ ...dto, teamId: 't1' }, 'org-1', 'fake-token')).rejects.toThrow(NotFoundException);
    });

    it('existing duplicate employeeCode behavior still works', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org-1' } as any);
      
      vi.mocked(db.orm.public.Employee.first)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'e-dup' } as any); // code check

      await expect(service.create({ ...dto, teamId: 't1', employeeCode: 'DUP' }, 'org-1', 'fake-token')).rejects.toThrow(ConflictException);
    });

    it('existing duplicate email behavior still works', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org-1' } as any);
      
      vi.mocked(db.orm.public.Employee.first)
        .mockResolvedValueOnce({ id: 'e-dup' } as any) // email check
        .mockResolvedValueOnce(null); // code check

      await expect(service.create({ ...dto, teamId: 't1', email: 'dup@example.com' }, 'org-1', 'fake-token')).rejects.toThrow(ConflictException);
    });
    it('should throw NotFoundException if UMS user not found', async () => {
      global.fetch = vi.fn().mockResolvedValue({ status: 404 }) as any;
      
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-1' }),
      } as any);

      await expect(service.create(dto, 'org-1', 'fake-token')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate umsUserId in organization', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-1' }),
      } as any);
      
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e-dup', umsUserId: 'ums-user-123' }),
      } as any);

      await expect(service.create(dto, 'org-1', 'fake-token')).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const updateDto = { name: 'Jane' };

    it('update employee without teamId should leave existing team unchanged', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'e1', ...updateDto, teamId: 't-old' });
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1', teamId: 't-old' }),
        update: mockUpdate
      } as any);

      const result = await service.update('e1', updateDto, 'org-1');
      expect(result!.teamId).toBe('t-old');
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
      expect(result!.teamId).toBe('t1');
    });

    it('set teamId to null', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'e1', ...updateDto, teamId: null });
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1' }),
        update: mockUpdate
      } as any);

      const result = await service.update('e1', { ...updateDto, teamId: null }, 'org-1');
      expect(result!.teamId).toBe(null);
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
        first: vi.fn().mockResolvedValue({ id: 'e-dup', organizationId: 'org-1' })
      } as any);

      await expect(service.update('e1', { ...updateDto, email: '2@a.com' }, 'org-1')).rejects.toThrow(ConflictException);
    });

    it('rejects email update if email exists in another organization', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org-1', email: '1@a.com' })
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e-dup', organizationId: 'org-2', email: '2@a.com' })
      } as any);

      await expect(service.update('e1', { email: '2@a.com' }, 'org-1', 'admin')).rejects.toThrow('already assigned to another organization');
    });
    it('prevents self-role escalation', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'emp1',
          organizationId: 'org1',
          role: 'MANAGER',
          email: 'test@example.com',
          employeeCode: 'EMP001',
        })
      } as any);

      await expect(service.update('emp1', { role: 'ADMIN' }, 'org1', 'emp1')).rejects.toThrow(ForbiddenException);
    });

    it('prevents self-deactivation', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'emp1',
          organizationId: 'org1',
          isActive: true,
        })
      } as any);

      await expect(service.update('emp1', { isActive: false }, 'org1', 'emp1')).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to change another employees role', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 'emp2',
          organizationId: 'org1',
          role: 'EMPLOYEE',
          email: 'test@example.com',
          employeeCode: 'EMP001',
        }),
        update: vi.fn().mockResolvedValue({ id: 'emp2', role: 'MANAGER' })
      } as any);

      const result = await service.update('emp2', { role: 'MANAGER' }, 'org1', 'adminEmp1');
      expect(result).toEqual({ id: 'emp2', role: 'MANAGER' });
      expect(db.orm.public.Employee.where).toHaveBeenCalledWith({ id: 'emp2' });
    });
  });

  describe('read', () => {
    const adminAuth = { employeeId: 'admin1', organizationId: 'org1', roles: ['ADMIN'] } as any;
    const mgrAuth = { employeeId: 'm1', organizationId: 'org1', roles: ['MANAGER'] } as any;

    it('findAll returns all employees for ADMIN', async () => {
      const employees = [{ id: 'e1', name: 'User 1' }];
      vi.mocked(db.orm.public.Employee.where)
        .mockReturnValueOnce({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(employees)
              }))
            }))
          }))
        } as any)
        .mockReturnValueOnce({
          aggregate: vi.fn(() => Promise.resolve({ count: 1 }))
        } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        select: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([])
        }))
      } as any);

      const result = await service.findAll(adminAuth, 1, 50);
      expect(result.data.length).toBe(1);
    });

    it('findAll returns only managed team members for MANAGER', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ id: 't1', managerId: 'm1' }])
      } as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([{ id: 't1', name: 'Team 1', managerId: 'm1' }])
        }))
      } as any);

      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        where: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([{ id: 'e1', teamId: 't1' }])
        }))
      } as any);

      const result = await service.findAll(mgrAuth, 1, 50);
      expect(result.data.length).toBe(1);
    });

    it('findOne allows MANAGER to view managed team member', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e1', organizationId: 'org1', teamId: 't1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 't1', managerId: 'm1' })
      } as any);

      const emp = await service.findOne('e1', mgrAuth);
      expect(emp.id).toBe('e1');
    });

    it('findOne throws ForbiddenException for MANAGER viewing employee of another team', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'e2', organizationId: 'org1', teamId: 't2' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('e2', mgrAuth)).rejects.toThrow(ForbiddenException);
    });
  });
});
