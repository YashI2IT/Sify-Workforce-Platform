import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let service: AssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        {
          provide: AssignmentsService,
          useValue: {
            assignEmployeeToProject: vi.fn(),
            removeEmployeeFromProject: vi.fn(),
            getProjectEmployees: vi.fn(),
            getEmployeeProjects: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('assignEmployeeToProject', () => {
    it('should assign successfully', async () => {
      const expectedResult = { projectId: 'p1', employeeId: 'e1' };
      vi.mocked(service.assignEmployeeToProject).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.assignEmployeeToProject('p1', 'e1');
      expect(service.assignEmployeeToProject).toHaveBeenCalledWith('p1', 'e1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('removeEmployeeFromProject', () => {
    it('should remove successfully', async () => {
      vi.mocked(service.removeEmployeeFromProject).mockResolvedValueOnce(undefined as any);

      const result = await controller.removeEmployeeFromProject('p1', 'e1');
      expect(service.removeEmployeeFromProject).toHaveBeenCalledWith('p1', 'e1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getProjectEmployees', () => {
    it('should return employees', async () => {
      const expectedResult = [{ id: 'e1' }];
      vi.mocked(service.getProjectEmployees).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.getProjectEmployees('p1');
      expect(service.getProjectEmployees).toHaveBeenCalledWith('p1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getEmployeeProjects', () => {
    it('should return projects', async () => {
      const expectedResult = [{ id: 'p1' }];
      vi.mocked(service.getEmployeeProjects).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.getEmployeeProjects('e1');
      expect(service.getEmployeeProjects).toHaveBeenCalledWith('e1');
      expect(result).toEqual(expectedResult);
    });
  });
});
