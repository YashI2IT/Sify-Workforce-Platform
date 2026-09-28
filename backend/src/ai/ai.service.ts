import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException, RequestTimeoutException } from '@nestjs/common';
import type { AiProvider } from './ai.provider.js';
import { ReportsService } from '../reports/reports.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

@Injectable()
export class AiService {
  constructor(
    @Inject('AI_PROVIDER') private aiProvider: AiProvider,
    private reportsService: ReportsService,
    private projectsService: ProjectsService,
  ) {}

  async getProjectSummary(projectId: string, auth: AuthenticatedContext) {
    // 1. Fetch factual data using existing service (enforces RBAC)
    const project = await this.projectsService.findOne(projectId, auth);
    const health = await this.projectsService.getProjectHealth(projectId, auth);
    
    // 2. Build minimal structured context
    const context = {
      projectName: project.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      healthSummary: health.summary,
      healthEvidence: health.evidence
    };

    // 3. Request summary from AI provider
    try {
      const summary = await this.aiProvider.generateSummary(context, 'PROJECT');
      return { summary, dataScope: 'PROJECT', projectId, contextUsed: context };
    } catch (err: any) {
      if (err.name === 'TimeoutError') throw new RequestTimeoutException('AI Provider timed out');
      throw err;
    }
  }

  async getManagerTeamSummary(startDate: string, endDate: string, auth: AuthenticatedContext) {
    if (!auth.roles.includes('MANAGER') && !auth.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only managers can request team summaries');
    }

    // 1. Fetch factual data using existing service (enforces RBAC)
    const dashboard = await this.reportsService.getManagerDashboard(startDate, endDate, auth);
    
    // 2. Build minimal structured context
    const context = {
      period: { startDate, endDate },
      pendingApprovalsCount: dashboard.pendingApprovalsCount,
      teamWeeklyFinalizedHours: dashboard.teamWeeklyFinalizedHours,
      totalTeamMembers: dashboard.totalTeamMembers,
      managedTeamsCount: dashboard.managedTeamsCount,
      activeProjectsCount: dashboard.activeProjectsCount,
      projectStatusCounts: dashboard.projectStatusCounts
    };

    // 3. Request summary from AI provider
    try {
      const summary = await this.aiProvider.generateSummary(context, 'MANAGER');
      return { summary, dataScope: 'MANAGER_TEAM', period: { startDate, endDate }, contextUsed: context };
    } catch (err: any) {
      if (err.name === 'TimeoutError') throw new RequestTimeoutException('AI Provider timed out');
      throw err;
    }
  }

  async getEmployeeWorkSummary(startDate: string, endDate: string, auth: AuthenticatedContext) {
    if (!auth.employeeId) {
      throw new BadRequestException('Employee ID is required');
    }

    // 1. Fetch factual data using existing service (enforces RBAC)
    const empSummary = await this.reportsService.getEmployeeSummary(auth.employeeId, startDate, endDate, auth);
    
    // 2. Build minimal structured context
    const context = {
      period: { startDate, endDate },
      totalHours: empSummary.totalHours,
      statusBreakdown: empSummary.statusBreakdown,
      projectBreakdown: empSummary.projectBreakdown
    };

    // 3. Request summary from AI provider
    try {
      const summary = await this.aiProvider.generateSummary(context, 'EMPLOYEE');
      return { summary, dataScope: 'EMPLOYEE_WORK', period: { startDate, endDate }, contextUsed: context };
    } catch (err: any) {
      if (err.name === 'TimeoutError') throw new RequestTimeoutException('AI Provider timed out');
      throw err;
    }
  }
}
