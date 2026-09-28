import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service.js';
import { DefaultAiProvider } from './ai.provider.js';
import { ReportsService } from '../reports/reports.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { ForbiddenException, RequestTimeoutException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

describe('AiService', () => {
  let service: AiService;
  
  const mockProvider = {
    isConfigured: vi.fn(),
    generateSummary: vi.fn(),
  };

  const mockReportsService = {
    getManagerDashboard: vi.fn(),
    getEmployeeSummary: vi.fn(),
  };

  const mockProjectsService = {
    findOne: vi.fn(),
    getProjectHealth: vi.fn(),
  };

  const authCtxAdmin: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: ['ADMIN'] };
  const authCtxEmp: AuthenticatedContext = { userId: 'u2', employeeId: 'e2', organizationId: 'org1', roles: ['EMPLOYEE'] };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: 'AI_PROVIDER', useValue: mockProvider },
        { provide: ReportsService, useValue: mockReportsService },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProjectSummary', () => {
    it('should generate project summary successfully', async () => {
      mockProjectsService.findOne.mockResolvedValue({ name: 'Project A', status: 'ACTIVE' });
      mockProjectsService.getProjectHealth.mockResolvedValue({ summary: 'Healthy', evidence: [] });
      mockProvider.generateSummary.mockResolvedValue('Mock summary');

      const result = await service.getProjectSummary('p1', authCtxAdmin);
      expect(result.summary).toBe('Mock summary');
      expect(result.dataScope).toBe('PROJECT');
      expect(result.contextUsed.projectName).toBe('Project A');
    });

    it('should throw timeout if provider times out', async () => {
      mockProjectsService.findOne.mockResolvedValue({ name: 'Project A', status: 'ACTIVE' });
      mockProjectsService.getProjectHealth.mockResolvedValue({ summary: 'Healthy', evidence: [] });
      const timeoutError = new Error();
      timeoutError.name = 'TimeoutError';
      mockProvider.generateSummary.mockRejectedValue(timeoutError);

      await expect(service.getProjectSummary('p1', authCtxAdmin)).rejects.toThrow(RequestTimeoutException);
    });
  });

  describe('getManagerTeamSummary', () => {
    it('should forbid non-managers', async () => {
      await expect(service.getManagerTeamSummary('2024-01-01', '2024-01-31', authCtxEmp)).rejects.toThrow(ForbiddenException);
    });

    it('should generate team summary successfully', async () => {
      mockReportsService.getManagerDashboard.mockResolvedValue({
        totalTeamMembers: 5,
        managedTeamsCount: 1,
        activeProjectsCount: 2,
        pendingApprovalsCount: 0,
        teamWeeklyFinalizedHours: 40,
        projectStatusCounts: { ACTIVE: 2 }
      });
      mockProvider.generateSummary.mockResolvedValue('Mock manager summary');

      const result = await service.getManagerTeamSummary('2024-01-01', '2024-01-31', authCtxAdmin);
      expect(result.summary).toBe('Mock manager summary');
      expect(result.dataScope).toBe('MANAGER_TEAM');
      expect(result.contextUsed.totalTeamMembers).toBe(5);
    });
  });

  describe('getEmployeeWorkSummary', () => {
    it('should generate employee summary successfully', async () => {
      mockReportsService.getEmployeeSummary.mockResolvedValue({
        totalHours: 35,
        statusBreakdown: { APPROVED: 35 },
        projectBreakdown: []
      });
      mockProvider.generateSummary.mockResolvedValue('Mock employee summary');

      const result = await service.getEmployeeWorkSummary('2024-01-01', '2024-01-31', authCtxEmp);
      expect(result.summary).toBe('Mock employee summary');
      expect(result.dataScope).toBe('EMPLOYEE_WORK');
      expect(result.contextUsed.totalHours).toBe(35);
    });
  });
});
