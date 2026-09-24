import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mActivity = {
    all: vi.fn(),
    where: vi.fn(() => mActivity),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mProject = {
    where: vi.fn(() => mProject),
    first: vi.fn(),
  };
  const mEmployeeProject = {
    where: vi.fn(() => mEmployeeProject),
    first: vi.fn(),
    all: vi.fn(),
  };

  return {
    db: {
      orm: {
        public: {
          Activity: mActivity,
          Project: mProject,
          EmployeeProject: mEmployeeProject,
        },
      },
    },
  };
});

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: ['ADMIN'] };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivitiesService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByProject', () => {
    it('should list only active activities by filtering isActive: true', async () => {
      const activities = [{ id: 'a1', name: 'Activity 1' }];
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        all: vi.fn().mockResolvedValue(activities)
      } as any);

      const result = await service.findAllByProject('p1', authCtx);

      expect(result).toEqual(activities);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findAllByProject('p-none', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return active activity by id', async () => {
      const activeActivity = { id: 'a1', projectId: 'p1', name: 'Activity 1', isActive: true };
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(activeActivity)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      const result = await service.findOne('a1', authCtx);

      expect(result).toEqual(activeActivity);
    });

    it('should return inactive activity by id', async () => {
      const inactiveActivity = { id: 'a2', projectId: 'p1', name: 'Activity 2', isActive: false };
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(inactiveActivity)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      const result = await service.findOne('a2', authCtx);

      expect(result).toEqual(inactiveActivity);
    });

    it('should throw NotFoundException if activity does not exist', async () => {
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('a-none', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if activity project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'a1', projectId: 'p1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('a1', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      name: 'New Activity',
      description: 'Desc',
      isActive: true,
    };

    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project is inactive', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: false, organizationId: 'org1' })
      } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'a-dup' })
      } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(ConflictException);
    });

    it('should create valid activity', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const created = { id: 'a1', projectId: 'p1', ...dto, isActive: true };
      vi.mocked(db.orm.public.Activity.create).mockResolvedValueOnce(created as any);

      const result = await service.create('p1', dto, authCtx);
      expect(db.orm.public.Activity.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'New Activity',
        description: 'Desc',
        isActive: true,
      });
      expect(result).toEqual(created);
    });

    it('should handle nullable description and default isActive', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1', isActive: true })
      } as any);
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const created = { id: 'a1', projectId: 'p1', name: 'A', description: null, isActive: true };
      vi.mocked(db.orm.public.Activity.create).mockResolvedValueOnce(created as any);

      await service.create('p1', { name: 'A', description: null, isActive: true }, authCtx);
      expect(db.orm.public.Activity.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'A',
        description: null,
        isActive: true,
      });
    });

    it('should throw NotFoundException if project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.create('p1', dto, { organizationId: 'org1', roles: ['ADMIN'] } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existing = {
      id: 'a1',
      projectId: 'p1',
      name: 'Activity 1',
      description: 'Desc',
      isActive: true,
    };

    it('should update name, description', async () => {
      const updateData = { name: 'N', description: 'D' };
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, ...updateData });
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      const result = await service.update('a1', updateData, authCtx);
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result!.name).toBe('N');
    });

    it('should update description to null', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, description: null });
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      await service.update('a1', { description: null }, authCtx);
      expect(mockUpdate).toHaveBeenCalledWith({ description: null });
    });

    it('should deactivate', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, isActive: false });
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      await service.update('a1', { isActive: false }, authCtx);
      expect(mockUpdate).toHaveBeenCalledWith({ isActive: false });
    });

    it('should throw NotFoundException if activity project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.update('a1', { name: 'Activity 2' }, { organizationId: 'org1', roles: ['ADMIN'] } as any)).rejects.toThrow(NotFoundException);
    });
  });
});
