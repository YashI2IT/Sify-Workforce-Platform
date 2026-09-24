import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { TimeEntriesService, getMonday } from './time-entries.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mTimeEntry = {
    all: vi.fn(),
    where: vi.fn(() => mTimeEntry),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mEmployee = { where: vi.fn(() => mEmployee), first: vi.fn() };
  const mProject = { where: vi.fn(() => mProject), first: vi.fn() };
  const mEmployeeProject = { where: vi.fn(() => mEmployeeProject), first: vi.fn() };
  const mTask = { where: vi.fn(() => mTask), first: vi.fn() };
  const mActivity = { where: vi.fn(() => mActivity), first: vi.fn() };
  const mTimesheet = { 
    where: vi.fn(() => mTimesheet), 
    first: vi.fn(), 
    create: vi.fn() 
  };

  return {
    db: {
      orm: {
        public: {
          TimeEntry: mTimeEntry,
          Employee: mEmployee,
          Project: mProject,
          EmployeeProject: mEmployeeProject,
          Task: mTask,
          Activity: mActivity,
          Timesheet: mTimesheet,
          Team: { where: vi.fn(() => ({ first: vi.fn() })) }
        },
      },
    },
  };
});

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeEntriesService, { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
  });

  const setupMocks = (overrides: any = {}) => {
    vi.mocked(db.orm.public.Employee.first).mockResolvedValue({ id: 'e1', isActive: true, organizationId: 'org1' } as any);
    vi.mocked(db.orm.public.Project.first).mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
    vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValue({ employeeId: 'e1', projectId: 'p1' } as any);
    vi.mocked(db.orm.public.Task.first).mockResolvedValue({ id: 't1', projectId: 'p1', isActive: true } as any);
    vi.mocked(db.orm.public.Activity.first).mockResolvedValue({ id: 'a1', projectId: 'p1', isActive: true } as any);
    vi.mocked(db.orm.public.Timesheet.first).mockResolvedValue({ id: 'ts1', status: 'DRAFT' } as any);

    if (overrides['employee'] !== undefined) vi.mocked(db.orm.public.Employee.first).mockResolvedValue(overrides['employee']);
    if (overrides['project'] !== undefined) vi.mocked(db.orm.public.Project.first).mockResolvedValue(overrides['project']);
    if (overrides['assignment'] !== undefined) vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValue(overrides['assignment']);
    if (overrides['task'] !== undefined) vi.mocked(db.orm.public.Task.first).mockResolvedValue(overrides['task']);
    if (overrides['activity'] !== undefined) vi.mocked(db.orm.public.Activity.first).mockResolvedValue(overrides['activity']);
    if (overrides['timesheet'] !== undefined) vi.mocked(db.orm.public.Timesheet.first).mockResolvedValue(overrides['timesheet']);
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMonday UTC calculation', () => {
    it('should correctly calculate Monday for any day of the week without timezone drift', () => {
      // 2026-09-14 is Monday
      const mon = getMonday('2026-09-14');
      expect(mon.toISOString().slice(0, 10)).toBe('2026-09-14');

      // 2026-09-16 is Wednesday -> Monday is 2026-09-14
      const wed = getMonday('2026-09-16');
      expect(wed.toISOString().slice(0, 10)).toBe('2026-09-14');

      // 2026-09-20 is Sunday -> Monday is 2026-09-14
      const sun = getMonday('2026-09-20');
      expect(sun.toISOString().slice(0, 10)).toBe('2026-09-14');

      // 2026-09-21 is next Monday -> Monday is 2026-09-21
      const nextMon = getMonday('2026-09-21');
      expect(nextMon.toISOString().slice(0, 10)).toBe('2026-09-21');
    });
  });

  describe('create', () => {
    const validDto = { projectId: 'p1', taskId: 't1', activityId: 'a1', date: '2026-09-10', hours: 8 };
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };

    it('should create successfully', async () => {
      setupMocks();
      vi.mocked(db.orm.public.TimeEntry.create).mockResolvedValueOnce({ id: 'te1', ...validDto, remarks: null } as any);

      const result = await service.create(validDto, authCtx);
      expect(result.id).toBe('te1');
      expect(db.orm.public.TimeEntry.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee missing', async () => {
      setupMocks({ employee: null });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if cross-organization', async () => {
      setupMocks({ employee: { id: 'e1', isActive: true, organizationId: 'org2' } });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if employee not assigned to project', async () => {
      setupMocks({ assignment: null });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if project is inactive', async () => {
      setupMocks({ project: { id: 'p1', isActive: false, organizationId: 'org1' } });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if task inactive', async () => {
      setupMocks({ task: { id: 't1', projectId: 'p1', isActive: false } });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if activity from wrong project', async () => {
      setupMocks({ activity: { id: 'a1', projectId: 'p2', isActive: true } });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if timesheet is SUBMITTED', async () => {
      setupMocks({ timesheet: { id: 'ts1', status: 'SUBMITTED' } });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if timesheet is APPROVED', async () => {
      setupMocks({ timesheet: { id: 'ts1', status: 'APPROVED' } });
      await expect(service.create(validDto, authCtx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllByEmployee', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };

    it('should return paginated entries', async () => {
      setupMocks();
      const entries = [
        { id: '1', date: '2026-09-09', createdAt: new Date('2026-09-09') },
        { id: '2', date: '2026-09-10', createdAt: new Date('2026-09-10') }
      ];
      vi.mocked(db.orm.public.TimeEntry.where).mockReturnValueOnce({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              all: vi.fn(() => Promise.resolve(entries))
            }))
          }))
        }))
      } as any);
      vi.mocked(db.orm.public.TimeEntry.all).mockResolvedValueOnce(entries as any);

      const result = await service.findAllByEmployee('e1', authCtx, 1, 50);
      expect(result.data.length).toBe(2);
      expect(result.meta.total).toBe(2);
    });

    it('should throw NotFoundException if employee missing', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.findAllByEmployee('e1', authCtx, 1, 50)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
    
    it('should return entry', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e1' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e1', organizationId: 'org1' } as any);
      expect(await service.findOne('te1', authCtx)).toEqual({ id: 'te1', employeeId: 'e1' });
    });

    it('should throw NotFoundException if time entry belongs to another organization', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e2' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e2', organizationId: 'org2' } as any); // different org
      await expect(service.findOne('te1', authCtx)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if time entry belongs to another employee and user is not manager', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e2' } as any);
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce({ id: 'e2', organizationId: 'org1', teamId: null } as any); // same org, no team
      await expect(service.findOne('te1', authCtx)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };

    it('should update successfully with full revalidation', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e1', projectId: 'p1', taskId: 't1', activityId: 'a1', date: '2026-09-15' } as any);
      setupMocks();
      vi.mocked(db.orm.public.TimeEntry.update).mockResolvedValueOnce({ id: 'te1', hours: 4 } as any);

      const result = await service.update('te1', { hours: 4 }, authCtx);
      expect(result).toEqual({ id: 'te1', hours: 4 });
      expect(db.orm.public.TimeEntry.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if existing timesheet is SUBMITTED', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e1', projectId: 'p1', taskId: 't1', activityId: 'a1', date: '2026-09-15' } as any);
      setupMocks({ timesheet: { id: 'ts1', status: 'SUBMITTED' } });
      await expect(service.update('te1', { hours: 5 }, authCtx)).rejects.toThrow(ForbiddenException);
    });

    it('should return existing if empty update', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e1', date: '2026-09-10', timesheetId: 'ts1' } as any);
      setupMocks();
      const result = await service.update('te1', {}, authCtx);
      expect(result).toEqual({ id: 'te1', employeeId: 'e1', date: '2026-09-10', timesheetId: 'ts1' });
      expect(db.orm.public.TimeEntry.update).not.toHaveBeenCalled();
    });
  });

  describe('concurrency', () => {
    const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };

    it('should handle getOrCreateTimesheet race conditions by catching P2002', async () => {
      setupMocks();
      
      // Setup the Timesheet.first to return null initially, then return the created object on next call
      vi.mocked(db.orm.public.Timesheet.first)
        .mockResolvedValueOnce(null as any) // first try
        .mockResolvedValueOnce({ id: 'ts1', status: 'DRAFT' } as any); // fallback after P2002

      // Simulate the unique constraint failure P2002
      vi.mocked(db.orm.public.Timesheet.create).mockRejectedValueOnce({ code: 'P2002', message: 'Unique constraint failed' });

      const validDto = { projectId: 'p1', taskId: 't1', activityId: 'a1', date: '2026-09-10', hours: 8 };
      vi.mocked(db.orm.public.TimeEntry.create).mockResolvedValueOnce({ id: 'te1', ...validDto, remarks: null } as any);

      const result = await service.create(validDto, authCtx);
      
      expect(result.id).toBe('te1');
      // Verify that it tried to create, failed, and fell back to first()
      expect(db.orm.public.Timesheet.create).toHaveBeenCalledTimes(1);
      expect(db.orm.public.Timesheet.first).toHaveBeenCalledTimes(2);
    });
  });
});
