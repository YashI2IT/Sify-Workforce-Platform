import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mTimeEntry = {
    where: vi.fn(() => ({
      all: vi.fn(),
      aggregate: vi.fn(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
    }))
  };
  const mEmployee = { 
    where: vi.fn(() => ({ 
      first: vi.fn(), 
      all: vi.fn(),
      aggregate: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
    })) 
  };
  const mTeam = { where: vi.fn(() => ({ first: vi.fn(), all: vi.fn() })) };
  const mTimesheet = { where: vi.fn(() => ({ first: vi.fn(), all: vi.fn(), aggregate: vi.fn() })) };
  const mProject = { 
    where: vi.fn(() => ({ 
      first: vi.fn(),
      all: vi.fn()
    })) 
  };
  const mTask = { 
    where: vi.fn(() => ({ 
      all: vi.fn()
    })) 
  };
  const mActivity = { 
    where: vi.fn(() => ({ 
      all: vi.fn()
    })) 
  };

  return {
    db: {
      orm: {
        public: {
          TimeEntry: mTimeEntry,
          Employee: mEmployee,
          Team: mTeam,
          Timesheet: mTimesheet,
          Project: mProject,
          Task: mTask,
          Activity: mActivity,
          EmployeeProject: { where: vi.fn(() => ({ all: vi.fn(), aggregate: vi.fn() })) },
          WorkingTime: {
            where: vi.fn(() => ({ all: vi.fn(), first: vi.fn() }))
          }
        },
      },
    },
  };
});

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  const authCtx = (roles: string[] = ['EMPLOYEE']): AuthenticatedContext => ({
    userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles
  });

  const setupMocks = (overrides: any = {}) => {
    vi.mocked(db.orm.public.Employee.where).mockReturnValue({
      first: vi.fn().mockResolvedValue(overrides.employee !== undefined ? overrides.employee : { id: '123e4567-e89b-12d3-a456-426614174001', organizationId: 'org1', teamId: 't1' }),
      all: vi.fn().mockResolvedValue(overrides.employees !== undefined ? overrides.employees : [{ id: '123e4567-e89b-12d3-a456-426614174001', organizationId: 'org1', teamId: 't1' }]),
      select: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue(overrides.employees !== undefined ? overrides.employees : [{ id: '123e4567-e89b-12d3-a456-426614174001', organizationId: 'org1', teamId: 't1' }])
      })
    } as any);

    const qb = {
      where: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue(overrides.entries !== undefined ? overrides.entries : [{
        id: 'te1',
        employeeId: 'e1',
        date: '2026-08-01',
        hours: 8,
        projectId: 'p1',
        timesheetId: 'APPROVED'
      }])
    };
    vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qb as any);
    
    vi.mocked(db.orm.public.Team.where).mockReturnValue({
      first: vi.fn().mockResolvedValue(overrides.team !== undefined ? overrides.team : { id: 't1', managerId: '123e4567-e89b-12d3-a456-426614174000', organizationId: 'org1' })
    } as any);

    // Timesheets: now fetched as a batch via .where(t => t.id.in([...])).all()
    // Build a lookup map from timesheetId -> status using the timesheetIdMap override
    const timesheetIdMap = overrides.timesheetIdMap ?? {};
    const defaultTimesheetStatus = overrides.timesheet?.status ?? 'APPROVED';
    const entriesData: any[] = overrides.entries ?? [{ id: 'te1', employeeId: 'e1', date: '2026-08-01', hours: 8, projectId: 'p1', timesheetId: 'APPROVED' }];

    // For integrity test: if any timesheetId maps to 'missing', return null to trigger the error
    const hasMissing = Object.values(timesheetIdMap).includes('missing');

    vi.mocked(db.orm.public.Timesheet.where).mockReturnValue({
      first: vi.fn().mockResolvedValue(null),
      all: vi.fn().mockResolvedValue(
        hasMissing
          ? [] // return empty set, so timesheetMap.get() returns undefined → triggers integrity error
          : entriesData.map((e: any) => ({
              id: e.timesheetId,
              status: timesheetIdMap[e.timesheetId] ?? defaultTimesheetStatus
            }))
      )
    } as any);

    // Projects: now fetched as a batch via .where(p => p.id.in([...])).all()
    const projectNameMap = overrides.projectNameMap ?? {};
    const uniqueProjectIds = [...new Set((overrides.entries ?? [{ projectId: 'p1' }]).map((e: any) => e.projectId))];
    vi.mocked(db.orm.public.Project.where).mockReturnValue({
      first: vi.fn().mockResolvedValue({ name: 'Test Project' }),
      all: vi.fn().mockResolvedValue(
        uniqueProjectIds.map((pid: any) => ({ id: pid, name: projectNameMap[pid] ?? 'Test Project', organizationId: 'org1' }))
      )
    } as any);
  };

  it('4. Manager managed employee access', async () => {
    setupMocks();
    const res = await service.getEmployeeSummary('e2', '2026-08-01', '2026-08-10', authCtx(['MANAGER']));
    expect(res.employeeId).toBe('e2');
  });

  it('5. Manager unrelated employee denied', async () => {
    setupMocks({ team: null });
    await expect(service.getEmployeeSummary('e2', '2026-08-01', '2026-08-10', authCtx(['MANAGER'])))
      .rejects.toThrow(ForbiddenException);
  });

  it('7. Admin foreign organization denied (cross-organization)', async () => {
    setupMocks({ employee: { id: 'e2', organizationId: 'org2' } });
    await expect(service.getEmployeeSummary('e2', '2026-08-01', '2026-08-10', authCtx(['ADMIN'])))
      .rejects.toThrow(ForbiddenException);
  });

  it('Admin organization-wide employee summary aggregation', async () => {
    setupMocks({
      employees: [{ id: 'e1' }, { id: 'e2' }],
      entries: [
        { id: '1', date: '2026-08-01', hours: 8, projectId: 'p1', timesheetId: 'APPROVED' },
        { id: '2', date: '2026-08-02', hours: 4, projectId: 'p2', timesheetId: 'SUBMITTED' },
      ],
      timesheetIdMap: { 'APPROVED': 'APPROVED', 'SUBMITTED': 'SUBMITTED' },
      projectNameMap: { 'p1': 'P1', 'p2': 'P2' }
    });

    const res = await service.getEmployeeSummary(undefined, '2026-08-01', '2026-08-10', authCtx(['ADMIN']));
    expect(res.totalHours).toBe(12);
    expect(res.statusBreakdown.APPROVED).toBe(8);
    expect(res.statusBreakdown.SUBMITTED).toBe(4);
    expect(res.projectBreakdown.length).toBe(2);
  });

  it('Admin organization-wide with 0 employees in organization', async () => {
    vi.mocked(db.orm.public.Employee.where).mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue([])
      })
    } as any);

    const res = await service.getEmployeeSummary(undefined, '2026-08-01', '2026-08-10', authCtx(['ADMIN']));
    expect(res.totalHours).toBe(0);
    expect(res.projectBreakdown).toEqual([]);
    expect(res.dailyTotals).toEqual([]);
  });

  it('Non-admin denied organization-wide summary', async () => {
    await expect(service.getEmployeeSummary(undefined, '2026-08-01', '2026-08-10', authCtx(['EMPLOYEE'])))
      .rejects.toThrow(ForbiddenException);
  });

  it('14-17. Status aggregation, 18. project breakdown, 19. daily breakdown, 20. totalHours', async () => {
    setupMocks({
      employee: { id: 'e1', organizationId: 'org1' },
      entries: [
        { id: '1', date: '2026-08-01', hours: 8, projectId: 'p1', timesheetId: 'APPROVED' },
        { id: '2', date: '2026-08-01', hours: 4, projectId: 'p2', timesheetId: 'SUBMITTED' },
        { id: '3', date: '2026-08-02', hours: 2, projectId: 'p1', timesheetId: 'DRAFT' },
        { id: '4', date: '2026-08-03', hours: 1, projectId: 'p1', timesheetId: 'REJECTED' },
      ],
      timesheetIdMap: {
        'APPROVED': 'APPROVED',
        'SUBMITTED': 'SUBMITTED',
        'DRAFT': 'DRAFT',
        'REJECTED': 'REJECTED'
      },
      projectNameMap: {
        'p1': 'P1',
        'p2': 'P2'
      }
    });
    
    const res = await service.getEmployeeSummary('e1', '2026-08-01', '2026-08-10', authCtx(['EMPLOYEE']));
    
    expect(res.totalHours).toBe(15);
    expect(res.statusBreakdown.APPROVED).toBe(8);
    expect(res.statusBreakdown.SUBMITTED).toBe(4);
    expect(res.statusBreakdown.DRAFT).toBe(2);
    expect(res.statusBreakdown.REJECTED).toBe(1);
    
    expect(res.projectBreakdown).toEqual([
      { projectId: 'p1', projectName: 'P1', hours: 11 },
      { projectId: 'p2', projectName: 'P2', hours: 4 }
    ]);
    
    expect(res.dailyTotals).toEqual([
      { date: '2026-08-01', hours: 12 },
      { date: '2026-08-02', hours: 2 },
      { date: '2026-08-03', hours: 1 }
    ]);
  });

  it('21. empty result', async () => {
    setupMocks({ employee: { id: 'e1', organizationId: 'org1' }, entries: [] });
    const res = await service.getEmployeeSummary('e1', '2026-08-01', '2026-08-10', authCtx(['EMPLOYEE']));
    expect(res.totalHours).toBe(0);
    expect(res.projectBreakdown).toEqual([]);
    expect(res.dailyTotals).toEqual([]);
  });

  it('22. missing Timesheet integrity anomaly', async () => {
    setupMocks({
      employee: { id: 'e1', organizationId: 'org1' },
      entries: [
        { id: '1', date: '2026-08-01', hours: 8, projectId: 'p1', timesheetId: 'ts-missing' },
      ],
      timesheetIdMap: { 'ts-missing': 'missing' } // triggers hasMissing → empty batch result
    });
    await expect(service.getEmployeeSummary('e1', '2026-08-01', '2026-08-10', authCtx(['EMPLOYEE'])))
      .rejects.toThrow(InternalServerErrorException);
  });
  
  it('Safety threshold enforced', async () => {
    const hugeArray = new Array(2501).fill({ id: '1', date: '2026-08-01', hours: 1, projectId: 'p1', timesheetId: 'APPROVED' });
    setupMocks({
      employee: { id: 'e1', organizationId: 'org1' },
      entries: hugeArray,
      timesheetIdMap: { 'APPROVED': 'APPROVED' },
      projectNameMap: { 'p1': 'P1' }
    });
    await expect(service.getEmployeeSummary('e1', '2026-08-01', '2026-08-10', authCtx(['EMPLOYEE'])))
      .rejects.toThrow(InternalServerErrorException);
  });

  it('DB Query Boundary Test', async () => {
    setupMocks({
      employee: { id: 'e1', organizationId: 'org1' },
      entries: [] 
    });
    
    await service.getEmployeeSummary('e1', '2026-08-01', '2026-08-15', authCtx(['EMPLOYEE']));
    
    expect(db.orm.public.TimeEntry.where).toHaveBeenCalledWith({ employeeId: 'e1' });
    const qb = vi.mocked(db.orm.public.TimeEntry.where).mock.results[0].value;
    expect(qb.where).toHaveBeenCalledTimes(2); // Two chained calls for start/end
  });
  describe('Admin Dashboard', () => {
    it('rejects non-admin roles', async () => {
      await expect(service.getAdminDashboard(authCtx(['MANAGER'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('aggregates organization data correctly', async () => {
      // Mock db.orm.public.Employee.where().groupBy().aggregate
      const empAggMock = vi.fn().mockResolvedValue([
        { isActive: true, count: 50 },
        { isActive: false, count: 5 }
      ]);
      const empQb = { groupBy: vi.fn().mockReturnValue({ aggregate: empAggMock }) };
      vi.mocked(db.orm.public.Employee.where).mockReturnValue(empQb as any);

      // Mock db.orm.public.Team
      const teamAggMock = vi.fn().mockResolvedValue([
        { managerId: 'm1', count: 10 },
        { managerId: null, count: 2 }
      ]);
      const teamQb = { groupBy: vi.fn().mockReturnValue({ aggregate: teamAggMock }) };
      vi.mocked(db.orm.public.Team.where).mockReturnValue(teamQb as any);

      const res = await service.getAdminDashboard(authCtx(['ADMIN']));
      
      expect(res.activeEmployees).toBe(50);
      expect(res.inactiveEmployees).toBe(5);
      expect(res.totalEmployees).toBe(55);
      expect(res.totalTeams).toBe(12);
      expect(res.teamsWithoutManager).toBe(2);
      
      expect(db.orm.public.Employee.where).toHaveBeenCalledWith({ organizationId: 'org1' });
      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ organizationId: 'org1' });
    });
  });

  describe('Manager Dashboard', () => {
    it('returns empty dashboard if 0 teams managed', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([])
      } as any);

      const res = await service.getManagerDashboard('2026-08-01', '2026-08-31', authCtx(['MANAGER']));
      expect(res).toEqual(expect.objectContaining({
        pendingApprovalsCount: 0,
        teamWeeklyFinalizedHours: 0,
        missingDraftTimesheetCount: 0,
        totalTeamMembers: 0,
      }));
    });

    it('returns dashboard data for managed teams', async () => {
      const qbTeam = { all: vi.fn().mockResolvedValue([{ id: 't1' }]) };
      vi.mocked(db.orm.public.Team.where).mockReturnValue(qbTeam as any);

      const qbEmployee = {
        all: vi.fn().mockResolvedValue([{ id: 'e1', teamId: 't1' }, { id: 'e2', teamId: 't1' }]),
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ id: 'e1', teamId: 't1' }, { id: 'e2', teamId: 't1' }])
        })
      };
      vi.mocked(db.orm.public.Employee.where).mockReturnValue(qbEmployee as any);

      const qbTimesheet = {
        where: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue({ count: 5 }) // both draft and submitted will return 5 for test
      };
      vi.mocked(db.orm.public.Timesheet.where).mockReturnValue(qbTimesheet as any);

      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue({ total: 42.5 })
      };
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      const qbEmployeeProject = {
        all: vi.fn().mockResolvedValue([{ projectId: 'p1' }])
      };
      vi.mocked(db.orm.public.EmployeeProject.where).mockReturnValue(qbEmployeeProject as any);

      const qbProject = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue([{ status: 'ACTIVE', count: 2 }])
      };
      vi.mocked(db.orm.public.Project.where).mockReturnValue(qbProject as any);

      (globalThis as any).Temporal = {
        Instant: {
          from: (d: string) => d
        }
      };

      const res = await service.getManagerDashboard('2026-08-01', '2026-08-31', authCtx(['MANAGER']));
      
      expect(res).toEqual(expect.objectContaining({
        pendingApprovalsCount: 5,
        teamWeeklyFinalizedHours: 42.5,
        totalTeamMembers: 2,
      }));
      
      expect(db.orm.public.Team.where).toHaveBeenCalledWith({ managerId: 'e1', organizationId: 'org1' });
      expect(db.orm.public.TimeEntry.where).toHaveBeenCalled();
      expect(db.orm.public.Timesheet.where).toHaveBeenCalled();
    });
  });

  describe('Team Utilization', () => {
    it('returns empty data if 0 teams managed', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([])
      } as any);

      const res = await service.getTeamUtilization('2026-08-01', '2026-08-31', 1, 50, authCtx(['MANAGER']));
      expect(res).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 }
      });
    });

    it('returns empty data if 0 employees', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 't1' }])
      } as any);

      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        aggregate: vi.fn().mockResolvedValue({ count: 0 })
      } as any);

      const res = await service.getTeamUtilization('2026-08-01', '2026-08-31', 1, 50, authCtx(['MANAGER']));
      expect(res).toEqual({
        data: [],
        meta: { total: 0, page: 1, limit: 50, totalPages: 0 }
      });
    });

    it('returns aggregated data for employees', async () => {
      vi.mocked(db.orm.public.Team.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 't1' }])
      } as any);

      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        aggregate: vi.fn().mockResolvedValue({ count: 1 }),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ id: 'e1', name: 'Emp 1', employeeCode: 'EMP1' }])
      } as any);

      // We mock the base query to return aggregated result
      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue([{ employeeId: 'e1', total: 10 }])
      };
      
      // Force it to return our chained mock
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      const res = await service.getTeamUtilization('2026-08-01', '2026-08-31', 1, 50, authCtx(['MANAGER']));
      
      expect(res.data).toEqual([
        {
          employeeId: 'e1',
          name: 'Emp 1',
          employeeCode: 'EMP1',
          statusBreakdown: {
            APPROVED: 10,
            SUBMITTED: 10,
            DRAFT: 10,
            REJECTED: 10
          }
        }
      ]);
      expect(res.meta).toEqual({
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1
      });
    });
  });

  describe('Project Hours', () => {
    it('returns empty data if 0 projects in organization', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([])
      } as any);

      const res = await service.getProjectHours('2026-01-01', '2026-12-31', undefined, authCtx(['ADMIN']));
      expect(res).toEqual({
        totalApprovedHours: 0,
        employeeBreakdown: [],
        taskBreakdown: []
      });
    });

    it('rejects if specific project belongs to another org', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.getProjectHours('2026-01-01', '2026-12-31', 'proj1', authCtx(['ADMIN'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('returns aggregated data for projects', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 'p1' }])
      } as any);

      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue([{ employeeId: 'e1', taskId: 't1', total: 15 }])
      };
      
      // Override aggregate to return a mock total for totalApprovedHours first, then arrays for groupBy
      let aggregateCallCount = 0;
      qbTimeEntry.aggregate = vi.fn().mockImplementation(() => {
        if (aggregateCallCount === 0) {
          aggregateCallCount++;
          return Promise.resolve({ total: 15 });
        } else if (aggregateCallCount === 1) {
          aggregateCallCount++;
          return Promise.resolve([{ employeeId: 'e1', total: 15 }]);
        } else {
          return Promise.resolve([{ taskId: 't1', total: 15 }]);
        }
      });
      
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 'e1', name: 'Emp 1', employeeCode: 'EMP1' }])
      } as any);

      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 't1', name: 'Task 1' }])
      } as any);

      const res = await service.getProjectHours('2026-01-01', '2026-12-31', undefined, authCtx(['ADMIN']));
      
      expect(res).toEqual({
        totalApprovedHours: 15,
        employeeBreakdown: [
          { employeeId: 'e1', name: 'Emp 1', employeeCode: 'EMP1', hours: 15 }
        ],
        taskBreakdown: [
          { taskId: 't1', taskName: 'Task 1', hours: 15 }
        ]
      });
      
      // Verify org isolation was enforced
      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ organizationId: 'org1' });
    });
  });

  describe('Workload', () => {
    it('returns valid workload list for ADMIN', async () => {
      vi.mocked(db.orm.public.Employee.where).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ id: 'e1', name: 'John Doe', employeeCode: 'E01' }])
      } as any);

      vi.mocked(db.orm.public.WorkingTime.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ employeeId: 'e1', monday: 8, tuesday: 8, wednesday: 8, thursday: 8, friday: 8, saturday: 0, sunday: 0 }]),
        first: vi.fn().mockResolvedValue(null)
      } as any);

      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue([{ employeeId: 'e1', hours: 45 }])
      };
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      const res = await service.getWorkload('2026-08-01', '2026-08-07', authCtx(['ADMIN']));
      
      expect(res).toHaveLength(1);
      expect(res[0]).toEqual({
        employeeId: 'e1',
        employeeName: 'John Doe',
        employeeCode: 'E01',
        configuredCapacity: 40,
        actualHours: 45,
        remainingCapacity: 0,
        overCapacity: 5
      });
    });

    it('rejects if no ADMIN or MANAGER role', async () => {
      await expect(service.getWorkload('2026-01-01', '2026-01-07', authCtx(['EMPLOYEE'])))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('Project Analysis', () => {
    it('rejects if project not found or belongs to another org', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.getProjectAnalysis('p1', '2026-01-01', '2026-12-31', 'week', authCtx(['ADMIN'])))
        .rejects.toThrow(ForbiddenException);
    });

    it('returns empty data if no entries', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1' })
      } as any);

      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue([])
      };
      
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      const res = await service.getProjectAnalysis('p1', '2026-01-01', '2026-12-31', 'month', authCtx(['ADMIN']));
      
      expect(res).toEqual({
        hoursByTask: [],
        hoursByActivity: [],
        trend: []
      });
    });

    it('aggregates data correctly (weekly trend)', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1' })
      } as any);

      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue([]) // default for fallback
      };
      
      let aggregateCallCount = 0;
      qbTimeEntry.aggregate = vi.fn().mockImplementation(() => {
        if (aggregateCallCount === 0) {
          aggregateCallCount++;
          return Promise.resolve([{ taskId: 't1', total: 10 }]);
        } else if (aggregateCallCount === 1) {
          aggregateCallCount++;
          return Promise.resolve([{ activityId: 'a1', total: 10 }]);
        } else {
          return Promise.resolve([
            { date: '2026-08-12', total: 5 }, // Wed -> Mon 2026-08-10
            { date: '2026-08-14', total: 5 }  // Fri -> Mon 2026-08-10
          ]);
        }
      });
      
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      vi.mocked(db.orm.public.Task.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 't1', name: 'Task 1' }])
      } as any);

      vi.mocked(db.orm.public.Activity.where).mockReturnValue({
        all: vi.fn().mockResolvedValue([{ id: 'a1', name: 'Activity 1' }])
      } as any);

      const res = await service.getProjectAnalysis('p1', '2026-01-01', '2026-12-31', 'week', authCtx(['ADMIN']));
      
      expect(res.hoursByTask).toEqual([{ taskId: 't1', taskName: 'Task 1', hours: 10 }]);
      expect(res.hoursByActivity).toEqual([{ activityId: 'a1', activityName: 'Activity 1', hours: 10 }]);
      expect(res.trend).toEqual([{ period: '2026-08-10', hours: 10 }]); // both dates map to same Monday
    });
    
    it('aggregates data correctly (monthly trend)', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'p1' })
      } as any);

      const qbTimeEntry = {
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        aggregate: vi.fn().mockResolvedValue([])
      };
      
      let aggregateCallCount = 0;
      qbTimeEntry.aggregate = vi.fn().mockImplementation(() => {
        if (aggregateCallCount === 0) {
          aggregateCallCount++;
          return Promise.resolve([]);
        } else if (aggregateCallCount === 1) {
          aggregateCallCount++;
          return Promise.resolve([]);
        } else {
          return Promise.resolve([
            { date: '2026-08-12', total: 5 },
            { date: '2026-08-30', total: 10 },
            { date: '2026-09-02', total: 8 }
          ]);
        }
      });
      
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValue(qbTimeEntry as any);

      const res = await service.getProjectAnalysis('p1', '2026-01-01', '2026-12-31', 'month', authCtx(['ADMIN']));
      
      expect(res.trend).toEqual([
        { period: '2026-08', hours: 15 },
        { period: '2026-09', hours: 8 }
      ]);
    });
  });
});
