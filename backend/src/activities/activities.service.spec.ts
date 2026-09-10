import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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

  return {
    db: {
      orm: {
        public: {
          Activity: mActivity,
          Project: mProject,
        },
      },
    },
  };
});

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivitiesService],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByProject', () => {
    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.findAllByProject('p1')).rejects.toThrow(NotFoundException);
    });

    it('should list only active activities by filtering isActive: true', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true } as any);
      const activeActivities = [{ id: 'a1', name: 'Activity 1', projectId: 'p1', isActive: true }];
      vi.mocked(db.orm.public.Activity.where).mockReturnValueOnce(db.orm.public.Activity as any);
      vi.mocked(db.orm.public.Activity.all).mockResolvedValueOnce(activeActivities as any);

      const result = await service.findAllByProject('p1');

      expect(db.orm.public.Activity.where).toHaveBeenCalledWith({ projectId: 'p1', isActive: true });
      expect(result).toEqual(activeActivities);
    });
  });

  describe('findOne', () => {
    it('should return active activity by id', async () => {
      const activity = { id: 'a1', name: 'Activity 1', isActive: true };
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(activity as any);

      const result = await service.findOne('a1');
      expect(result).toEqual(activity);
    });

    it('should return inactive activity by id', async () => {
      const inactiveActivity = { id: 'a2', name: 'Activity 2', isActive: false };
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(inactiveActivity as any);

      const result = await service.findOne('a2');
      expect(result).toEqual(inactiveActivity);
    });

    it('should throw NotFoundException if missing activity', async () => {
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(null);
      await expect(service.findOne('a-missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      name: 'New Activity',
      description: 'Desc',
    };

    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.create('p1', dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project is inactive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: false } as any);
      await expect(service.create('p1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true } as any);
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce({ id: 'a-dup' } as any);
      await expect(service.create('p1', dto)).rejects.toThrow(ConflictException);
    });

    it('should create valid activity', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true } as any);
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(null);

      const created = { id: 'a1', projectId: 'p1', ...dto, isActive: true };
      vi.mocked(db.orm.public.Activity.create).mockResolvedValueOnce(created as any);

      const result = await service.create('p1', dto);
      expect(db.orm.public.Activity.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'New Activity',
        description: 'Desc',
        isActive: true,
      });
      expect(result).toEqual(created);
    });

    it('should handle nullable description and default isActive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true } as any);
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(null);

      const created = { id: 'a1', projectId: 'p1', name: 'A', description: null, isActive: true };
      vi.mocked(db.orm.public.Activity.create).mockResolvedValueOnce(created as any);

      await service.create('p1', { name: 'A', description: null });
      expect(db.orm.public.Activity.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'A',
        description: null,
        isActive: true,
      });
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

    it('should throw NotFoundException if missing activity', async () => {
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(null);
      await expect(service.update('a1', { name: 'N' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Activity.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce({ id: 'a2' } as any); // duplicate name found

      await expect(service.update('a1', { name: 'Activity 2' })).rejects.toThrow(ConflictException);
    });

    it('should update name, description', async () => {
      vi.mocked(db.orm.public.Activity.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(null);

      const updateData = { name: 'N', description: 'D' };
      vi.mocked(db.orm.public.Activity.update).mockResolvedValueOnce({ ...existing, ...updateData } as any);

      const result = await service.update('a1', updateData);
      expect(db.orm.public.Activity.update).toHaveBeenCalledWith(updateData);
      expect(result.name).toBe('N');
    });

    it('should update description to null', async () => {
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(existing as any);
      vi.mocked(db.orm.public.Activity.update).mockResolvedValueOnce({ ...existing, description: null } as any);

      await service.update('a1', { description: null });
      expect(db.orm.public.Activity.update).toHaveBeenCalledWith({ description: null });
    });

    it('should deactivate', async () => {
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(existing as any);
      vi.mocked(db.orm.public.Activity.update).mockResolvedValueOnce({ ...existing, isActive: false } as any);

      await service.update('a1', { isActive: false });
      expect(db.orm.public.Activity.update).toHaveBeenCalledWith({ isActive: false });
    });

    it('should reactivate', async () => {
      const inactive = { ...existing, isActive: false };
      vi.mocked(db.orm.public.Activity.first).mockResolvedValueOnce(inactive as any);
      vi.mocked(db.orm.public.Activity.update).mockResolvedValueOnce({ ...inactive, isActive: true } as any);

      await service.update('a1', { isActive: true });
      expect(db.orm.public.Activity.update).toHaveBeenCalledWith({ isActive: true });
    });
  });
});
