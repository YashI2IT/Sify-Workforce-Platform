import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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

  return {
    db: {
      orm: {
        public: {
          EmployeeProject: mEmployeeProject,
          Project: mProject,
          Employee: mEmployee,
        },
      },
    },
  };
});

describe('AssignmentsService', () => {
  let service: AssignmentsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AssignmentsService],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignEmployeeToProject', () => {
    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.assignEmployeeToProject('p1', 'e1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project is inactive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: false } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if employee not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.assignEmployeeToProject('p1', 'e1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if employee is inactive', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: false, organizationId: 'org1' } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for cross-organization assignment', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: true, organizationId: 'org2' } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate assignment', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce({ projectId: 'p1', employeeId: 'e1' } as any);
      await expect(service.assignEmployeeToProject('p1', 'e1')).rejects.toThrow(ConflictException);
    });

    it('should assign successfully', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', isActive: true, organizationId: 'org1' } as any);
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce(null);

      const created = { projectId: 'p1', employeeId: 'e1' };
      vi.mocked(db.orm.public.EmployeeProject.create).mockResolvedValueOnce(created as any);

      const result = await service.assignEmployeeToProject('p1', 'e1');
      expect(db.orm.public.EmployeeProject.create).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('removeEmployeeFromProject', () => {
    it('should throw NotFoundException if assignment does not exist', async () => {
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce(null);
      await expect(service.removeEmployeeFromProject('p1', 'e1')).rejects.toThrow(NotFoundException);
    });

    it('should remove successfully', async () => {
      vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValueOnce({ projectId: 'p1', employeeId: 'e1' } as any);
      await service.removeEmployeeFromProject('p1', 'e1');
      expect(db.orm.public.EmployeeProject.delete).toHaveBeenCalled();
    });
  });

  describe('getProjectEmployees', () => {
    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);
      await expect(service.getProjectEmployees('p1')).rejects.toThrow(NotFoundException);
    });

    it('should return active employees', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p1' } as any);
      const assignments = [
        { employee: { id: 'e1', isActive: true } },
        { employee: { id: 'e2', isActive: false } },
      ];
      vi.mocked(db.orm.public.EmployeeProject.all).mockResolvedValueOnce(assignments as any);

      const result = await service.getProjectEmployees('p1');
      expect(result).toEqual([{ id: 'e1', isActive: true }]);
    });
  });

  describe('getEmployeeProjects', () => {
    it('should throw NotFoundException if employee not found', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.getEmployeeProjects('e1')).rejects.toThrow(NotFoundException);
    });

    it('should return active projects', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1' } as any);
      const assignments = [
        { project: { id: 'p1', isActive: true } },
        { project: { id: 'p2', isActive: false } },
      ];
      vi.mocked(db.orm.public.EmployeeProject.all).mockResolvedValueOnce(assignments as any);

      const result = await service.getEmployeeProjects('e1');
      expect(result).toEqual([{ id: 'p1', isActive: true }]);
    });
  });
});
