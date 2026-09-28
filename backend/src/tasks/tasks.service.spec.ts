import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
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
    update: vi.fn(),
  };
  const mEmployeeProject = {
    where: vi.fn(() => mEmployeeProject),
    first: vi.fn(),
    all: vi.fn(),
  };

  const mTeam = {
    where: vi.fn(() => mTeam),
    all: vi.fn(),
  };

  const mEmployee = {
    where: vi.fn(() => mEmployee),
    first: vi.fn(),
    all: vi.fn(),
  };
  const mTaskDependency = {
    where: vi.fn(() => mTaskDependency),
    first: vi.fn(),
    create: vi.fn(),
  };
  const mTaskComment = {
    all: vi.fn(),
    where: vi.fn(() => mTaskComment),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  return {
    db: {
      transaction: vi.fn(async (cb) => cb({
        orm: {
          public: {
            Task: mTask,
            Project: mProject,
            EmployeeProject: mEmployeeProject,
            Employee: mEmployee,
            TaskDependency: mTaskDependency,
            TaskComment: mTaskComment,
          },
        },
      })),
      orm: {
        public: {
          Task: mTask,
          Project: mProject,
          EmployeeProject: mEmployeeProject,
          Employee: mEmployee,
          Team: mTeam,
          TaskDependency: mTaskDependency,
          TaskComment: mTaskComment,
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
      providers: [
        TasksService, 
        { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } },
        { provide: NotificationsService, useValue: { createNotification: vi.fn() } }
      ],
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
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

  describe('Task Mutation Access (RBAC)', () => {
    it('should reject EMPLOYEE from creating a task', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      
      const empAuth: AuthenticatedContext = { userId: 'u2', employeeId: 'e2', organizationId: 'org1', roles: ['EMPLOYEE'] };
      await expect(service.create('p1', { name: 'T1', status: 'TODO' }, empAuth))
        .rejects.toThrow('Only Admins and Managers can create new tasks');
    });

    it('should reject MANAGER from creating a task if not in project', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([])
      } as any);
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null) // Not assigned
      } as any);

      const mgrAuth: AuthenticatedContext = { userId: 'u3', employeeId: 'm1', organizationId: 'org1', roles: ['MANAGER'] };
      await expect(service.create('p1', { name: 'T1', status: 'TODO' }, mgrAuth))
        .rejects.toThrow('You are not authorized to modify tasks in this project');
    });

    it('should allow EMPLOYEE to update their own task progress', async () => {
      const task = { id: 't1', projectId: 'p1', name: 'Task', status: 'TODO', assigneeId: 'e2' };
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue(task)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ employeeId: 'e2', projectId: 'p1' })
      } as any);

      const empAuth: AuthenticatedContext = { userId: 'u2', employeeId: 'e2', organizationId: 'org1', roles: ['EMPLOYEE'] };
      const res = await service.update('t1', { status: 'IN_PROGRESS' }, empAuth);
      expect(res).toBeDefined();
    });

    it('should reject EMPLOYEE from renaming their own task', async () => {
      const task = { id: 't1', projectId: 'p1', name: 'Task', status: 'TODO', assigneeId: 'e2' };
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(task)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ employeeId: 'e2', projectId: 'p1' })
      } as any);

      const empAuth: AuthenticatedContext = { userId: 'u2', employeeId: 'e2', organizationId: 'org1', roles: ['EMPLOYEE'] };
      await expect(service.update('t1', { name: 'New Name' }, empAuth))
        .rejects.toThrow('Employees cannot rename tasks');
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

    it('should throw BadRequestException if project is inactive or completed', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: false, organizationId: 'org1' })
      } as any);
      await expect(service.create('p1', dto, authCtx)).rejects.toThrow(BadRequestException);

      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'COMPLETED', organizationId: 'org1' })
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1', code: 'PRJ', taskSequence: 1 }),
        update: vi.fn().mockResolvedValue([{ id: 'p1' }])
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
        creatorId: 'e1',
        recurrence: null,
        ticketId: 'PRJ-2'
      });
      expect(result).toEqual(created);
    });

    it('should handle nullable description and default isActive', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1', code: 'PRJ', taskSequence: 1 }),
        update: vi.fn().mockResolvedValue([{ id: 'p1' }])
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
        creatorId: 'e1',
        recurrence: null,
        ticketId: 'PRJ-2'
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

    it('should throw BadRequestException if updating a completed task', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ ...existing, status: 'COMPLETED' }),
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);

      await expect(service.update('t1', { name: 'New Name' }, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should update name, description, status', async () => {
      const updateData = { name: 'N', description: 'D', status: 'S' };
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, ...updateData });
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate,
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
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
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      await expect(service.update('t1', { parentTaskId: 't1' }, authCtx)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addDependency', () => {
    it('should throw BadRequestException if task depends on itself', async () => {
      await expect(service.addDependency('t1', 't1', 'FS', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for cross-project dependency', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn()
          .mockResolvedValueOnce({ id: 't1', projectId: 'p1', isActive: true })
          .mockResolvedValueOnce({ id: 't2', projectId: 'p2', isActive: true })
      } as any);

      await expect(service.addDependency('t1', 't2', 'FS', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should create task dependency successfully', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn()
          .mockResolvedValueOnce({ id: 't1', projectId: 'p1', isActive: true, ticketId: 'p1-1' })
          .mockResolvedValueOnce({ id: 't2', projectId: 'p1', isActive: true, ticketId: 'p1-2', assigneeId: 'e2' }),
        all: vi.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }])
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      
      const created = { id: 'td1', predecessorId: 't1', successorId: 't2', type: 'FS' };
      vi.mocked(db.orm.public.TaskDependency.create).mockResolvedValue(created as any);
      vi.mocked(db.orm.public.TaskDependency.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        join: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const result = await service.addDependency('t1', 't2', 'FS', authCtx);
      expect(result).toEqual(created);
    });

    it('should prevent dependency cycle', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn()
          .mockResolvedValueOnce({ id: 't1', projectId: 'p1', isActive: true })
          .mockResolvedValueOnce({ id: 't2', projectId: 'p1', isActive: true }),
        all: vi.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }])
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
      
      const mTaskDependency = {
        first: vi.fn().mockResolvedValue(null),
        join: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ predecessorId: 't2', successorId: 't1' }]),
      };
      (db.orm.public.TaskDependency as any) = mTaskDependency;
      
      await expect(service.addDependency('t1', 't2', 'FS', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should reject inactive tasks', async () => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn()
          .mockResolvedValueOnce({ id: 't1', projectId: 'p1', isActive: false })
          .mockResolvedValueOnce({ id: 't2', projectId: 'p1', isActive: true })
      } as any);

      await expect(service.addDependency('t1', 't2', 'FS', authCtx)).rejects.toThrow(BadRequestException);
    });
  });


  describe('Task Comments', () => {
    const mockTask = { id: 'task1', projectId: 'proj1' };
    const mockProject = { id: 'proj1', organizationId: 'org1' };
    const mockComment = { id: 'c1', taskId: 'task1', authorId: 'emp1', comment: 'Hello' };
    const authCtx: AuthenticatedContext = {
      organizationId: 'org1',
      employeeId: 'emp1',
      userId: 'ums1',
      roles: ['EMPLOYEE']
    };

    beforeEach(() => {
      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockTask)
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockProject)
      } as any);
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        where: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ employeeId: 'emp1', projectId: 'proj1' })
        })
      } as any);
    });

    beforeEach(() => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' })
      } as any);
    });

    it('addComment should create a comment', async () => {
      vi.mocked(db.orm.public.TaskComment.create).mockResolvedValue(mockComment as any);
      vi.mocked(db.orm.public.TaskComment.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
        first: vi.fn().mockResolvedValue(null)
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'emp1', name: 'John Doe' }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const result = await service.addComment('task1', 'Hello', authCtx);
      expect(result.comment).toBe('Hello');
      expect(result.author.name).toBe('John Doe');
      expect(db.orm.public.TaskComment.create).toHaveBeenCalledWith({
        taskId: 'task1',
        authorId: 'emp1',
        comment: 'Hello'
      });
    });

    it('getComments should return sorted comments with authors', async () => {
      vi.mocked(db.orm.public.TaskComment.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ ...mockComment, createdAt: new Date().toISOString() }])
      } as any);
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 'emp1', name: 'John Doe' }])
      } as any);

      const results = await service.getComments('task1', authCtx);
      expect(results.length).toBe(1);
      expect(results[0].author.name).toBe('John Doe');
    });

    it('editComment should throw if user is not author or admin', async () => {
      vi.mocked(db.orm.public.TaskComment.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ ...mockComment, authorId: 'other-emp' })
      } as any);

      await expect(service.editComment('task1', 'c1', 'Updated text', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('editComment should succeed if user is author', async () => {
      vi.mocked(db.orm.public.TaskComment.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockComment),
        update: vi.fn().mockResolvedValue({ ...mockComment, comment: 'Updated text' })
      } as any);

      const result = await service.editComment('task1', 'c1', 'Updated text', authCtx);
      expect(result!.comment).toBe('Updated text');
    });

    it('deleteComment should throw if not author or admin', async () => {
      vi.mocked(db.orm.public.TaskComment.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ ...mockComment, authorId: 'other-emp' })
      } as any);

      await expect(service.deleteComment('task1', 'c1', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('deleteComment should succeed if user is author', async () => {
      vi.mocked(db.orm.public.TaskComment.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockComment),
        delete: vi.fn().mockResolvedValue(true)
      } as any);

      const result = await service.deleteComment('task1', 'c1', authCtx);
      expect(result.success).toBe(true);
      expect(db.orm.public.TaskComment.where({ id: 'c1' }).delete).toHaveBeenCalled();
    });
  });

  describe('Task Recurrence', () => {
    it('generates the next task when a recurring task is completed', async () => {
      const mockRecurringTask = {
        id: 'rt1',
        projectId: 'p1',
        name: 'Weekly Sync',
        status: 'TODO',
        recurrence: 'WEEKLY',
        nextOccurrenceId: null,
        startDate: '2026-08-01T00:00:00.000Z',
        dueDate: '2026-08-01T23:59:59.000Z'
      };

      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockRecurringTask),
        update: vi.fn().mockResolvedValue({ ...mockRecurringTask, status: 'COMPLETED' })
      } as any);

      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', code: 'PRJ', taskSequence: 10, organizationId: 'org1' }),
        update: vi.fn().mockResolvedValue(true)
      } as any);

      vi.mocked(db.orm.public.Task.create).mockResolvedValueOnce({ id: 'gen-1', ticketId: 'PRJ-11' } as any);

      await service.update('rt1', { status: 'COMPLETED' }, authCtx);

      expect(db.transaction).toHaveBeenCalled();
    });

    it('does not generate duplicate occurrences', async () => {
      const mockRecurringTask = {
        id: 'rt1',
        projectId: 'p1',
        name: 'Weekly Sync',
        status: 'TODO',
        recurrence: 'WEEKLY',
        nextOccurrenceId: 'generated-task-id' // Already has an occurrence generated
      };

      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(mockRecurringTask),
        update: vi.fn().mockResolvedValue({ ...mockRecurringTask, status: 'COMPLETED' })
      } as any);

      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' }),
      } as any);

      await service.update('rt1', { status: 'COMPLETED' }, authCtx);

      expect(db.orm.public.Task.create).not.toHaveBeenCalled();
    });
  });
});
