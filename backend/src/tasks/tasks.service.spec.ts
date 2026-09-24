import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
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
  const mEmployeeProject = {
    where: vi.fn(() => mEmployeeProject),
    first: vi.fn(),
    all: vi.fn(),
  };

  const mEmployee = {
    where: vi.fn(() => mEmployee),
    first: vi.fn(),
  };
  const mTaskDependency = {
    where: vi.fn(() => mTaskDependency),
    first: vi.fn(),
    create: vi.fn(),
  };

  return {
    db: {
      orm: {
        public: {
          Task: mTask,
          Project: mProject,
          EmployeeProject: mEmployeeProject,
          Employee: mEmployee,
          TaskDependency: mTaskDependency,
        },
      },
    },
  };
});

describe('TasksService', () => {
  let service: TasksService;
  const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: ['ADMIN'] };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByProject', () => {
    it('should list only active tasks by filtering isActive: true', async () => {
      const tasks = [{ id: 't1', name: 'Task 1' }];
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        all: vi.fn().mockResolvedValue(tasks)
      } as any);

      const result = await service.findAllByProject('p1', authCtx);

      expect(result).toEqual(tasks);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findAllByProject('p-none', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return active task by id', async () => {
      const activeTask = { id: 't1', projectId: 'p1', name: 'Task 1', status: 'TODO', isActive: true };
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(activeTask)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      const result = await service.findOne('t1', authCtx);

      expect(result).toEqual(activeTask);
    });

    it('should return inactive task by id', async () => {
      const inactiveTask = { id: 't2', projectId: 'p1', name: 'Task 2', status: 'DONE', isActive: false };
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(inactiveTask)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      const result = await service.findOne('t2', authCtx);

      expect(result).toEqual(inactiveTask);
    });

    it('should throw NotFoundException if task does not exist', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('t-none', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if task project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't1', projectId: 'p1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('t1', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      name: 'New Task',
      description: 'Desc',
      status: 'TODO',
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
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 't-dup' })
      } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(ConflictException);
    });

    it('should create valid task', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const created = { id: 't1', projectId: 'p1', ...dto, isActive: true };
      vi.mocked(db.orm.public.Task.create).mockResolvedValueOnce(created as any);

      const result = await service.create('p1', dto, authCtx);
      expect(db.orm.public.Task.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'New Task',
        description: 'Desc',
        status: 'TODO',
        isActive: true,
        priority: 'MEDIUM',
        creatorId: 'e1'
      });
      expect(result).toEqual(created);
    });

    it('should handle nullable description and default isActive', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const created = { id: 't1', projectId: 'p1', name: 'T', description: null, status: 'TODO', isActive: true };
      vi.mocked(db.orm.public.Task.create).mockResolvedValueOnce(created as any);

      await service.create('p1', { name: 'T', description: null, status: 'TODO', isActive: true }, authCtx);
      expect(db.orm.public.Task.create).toHaveBeenCalledWith({
        projectId: 'p1',
        name: 'T',
        description: null,
        status: 'TODO',
        isActive: true,
        priority: 'MEDIUM',
        creatorId: 'e1'
      });
    });

    it('should throw NotFoundException if project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.create('p1', dto, { organizationId: 'org1', roles: ['ADMIN'] } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if startDate is after dueDate', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);

      const invalidDto = { ...dto, startDate: '2023-12-01T00:00:00.000Z', dueDate: '2023-11-01T00:00:00.000Z' };
      await expect(service.create('p1', invalidDto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if parent task is invalid', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValueOnce(null) // unique check
          .mockResolvedValueOnce(null) // parent task check
      } as any);

      await expect(service.create('p1', { ...dto, parentTaskId: 'invalid' }, authCtx)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const existing = {
      id: 't1',
      projectId: 'p1',
      name: 'Task 1',
      description: 'Desc',
      status: 'TODO',
      isActive: true,
    };

    it('should update name, description, status', async () => {
      const updateData = { name: 'N', description: 'D', status: 'S' };
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, ...updateData });
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      const result = await service.update('t1', updateData, authCtx);
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result!.name).toBe('N');
    });

    it('should update description to null', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, description: null });
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      await service.update('t1', { description: null }, authCtx);
      expect(mockUpdate).toHaveBeenCalledWith({ description: null });
    });

    it('should deactivate', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, isActive: false });
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);

      await service.update('t1', { isActive: false }, authCtx);
      expect(mockUpdate).toHaveBeenCalledWith({ isActive: false });
    });

    it('should throw NotFoundException if task project belongs to another organization', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      await expect(service.update('t1', { name: 'Task 2' }, { organizationId: 'org1', roles: ['ADMIN'] } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if task is its own parent', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);
      await expect(service.update('t1', { parentTaskId: 't1' }, authCtx)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addDependency', () => {
    it('should throw BadRequestException if task depends on itself', async () => {
      await expect(service.addDependency('t1', 't1', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for cross-project dependency', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn()
          .mockResolvedValueOnce({ id: 't1', projectId: 'p1' })
          .mockResolvedValueOnce({ id: 't2', projectId: 'p2' })
      } as any);

      await expect(service.addDependency('t1', 't2', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should create task dependency successfully', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn()
          .mockResolvedValueOnce({ id: 't1', projectId: 'p1' })
          .mockResolvedValueOnce({ id: 't2', projectId: 'p1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.TaskDependency.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);
      
      const created = { id: 'td1', predecessorId: 't1', successorId: 't2', type: 'FS' };
      vi.mocked(db.orm.public.TaskDependency.create).mockResolvedValueOnce(created as any);

      const result = await service.addDependency('t1', 't2', authCtx);
      expect(result).toEqual(created);
    });
  });
});
