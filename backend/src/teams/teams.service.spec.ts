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

      await expect(service.create({ ...dto, managerId: 'm1' })).rejects.toThrow(BadRequestException);
    });

    it('should create team successfully with valid manager', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.create).mockResolvedValueOnce({ id: 't1', ...dto, managerId: 'm1' } as any);

      const result = await service.create({ ...dto, managerId: 'm1' });
      expect(result).toEqual({ id: 't1', ...dto, managerId: 'm1' });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if team not found', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      await expect(service.update('t1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updating to duplicate name', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1', name: 'Old' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't2' } as any); // existing duplicate
      await expect(service.update('t1', { name: 'New' })).rejects.toThrow(ConflictException);
    });

    it('should allow clearing manager with null', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.update).mockResolvedValueOnce({ id: 't1', managerId: null } as any);
      const result = await service.update('t1', { managerId: null });
      expect(result).toEqual({ id: 't1', managerId: null });
    });

    it('should validate manager properly', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, organizationId: 'org2' } as any);
      await expect(service.update('t1', { managerId: 'm1' })).rejects.toThrow(BadRequestException);
    });

    it('should update successfully', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'm1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Team.update).mockResolvedValueOnce({ id: 't1', managerId: 'm1' } as any);
      const result = await service.update('t1', { managerId: 'm1' });
      expect(result).toEqual({ id: 't1', managerId: 'm1' });
    });
  });

  describe('read', () => {
    it('should list teams', async () => {
      vi.mocked(db.orm.public.Team.all).mockResolvedValueOnce([{ id: 't1' }] as any);
      const result = await service.findAll();
      expect(result).toEqual([{ id: 't1' }]);
    });

    it('should get team by id', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1' } as any);
      const result = await service.findOne('t1');
      expect(result).toEqual({ id: 't1' });
    });

    it('should throw 404 for non-existing team', async () => {
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce(null);
      await expect(service.findOne('t1')).rejects.toThrow(NotFoundException);
    });
  });
});
