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
      providers: [TeamsService],
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
      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1' } as any);
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if manager not found', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);

      await expect(service.create({ ...dto, managerId: 'm1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if manager inactive', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: false } as any);

      await expect(service.create({ ...dto, managerId: 'm1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if manager from another organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, organizationId: 'org2' } as any);

      await expect(service.create({ ...dto, managerId: 'm1' }, 'org1')).rejects.toThrow(BadRequestException);
    });

    it('should create team successfully with valid manager', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, organizationId: 'org1' } as any);
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

    it('should allow clearing manager with null', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.update).mockResolvedValueOnce({ id: 't1', managerId: null } as any);

      const result = await service.update('t1', { managerId: null }, 'org1');
      expect(result.managerId).toBeNull();
    });

    it('should validate manager properly', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, organizationId: 'org2' } as any);
      await expect(service.update('t1', { managerId: 'm1' }, 'org1')).rejects.toThrow(BadRequestException);
    });

    it('should update successfully', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.update).mockResolvedValueOnce({ id: 't1', name: 'Team A' } as any);
      const result = await service.update('t1', { name: 'Team A' }, 'org1');
      expect(result.name).toBe('Team A');
    });
  });

  describe('read', () => {
    it('should list teams', async () => {
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

      const result = await service.findAll('org1', 1, 50);

      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ organizationId: 'org1' });
      expect(result.data).toEqual(teams);
      expect(result.meta.total).toBe(1);
    });

    it('should get team by id', async () => {
      const team = { id: 't1', name: 'Team A' };
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(team)
      } as any);

      const result = await service.findOne('t1', 'org1');
      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ id: 't1', organizationId: 'org1' });
      expect(result).toEqual(team);
    });

    it('should throw 404 for non-existing team', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.findOne('t1', 'org1')).rejects.toThrow(NotFoundException);
    });
  });
});
