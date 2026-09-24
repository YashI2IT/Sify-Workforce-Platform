import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { TeamsService } from './teams.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => {
  const mTeam = {
    all: vi.fn(),
    where: vi.fn(() => mTeam),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mOrg = {
    where: vi.fn(() => mOrg),
    first: vi.fn(),
  };
  const mEmp = {
    where: vi.fn(() => mEmp),
    first: vi.fn(),
  };

  return {
    db: {
      orm: {
        public: {
          Team: mTeam,
          Organization: mOrg,
          Employee: mEmp,
        }
      }
    }
  };
});

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TeamsService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { organizationId: 'org1', name: 'Team A' };

    it('should throw NotFoundException if organization not found', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce(null);
      await expect(service.create(dto, 'org1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1' } as any);
      await expect(service.create(dto, 'org1')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if manager not found', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);

      await expect(service.create({ ...dto, managerId: 'm1' }, 'org1')).rejects.toThrow(NotFoundException);
    });

    it('13. ADMIN cannot assign inactive MANAGER', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: false, role: 'MANAGER', organizationId: 'org1' } as any);

      await expect(service.create({ ...dto, managerId: 'm1' }, 'org1')).rejects.toThrow(BadRequestException);
    });

    it('14. ADMIN cannot assign MANAGER from another organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, role: 'MANAGER', organizationId: 'org2' } as any);

      await expect(service.create({ ...dto, managerId: 'm1' }, 'org1')).rejects.toThrow(BadRequestException);
    });

    it('11. ADMIN cannot assign EMPLOYEE as manager', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, role: 'EMPLOYEE', organizationId: 'org1' } as any);

      await expect(service.create({ ...dto, managerId: 'm1' }, 'org1')).rejects.toThrow(BadRequestException);
    });

    it('12. ADMIN cannot assign ADMIN as manager', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, role: 'ADMIN', organizationId: 'org1' } as any);

      await expect(service.create({ ...dto, managerId: 'm1' }, 'org1')).rejects.toThrow(BadRequestException);
    });

    it('10. ADMIN can assign active MANAGER from same organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, role: 'MANAGER', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.create).mockResolvedValueOnce({ id: 't1', ...dto, managerId: 'm1', organizationId: 'org1' } as any);

      const result = await service.create({ ...dto, managerId: 'm1' }, 'org1');
      expect(result.id).toBe('t1');
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if team not found', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      await expect(service.update('t1', { name: 'A' }, 'org1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updating to duplicate name', async () => {
      vi.mocked(db.orm.public.Team.first)
        .mockResolvedValueOnce({ id: 't1', name: 'Old', organizationId: 'org1' } as any) // find team
        .mockResolvedValueOnce({ id: 't2', name: 'New' } as any); // duplicate check

      await expect(service.update('t1', { name: 'New' }, 'org1')).rejects.toThrow(ConflictException);
    });

    it('15. ADMIN can clear managerId with null', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.update).mockResolvedValueOnce({ id: 't1', managerId: null } as any);

      const result = await service.update('t1', { managerId: null }, 'org1');
      expect(result!.managerId).toBeNull();
    });

    it('16. ADMIN can change from Manager A to Manager B', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, role: 'MANAGER', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.update).mockResolvedValueOnce({ id: 't1', name: 'Team A', managerId: 'm1' } as any);
      const result = await service.update('t1', { name: 'Team A', managerId: 'm1' }, 'org1');
      expect(result!.name).toBe('Team A');
    });
  });

  describe('read', () => {
    const adminAuth = { employeeId: 'admin1', organizationId: 'org1', roles: ['ADMIN'] } as any;
    const mgrAuth = { employeeId: 'm1', organizationId: 'org1', roles: ['MANAGER'] } as any;

    it('should list teams for admin', async () => {
      const teams = [{ id: 't1', name: 'Team A' }];
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(teams)
            }))
          }))
        }))
      } as any);
      vi.mocked(db.orm.public.Team.all).mockResolvedValueOnce(teams as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        select: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([])
        }))
      } as any);

      const result = await service.findAll(adminAuth, 1, 50);

      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ organizationId: 'org1' });
      expect(result.data).toEqual([{ id: 't1', name: 'Team A', memberCount: 0 }]);
      expect(result.meta.total).toBe(1);
    });

    it('should list managed teams for manager', async () => {
      const teams = [{ id: 't1', name: 'Team A', managerId: 'm1' }];
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(teams)
            }))
          }))
        }))
      } as any);
      vi.mocked(db.orm.public.Team.all).mockResolvedValueOnce(teams as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        select: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([{ id: 'e1', teamId: 't1' }])
        }))
      } as any);

      const result = await service.findAll(mgrAuth, 1, 50);

      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ organizationId: 'org1', managerId: 'm1' });
      expect(result.data).toEqual([{ id: 't1', name: 'Team A', managerId: 'm1', memberCount: 1 }]);
    });

    it('should get team by id for authorized user', async () => {
      const team = { id: 't1', name: 'Team A', managerId: 'm1' };
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(team)
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValueOnce({
        all: vi.fn().mockResolvedValue([{ id: 'e1' }])
      } as any);

      const result = await service.findOne('t1', adminAuth);
      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ id: 't1', organizationId: 'org1' });
      expect(result).toEqual({ ...team, memberCount: 1 });
    });

    it('should throw 404 for non-existing team', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.findOne('t1', adminAuth)).rejects.toThrow(NotFoundException);
    });
  });
});
