import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportsController } from './reports.controller.js';
import { db } from '../prisma/db.js';

describe('Admin Reports Telemetry & Authorization', () => {
  let service: ReportsService;
  let controller: ReportsController;

  const adminAuth = {
    employeeId: 'emp-admin-1',
    organizationId: 'org-sify-1',
    roles: ['ADMIN'],
    userId: 'user-admin-1',
  } as any;

  const managerAuth = {
    employeeId: 'emp-mgr-1',
    organizationId: 'org-sify-1',
    roles: ['MANAGER'],
    userId: 'user-mgr-1',
  } as any;

  const employeeAuth = {
    employeeId: 'emp-staff-1',
    organizationId: 'org-sify-1',
    roles: ['EMPLOYEE'],
    userId: 'user-staff-1',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportsService();
    controller = new ReportsController(service);
  });

  describe('Authorization Controls', () => {
    it('rejects non-admin roles (MANAGER, EMPLOYEE) with ForbiddenException at controller level', async () => {
      await expect(
        controller.getAdminReport({ startDate: '2026-10-01', endDate: '2026-10-31' }, managerAuth)
      ).rejects.toThrow(ForbiddenException);

      await expect(
        controller.getAdminReport({ startDate: '2026-10-01', endDate: '2026-10-31' }, employeeAuth)
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects non-admin roles at service level', async () => {
      await expect(
        service.getAdminReport('2026-10-01', '2026-10-31', {}, managerAuth)
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN role to access report', async () => {
      // Mock basic db responses
      vi.spyOn(db.orm.public.Organization, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-sify-1', name: 'Sify Tech' }),
      } as any);
      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ timeZone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' }),
      } as any);
      vi.spyOn(db.orm.public.Project, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
      } as any);
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
      } as any);
      vi.spyOn(db.orm.public.Team, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await controller.getAdminReport(
        { startDate: '2026-10-01', endDate: '2026-10-31' },
        adminAuth
      );

      expect(result).toBeDefined();
      expect(result.organization.name).toBe('Sify Tech');
      expect(result.organization.timeZone).toBe('Asia/Kolkata');
    });

    it('validates date range limit: rejects ranges exceeding 365 days', async () => {
      await expect(
        controller.getAdminReport(
          { startDate: '2025-01-01', endDate: '2026-10-23' },
          adminAuth
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Accurate KPI & Data Aggregation', () => {
    it('calculates active projects, period-completed tasks, overdue tasks, and work hours correctly', async () => {
      const mockProjects = [
        { id: 'p-1', name: 'Cloud Migration', code: 'CLM', status: 'ACTIVE', isActive: true, startDate: '2026-09-01', endDate: '2026-12-01' },
        { id: 'p-2', name: 'Platform 2.0', code: 'PLT', status: 'IN_PROGRESS', isActive: true, startDate: '2026-10-01', endDate: '2026-11-01' },
        { id: 'p-3', name: 'Legacy Archive', code: 'LGC', status: 'COMPLETED', isActive: true, startDate: '2026-01-01', endDate: '2026-06-01' },
        { id: 'p-4', name: 'Future AI', code: 'FAI', status: 'PLANNING', isActive: true, startDate: '2026-11-01', endDate: '2027-01-01' },
      ];

      const mockEmployees = [
        { id: 'e-1', name: 'Alice Admin', email: 'alice@sify.com', teamId: 't-1', isActive: true },
        { id: 'e-2', name: 'Bob Builder', email: 'bob@sify.com', teamId: 't-1', isActive: true },
        { id: 'e-3', name: 'Charlie Inactive', email: 'charlie@sify.com', teamId: 't-2', isActive: false },
      ];

      const mockTeams = [
        { id: 't-1', name: 'Engineering Core', managerId: 'e-1' },
        { id: 't-2', name: 'DevOps', managerId: null },
      ];

      const mockTasks = [
        // Task completed within range (2026-10-01 to 2026-10-31)
        {
          id: 'tsk-1',
          ticketId: 'CLM-101',
          name: 'Setup VPC Peering',
          status: 'DONE',
          priority: 'HIGH',
          projectId: 'p-1',
          assigneeId: 'e-2',
          dueDate: '2026-10-15',
          updatedAt: '2026-10-14T10:00:00Z',
          isActive: true,
        },
        // Task completed outside range (updated in September) -> should NOT count in period
        {
          id: 'tsk-2',
          ticketId: 'CLM-102',
          name: 'Architecture Signoff',
          status: 'DONE',
          priority: 'MEDIUM',
          projectId: 'p-1',
          assigneeId: 'e-1',
          dueDate: '2026-09-20',
          updatedAt: '2026-09-19T10:00:00Z',
          isActive: true,
        },
        // Overdue open task (due 2026-10-10, status IN_PROGRESS)
        {
          id: 'tsk-3',
          ticketId: 'PLT-201',
          name: 'API Gateway Config',
          status: 'IN_PROGRESS',
          priority: 'URGENT',
          projectId: 'p-2',
          assigneeId: 'e-2',
          dueDate: '2026-10-10',
          updatedAt: '2026-10-12T10:00:00Z',
          isActive: true,
        },
        // Future open task (due 2026-11-20, status TODO) -> not overdue
        {
          id: 'tsk-4',
          ticketId: 'PLT-202',
          name: 'Load Testing',
          status: 'TODO',
          priority: 'MEDIUM',
          projectId: 'p-2',
          assigneeId: 'e-2',
          dueDate: '2026-11-20',
          updatedAt: '2026-10-05T10:00:00Z',
          isActive: true,
        },
      ];

      const mockTimeEntries = [
        { id: 'te-1', employeeId: 'e-2', projectId: 'p-1', taskId: 'tsk-1', hours: 16, approvalStatus: 'APPROVED', date: '2026-10-12' },
        { id: 'te-2', employeeId: 'e-2', projectId: 'p-2', taskId: 'tsk-3', hours: 8, approvalStatus: 'SUBMITTED', date: '2026-10-13' },
        { id: 'te-3', employeeId: 'e-1', projectId: 'p-1', taskId: 'tsk-2', hours: 4, approvalStatus: 'DRAFT', date: '2026-10-14' },
      ];

      vi.spyOn(db.orm.public.Organization, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-sify-1', name: 'Sify Tech' }),
      } as any);
      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ timeZone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY' }),
      } as any);
      vi.spyOn(db.orm.public.Project, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue(mockProjects),
      } as any);
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue(mockEmployees),
      } as any);
      vi.spyOn(db.orm.public.Team, 'where').mockReturnValue({
        all: vi.fn().mockResolvedValue(mockTeams),
      } as any);

      // Task query mock
      vi.spyOn(db.orm.public.Task, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue(mockTasks),
        }),
      } as any);

      // TimeEntry mock for tasks and date-range entries
      const mockTimeEntryQuery: any = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnValue({
          aggregate: vi.fn().mockResolvedValue([
            { taskId: 'tsk-1', total: 16 },
            { taskId: 'tsk-3', total: 8 },
          ]),
        }),
        all: vi.fn().mockResolvedValue(mockTimeEntries),
      };
      vi.spyOn(db.orm.public.TimeEntry, 'where').mockReturnValue(mockTimeEntryQuery);

      const report = await service.getAdminReport('2026-10-01', '2026-10-31', {}, adminAuth);

      // Verify KPI 1: Active Projects (ACTIVE + IN_PROGRESS = 2), completed = 1
      expect(report.summary.activeProjects).toBe(2);
      expect(report.summary.completedProjects).toBe(1);
      expect(report.summary.totalProjects).toBe(4);

      // Verify KPI 2: Tasks Completed in Period (tsk-1 updated on 2026-10-14, tsk-2 updated in Sept)
      expect(report.summary.tasksCompletedInPeriod).toBe(1);

      // Verify KPI 3: Overdue Tasks (tsk-3 has dueDate 2026-10-10 < current time and status IN_PROGRESS)
      expect(report.summary.overdueTasks).toBe(1);

      // Verify KPI 4: Distinct Active Team Members (e-1, e-2 active; e-3 inactive -> 2 active)
      expect(report.summary.teamMembers).toBe(2);

      // Verify Work Hours summary
      expect(report.summary.totalLoggedHours).toBe(28); // 16 + 8 + 4
      expect(report.summary.approvedHours).toBe(16);
      expect(report.summary.submittedHours).toBe(8);
      expect(report.summary.draftHours).toBe(4);
      expect(report.summary.approvalRate).toBe(57); // 16/28 = ~57%

      // Verify Section A: Project Performance list
      expect(report.projectPerformance.projects).toHaveLength(4);
      const clm = report.projectPerformance.projects.find((p: any) => p.code === 'CLM');
      expect(clm).toBeDefined();
      expect(clm!.totalTasks).toBe(2);
      expect(clm!.completedTasks).toBe(2);
      expect(clm!.progressPct).toBe(100);

      // Verify Section B: Task Progress distribution
      expect(report.taskProgress.distribution.DONE.count).toBe(2);
      expect(report.taskProgress.distribution.IN_PROGRESS.count).toBe(1);
      expect(report.taskProgress.distribution.TODO.count).toBe(1);

      // Verify Section C: Team Overview
      expect(report.teamOverview.teams).toHaveLength(2);
      const coreTeam = report.teamOverview.teams.find((t: any) => t.name === 'Engineering Core');
      expect(coreTeam).toBeDefined();
      expect(coreTeam!.managerName).toBe('Alice Admin');
      expect(coreTeam!.activeMemberCount).toBe(2); // e-1 and e-2

      // Verify Section D: Hours Breakdown
      expect(report.workHoursSummary.byProject).toBeDefined();
      expect(report.workHoursSummary.byTeam).toBeDefined();
    });

    it('filters tasks and time entries when project filter is applied', async () => {
      const mockProjects = [
        { id: 'p-1', name: 'Project Alpha', code: 'PA', status: 'ACTIVE', isActive: true },
        { id: 'p-2', name: 'Project Beta', code: 'PB', status: 'ACTIVE', isActive: true },
      ];

      const mockEmployees = [
        { id: 'e-1', name: 'Alice', teamId: 't-1', isActive: true },
      ];

      const mockTasks = [
        { id: 't-1', name: 'Alpha Task', status: 'DONE', projectId: 'p-1', assigneeId: 'e-1', updatedAt: '2026-10-10', isActive: true },
        { id: 't-2', name: 'Beta Task', status: 'TODO', projectId: 'p-2', assigneeId: 'e-1', updatedAt: '2026-10-10', isActive: true },
      ];

      const mockEntries = [
        { id: 'e-1', projectId: 'p-1', employeeId: 'e-1', hours: 10, approvalStatus: 'APPROVED', date: '2026-10-10' },
        { id: 'e-2', projectId: 'p-2', employeeId: 'e-1', hours: 5, approvalStatus: 'APPROVED', date: '2026-10-10' },
      ];

      vi.spyOn(db.orm.public.Organization, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-sify-1', name: 'Sify Tech' }),
      } as any);
      vi.spyOn(db.orm.public.OrganizationSettings, 'where').mockReturnValue({
        first: vi.fn().mockResolvedValue({ timeZone: 'UTC', dateFormat: 'YYYY-MM-DD' }),
      } as any);
      vi.spyOn(db.orm.public.Project, 'where').mockReturnValue({ all: vi.fn().mockResolvedValue(mockProjects) } as any);
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({ all: vi.fn().mockResolvedValue(mockEmployees) } as any);
      vi.spyOn(db.orm.public.Team, 'where').mockReturnValue({ all: vi.fn().mockResolvedValue([]) } as any);
      vi.spyOn(db.orm.public.Task, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({ all: vi.fn().mockResolvedValue(mockTasks) }),
      } as any);
      vi.spyOn(db.orm.public.TimeEntry, 'where').mockReturnValue({
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnValue({ aggregate: vi.fn().mockResolvedValue([]) }),
        all: vi.fn().mockResolvedValue(mockEntries),
      } as any);

      const filteredReport = await service.getAdminReport(
        '2026-10-01',
        '2026-10-31',
        { projectId: 'p-1' },
        adminAuth
      );

      // Filtered to p-1 only
      expect(filteredReport.taskProgress.tasks).toHaveLength(1);
      expect(filteredReport.taskProgress.tasks[0].projectId).toBe('p-1');
      expect(filteredReport.summary.totalLoggedHours).toBe(10);
    });
  });
});
