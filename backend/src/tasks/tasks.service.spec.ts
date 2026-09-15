import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mTask = {
    all: vi.fn(),
    where: vi.fn(() => mTask),
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
          Task: mTask,
          Project: mProject,
        },
      },
    },
  };
});

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByProject', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };

    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.findAllByProject('p1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should list only active tasks by filtering isActive: true', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      const activeTasks = [{ id: 't1', name: 'Task 1', projectId: 'p1', status: 'TODO', isActive: true }];
      vi.mocked(db.orm.public.Task.where).mockReturnValueOnce(db.orm.public.Task as any);
      vi.mocked(db.orm.public.Task.all).mockResolvedValueOnce(activeTasks as any);

      const result = await service.findAllByProject('p1', authCtx);

      expect(db.orm.public.Task.where).toHaveBeenCalledWith({ projectId: 'p1', isActive: true });
      expect(result).toEqual(activeTasks);
    });

    it('should throw NotFoundException if project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org2' } as any);
      await expect(service.findAllByProject('p1', { organizationId: 'org1' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };

    it('should return active task by id', async () => {
      const task = { id: 't1', name: 'Task 1', projectId: 'p1', status: 'TODO', isActive: true };
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(task as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);

      const result = await service.findOne('t1', authCtx);
      expect(result).toEqual(task);
    });

    it('should return inactive task by id', async () => {
      const inactiveTask = { id: 't2', name: 'Task 2', projectId: 'p1', status: 'DONE', isActive: false };
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(inactiveTask as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);

      const result = await service.findOne('t2', authCtx);
      expect(result).toEqual(inactiveTask);
    });

    it('should throw NotFoundException if missing task', async () => {
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(null);
      await expect(service.findOne('t-missing', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if task project belongs to another organization', async () => {
      const task = { id: 't1', name: 'Task 1', projectId: 'p1' };
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(task as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org2' } as any); // different org

      await expect(service.findOne('t1', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
    const dto = {
      name: 'New Task',
      description: 'Desc',
      status: 'TODO',
    };

    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project is inactive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: false, organizationId: 'org1' } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce({ id: 't-dup' } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(ConflictException);
    });

    it('should create valid task', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(null);

      const created = { id: 't1', projectId: 'p1', ...dto, isActive: true };
      vi.mocked(db.orm.public.Task.create).mockResolvedValueOnce(created as any);

      const result = await service.create('p1', dto, authCtx);
      expect(db.orm.public.Task.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'New Task',
        description: 'Desc',
        status: 'TODO',
        isActive: true,
      });
      expect(result).toEqual(created);
    });

    it('should handle nullable description and default isActive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(null);

      const created = { id: 't1', projectId: 'p1', name: 'T', description: null, status: 'TODO', isActive: true };
      vi.mocked(db.orm.public.Task.create).mockResolvedValueOnce(created as any);

      await service.create('p1', { name: 'T', description: null, status: 'TODO' }, authCtx);
      expect(db.orm.public.Task.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'T',
        description: null,
        status: 'TODO',
        isActive: true,
      });
    });

    it('should throw NotFoundException if project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org2' } as any);
      await expect(service.create('p1', dto, { organizationId: 'org1' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
    const existing = {
      id: 't1',
      projectId: 'p1',
      name: 'Task 1',
      description: 'Desc',
      status: 'TODO',
      isActive: true,
    };

    it('should throw NotFoundException if missing task', async () => {
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(null);
      await expect(service.update('t1', { name: 'N' }, authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate name', async () => {
      vi.mocked(db.orm.public.Task.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce({ id: 't2' } as any); // duplicate name found
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);

      await expect(service.update('t1', { name: 'Task 2' }, authCtx)).rejects.toThrow(ConflictException);
    });

    it('should update name, description, status', async () => {
      vi.mocked(db.orm.public.Task.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);

      const updateData = { name: 'N', description: 'D', status: 'S' };
      vi.mocked(db.orm.public.Task.update).mockResolvedValueOnce({ ...existing, ...updateData } as any);

      const result = await service.update('t1', updateData, authCtx);
      expect(db.orm.public.Task.update).toHaveBeenCalledWith(updateData);
      expect(result.name).toBe('N');
    });

    it('should update description to null', async () => {
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(existing as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Task.update).mockResolvedValueOnce({ ...existing, description: null } as any);

      await service.update('t1', { description: null }, authCtx);
      expect(db.orm.public.Task.update).toHaveBeenCalledWith({ description: null });
    });

    it('should deactivate', async () => {
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(existing as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Task.update).mockResolvedValueOnce({ ...existing, isActive: false } as any);

      await service.update('t1', { isActive: false }, authCtx);
      expect(db.orm.public.Task.update).toHaveBeenCalledWith({ isActive: false });
    });

    it('should reactivate', async () => {
      const inactive = { ...existing, isActive: false };
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(inactive as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Task.update).mockResolvedValueOnce({ ...inactive, isActive: true } as any);

      await service.update('t1', { isActive: true }, authCtx);
      expect(db.orm.public.Task.update).toHaveBeenCalledWith({ isActive: true });
    });

    it('should throw NotFoundException if task project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Task.first).mockResolvedValueOnce(existing as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org2' } as any);
      await expect(service.update('t1', { name: 'Task 2' }, { organizationId: 'org1' } as any)).rejects.toThrow(NotFoundException);
    });
  });
});
