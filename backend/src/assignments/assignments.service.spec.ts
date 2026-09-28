import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mEmployeeProject = {
    all: vi.fn(),
    where: vi.fn(() => mEmployeeProject),
    first: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    include: vi.fn(() => mEmployeeProject),
  };
  const mProject = {
    where: vi.fn(() => mProject),
    first: vi.fn(),
  };
  const mEmployee = {
    where: vi.fn(() => mEmployee),
    first: vi.fn(),
  };
  const mTeam = {
    where: vi.fn(() => mTeam),
    first: vi.fn(),
  };
  const mOrganizationSettings = {
    where: vi.fn(() => mOrganizationSettings),
    first: vi.fn(),
  };

  return {
    db: {
      transaction: vi.fn(async (cb) => {
        return await cb({
          orm: {
            public: {
              EmployeeProject: mEmployeeProject,
              Project: mProject,
              Employee: mEmployee,
              Team: mTeam,
              OrganizationSettings: mOrganizationSettings,
            },
          },
        });
      }),
      orm: {
        public: {
          EmployeeProject: mEmployeeProject,
          Project: mProject,
          Employee: mEmployee,
          Team: mTeam,
          OrganizationSettings: mOrganizationSettings,
        },
      },
    },
  };
});

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: ['ADMIN'] };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } },
        { provide: NotificationsService, useValue: { createNotification: vi.fn() } },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Manager Assignment Authorization', () => {
    it('rejects MANAGER if employee not in their team', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.OrganizationSettings.first).mockResolvedValueOnce(null);
      // Target employee exists but no team
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'targetE1', isActive: true, organizationId: 'org1', teamId: null } as any);
      
      const managerAuth: AuthenticatedContext = { userId: 'u2', employeeId: 'manager1', organizationId: 'org1', roles: ['MANAGER'] };
      await expect(service.assignEmployeeToProject('p1', 'targetE1', managerAuth)).rejects.toThrow('You can only assign or remove employees from teams you manage');
    });

    it('rejects MANAGER if employee in different manager team', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.OrganizationSettings.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'targetE1', isActive: true, organizationId: 'org1', teamId: 't1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', managerId: 'otherManager', organizationId: 'org1' } as any);
      
      const managerAuth: AuthenticatedContext = { userId: 'u2', employeeId: 'manager1', organizationId: 'org1', roles: ['MANAGER'] };
      await expect(service.assignEmployeeToProject('p1', 'targetE1', managerAuth)).rejects.toThrow('You can only assign or remove employees from teams you manage');
    });

    it('allows MANAGER to assign own team members', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.OrganizationSettings.first).mockResolvedValueOnce(null);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'targetE1', isActive: true, organizationId: 'org1', teamId: 't1' } as any);
      // Second fetch of employee by real validation
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'targetE1', isActive: true, organizationId: 'org1', teamId: 't1' } as any);
      vi.mocked(db.orm.public.Team.first).mockResolvedValueOnce({ id: 't1', managerId: 'manager1', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce(null); // No existing assignment
      
      const managerAuth: AuthenticatedContext = { userId: 'u2', employeeId: 'manager1', organizationId: 'org1', roles: ['MANAGER'] };
      
      await service.assignEmployeeToProject('p1', 'targetE1', managerAuth);
      expect(db.orm.public.EmployeeProject.create).toHaveBeenCalledWith({ projectId: 'p1', employeeId: 'targetE1' });
    });
  });

  describe('assignEmployeeToProject', () => {
    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.assignEmployeeToProject('p1', 'e1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project is inactive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: false, organizationId: 'org1' } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if employee not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.assignEmployeeToProject('p1', 'e1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if employee is inactive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: false, organizationId: 'org1' } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1', authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for cross-organization assignment', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.assignEmployeeToProject('p1', 'e1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate assignment', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce({ projectId: 'p1', employeeId: 'e1' } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1', authCtx)).rejects.toThrow(ConflictException);
    });

    it('should assign successfully', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce(null);

      const created = { projectId: 'p1', employeeId: 'e1' };
      vi.mocked(db.orm.public.EmployeeProject.create).mockResolvedValueOnce(created as any);

      const result = await service.assignEmployeeToProject('p1', 'e1', authCtx);
      expect(db.orm.public.EmployeeProject.create).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('removeEmployeeFromProject', () => {
    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.removeEmployeeFromProject('p1', 'e1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should remove successfully', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, status: 'ACTIVE', organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce({ projectId: 'p1', employeeId: 'e1' } as any);
      await service.removeEmployeeFromProject('p1', 'e1', authCtx);
      expect(db.orm.public.EmployeeProject.delete).toHaveBeenCalled();
    });
  });

  describe('getProjectEmployees', () => {
    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.getProjectEmployees('p1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should return active employees', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', organizationId: 'org1' } as any);
      const assignments = [
        { employee: { id: 'e1', isActive: true } },
        { employee: { id: 'e2', isActive: false } },
      ];
      vi.mocked(db.orm.public.EmployeeProject.all).mockResolvedValueOnce(assignments as any);

      const result = await service.getProjectEmployees('p1', authCtx);
      expect(result).toEqual([{ id: 'e1', isActive: true }]);
    });
  });

  describe('getEmployeeProjects', () => {
    it('should throw NotFoundException if employee not found', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.getEmployeeProjects('e1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should return active projects', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', organizationId: 'org1' } as any);
      const assignments = [
        { project: { id: 'p1', isActive: true, organizationId: 'org1' } },
        { project: { id: 'p2', isActive: false, organizationId: 'org1' } },
      ];
      vi.mocked(db.orm.public.EmployeeProject.all).mockResolvedValueOnce(assignments as any);

      const result = await service.getEmployeeProjects('e1', authCtx);
      expect(result).toEqual([{ id: 'p1', isActive: true, organizationId: 'org1' }]);
    });
  });
});
