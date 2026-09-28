import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mProject = {
    all: vi.fn(),
    where: vi.fn(() => mProject),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    aggregate: vi.fn(),
    orderBy: vi.fn(() => mProject),
    limit: vi.fn(() => mProject),
    offset: vi.fn(() => mProject),
  };
  const mRequirement = {
    where: vi.fn(() => mRequirement),
    create: vi.fn(),
    update: vi.fn(),
    orderBy: vi.fn(() => mRequirement),
    all: vi.fn(),
  };
  const mOrganization = {
    where: vi.fn(() => mOrganization),
    first: vi.fn(),
  };
  const mOrganizationSettings = {
    where: vi.fn(() => mOrganizationSettings),
    first: vi.fn(),
  };
  const mEmployeeProject = {
    where: vi.fn(() => mEmployeeProject),
    first: vi.fn(),
    all: vi.fn(),
  };
  const mProjectRequirement = {
    where: vi.fn(() => mProjectRequirement),
    first: vi.fn(),
    all: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    orderBy: vi.fn(() => mProjectRequirement),
  };
  const mMilestone = {
    create: vi.fn(),
  };
  const mTask = {
    where: vi.fn(() => mTask),
    all: vi.fn(),
  };
  const mTimeEntry = {
    where: vi.fn(() => mTimeEntry),
    all: vi.fn(),
  };

  return {
    db: {
      orm: {
        public: {
          Project: mProject,
          Organization: mOrganization,
          EmployeeProject: mEmployeeProject,
          ProjectRequirement: mProjectRequirement,
          Milestone: mMilestone,
          OrganizationSettings: mOrganizationSettings,
          Team: { where: vi.fn(() => ({ all: vi.fn().mockResolvedValue([]) })) },
          Employee: { where: vi.fn(() => ({ all: vi.fn().mockResolvedValue([]) })) },
          Task: mTask,
          TimeEntry: mTimeEntry,
        },
      },
    },
  };
});

describe('ProjectsService', () => {
  let service: ProjectsService;
  const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: ['ADMIN'] };
  const employeeAuthCtx: AuthenticatedContext = { userId: 'u2', employeeId: 'e2', organizationId: 'org1', roles: ['EMPLOYEE'] };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should list active projects for ADMIN', async () => {
      const projects = [{ id: 'p1', name: 'Portal' }];
      vi.mocked(db.orm.public.Project.where)
        .mockReturnValueOnce({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(projects)
              }))
            }))
          }))
        } as any)
        .mockReturnValueOnce({
          aggregate: vi.fn(() => Promise.resolve({ count: 1 }))
        } as any);

      const result = await service.findAll(authCtx, 1, 50);

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ organizationId: 'org1', isActive: true });
      expect(result.data).toEqual(projects);
      expect(result.meta.total).toBe(1);
    });

    it('should list assigned active projects for EMPLOYEE', async () => {
      const projects = [{ id: 'p1', name: 'Portal' }];
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ projectId: 'p1', employeeId: 'e2' }])
      } as any);
      const mockWhere = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue(projects)
            })
          })
        }),
        aggregate: vi.fn().mockResolvedValue({ count: 1 })
      });
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        where: mockWhere,
      } as any);

      const result = await service.findAll(employeeAuthCtx, 1, 50);

      expect(result.data).toEqual(projects);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return active project by id for ADMIN', async () => {
      const activeProject = { id: 'p1', name: 'Project 1', code: 'P1', status: 'ACTIVE', isActive: true };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(activeProject),
        count: vi.fn().mockResolvedValue(1)
      } as any);

      const result = await service.findOne('p1', authCtx);

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ id: 'p1', organizationId: 'org1' });
      expect(result).toEqual(activeProject);
    });

    it('should return project by id for assigned EMPLOYEE', async () => {
      const activeProject = { id: 'p1', name: 'Project 1', code: 'P1', status: 'ACTIVE', isActive: true };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(activeProject)
      } as any);
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ projectId: 'p1', employeeId: 'e2' }])
      } as any);

      const result = await service.findOne('p1', employeeAuthCtx);
      expect(result).toEqual(activeProject);
    });

    it('should throw NotFoundException for unassigned EMPLOYEE', async () => {
      const activeProject = { id: 'p1', name: 'Project 1', code: 'P1', status: 'ACTIVE', isActive: true };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(activeProject)
      } as any);
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([])
      } as any);

      await expect(service.findOne('p1', employeeAuthCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('p-none', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProjectHealth', () => {
    const mockTasks = [
      { id: 't1', name: 'Overdue Task', status: 'IN_PROGRESS', dueDate: '2000-01-01', estimatedHours: 5 },
      { id: 't2', name: 'Blocked Task', status: 'BLOCKED', dueDate: '2099-01-01', estimatedHours: 10 },
      { id: 't3', name: 'Due Soon Task', status: 'IN_PROGRESS', dueDate: new Date().toISOString().split('T')[0], estimatedHours: 2 },
      { id: 't4', name: 'Normal Task', status: 'COMPLETED', dueDate: '2000-01-01', estimatedHours: 1 }
    ];

    it('should aggregate factual project health', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', name: 'P1' })
      } as any);

      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        all: vi.fn().mockResolvedValue(mockTasks)
      } as any);

      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([
          { taskId: 't1', hours: 10 }, // exceeds estimated 5
          { taskId: 't2', hours: 2 }   // under estimated 10
        ])
      } as any);

      const result = await service.getProjectHealth('p1', authCtx);

      expect(result.overdueTasksCount).toBe(1);
      expect(result.overdueTasks[0].id).toBe('t1');
      expect(result.blockedTasksCount).toBe(1);
      expect(result.blockedTasks[0].id).toBe('t2');
      expect(result.dueSoonTasksCount).toBe(1);
      expect(result.dueSoonTasks[0].id).toBe('t3');
      expect(result.tasksExceedingEstimateCount).toBe(1);
      expect(result.tasksExceedingEstimate[0].id).toBe('t1');
    });

    it('should throw NotFound if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.getProjectHealth('p-none', authCtx)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { name: 'Alpha Project', code: 'ALPHA', status: 'PLANNING', isActive: true };

    it('should create project with explicit fields and default isActive to true', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // code check
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // name check
      } as any);
      vi.mocked(db.orm.public.Project.create).mockResolvedValueOnce({ id: 'p1', organizationId: 'org-1', ...dto, isActive: true } as any);

      const result = await service.create(dto, { organizationId: 'org-1', roles: ['ADMIN'], userId: 'u1', employeeId: 'e1' });

      expect(db.orm.public.Project.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Alpha Project',
        code: 'ALPHA',
        status: 'PLANNING',
        isActive: true,
        description: null
      });
      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.create(dto, { organizationId: 'org-none', roles: ['ADMIN'], userId: 'u1', employeeId: 'e1' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate project name in organization', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p2' }) // name exists
      } as any);

      await expect(service.create(dto, { organizationId: 'org-1', roles: ['ADMIN'], userId: 'u1', employeeId: 'e1' })).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if duplicate project code in organization', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // name ok
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p3' }) // code exists
      } as any);

      await expect(service.create(dto, { organizationId: 'org-1', roles: ['ADMIN'], userId: 'u1', employeeId: 'e1' })).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const existing = {
      id: 'p1',
      organizationId: 'org1',
      name: 'Alpha',
      code: 'ALPHA',
      status: 'PLANNING',
      isActive: true,
    };

    it('should deactivate a project (isActive: false)', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ...existing, isActive: false });
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate
      } as any);
      
      const result = await service.update('p1', { isActive: false }, 'org1');

      expect(mockUpdate).toHaveBeenCalledWith({ isActive: false });
      expect(result!.isActive).toBe(false);
    });

    it('should reactivate a project (isActive: true)', async () => {
      const inactive = { ...existing, isActive: false };
      const reactivated = { ...inactive, isActive: true };
      const mockUpdate = vi.fn().mockResolvedValue(reactivated);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(inactive),
        update: mockUpdate
      } as any);
      
      const result = await service.update('p1', { isActive: true }, 'org1');

      expect(mockUpdate).toHaveBeenCalledWith({ isActive: true });
      expect(result!.isActive).toBe(true);
    });

    it('should update allowed fields and keep organizationId immutable', async () => {
      const updatePayload = { name: 'Omega' };
      const updated = { ...existing, ...updatePayload };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing).mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue(updated)
      } as any);

      const result = await service.update('p1', updatePayload, 'org1');
      expect(result!.name).toBe('Omega');
    });

    it('should throw BadRequestException if startDate > endDate', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ ...existing, startDate: '2025-01-01', endDate: '2025-12-31' }),
      } as any);

      // Attempt to update endDate to before startDate
      await expect(service.update('p1', { endDate: '2024-01-01' }, 'org1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Project Requirements', () => {
    it('should create requirement for active project', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.ProjectRequirement.create).mockResolvedValue({ id: 'r1', projectId: 'p1', title: 'Req 1' } as any);

      const req = await service.createRequirement('p1', { title: 'Req 1' }, authCtx);
      expect(req.id).toBe('r1');
    });

    it('should throw ConflictException if creating requirement for inactive project', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: false, organizationId: 'org1' })
      } as any);

      await expect(service.createRequirement('p1', { title: 'Req 1' }, authCtx)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if creating requirement for COMPLETED project', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', isActive: true, status: 'COMPLETED', organizationId: 'org1' })
      } as any);

      await expect(service.createRequirement('p1', { title: 'Req 1' }, authCtx)).rejects.toThrow(ConflictException);
    });

    it('should retrieve requirements', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1' })
      } as any);
      vi.mocked(db.orm.public.ProjectRequirement.where).mockReturnValue({
        orderBy: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([{ id: 'r1', title: 'Req 1' }])
        }))
      } as any);

      const reqs = await service.findRequirements('p1', authCtx);
      expect(reqs).toEqual([{ id: 'r1', title: 'Req 1' }]);
    });
  });
});
