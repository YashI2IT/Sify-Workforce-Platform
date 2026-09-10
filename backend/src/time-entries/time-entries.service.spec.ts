import { Test, TestingModule } from '@nestjs/testing';
import { TimeEntriesService } from './time-entries.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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
      providers: [TimeEntriesService],
    }).compile();

    service = module.get<TimeEntriesService>(TimeEntriesService);
  });

  const setupMocks = (overrides: any = {}) => {
    vi.mocked(db.orm.public.Employee.first).mockResolvedValue({ id: 'e1', isActive: true, organizationId: 'org1' } as any);
    vi.mocked(db.orm.public.Project.first).mockResolvedValue({ id: 'p1', isActive: true, organizationId: 'org1' } as any);
    vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValue({ employeeId: 'e1', projectId: 'p1' } as any);
    vi.mocked(db.orm.public.Task.first).mockResolvedValue({ id: 't1', projectId: 'p1', isActive: true } as any);
    vi.mocked(db.orm.public.Activity.first).mockResolvedValue({ id: 'a1', projectId: 'p1', isActive: true } as any);

    if (overrides['employee'] !== undefined) vi.mocked(db.orm.public.Employee.first).mockResolvedValue(overrides['employee']);
    if (overrides['project'] !== undefined) vi.mocked(db.orm.public.Project.first).mockResolvedValue(overrides['project']);
    if (overrides['assignment'] !== undefined) vi.mocked(db.orm.public.EmployeeProject.first).mockResolvedValue(overrides['assignment']);
    if (overrides['task'] !== undefined) vi.mocked(db.orm.public.Task.first).mockResolvedValue(overrides['task']);
    if (overrides['activity'] !== undefined) vi.mocked(db.orm.public.Activity.first).mockResolvedValue(overrides['activity']);
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const validDto = { employeeId: 'e1', projectId: 'p1', taskId: 't1', activityId: 'a1', date: '2026-09-10', hours: 8 };

    it('should create successfully', async () => {
      setupMocks();
      vi.mocked(db.orm.public.TimeEntry.create).mockResolvedValueOnce({ id: 'te1', ...validDto, remarks: null } as any);

      const result = await service.create(validDto);
      expect(result.id).toBe('te1');
      expect(db.orm.public.TimeEntry.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee missing', async () => {
      setupMocks({ employee: null });
      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if cross-organization', async () => {
      setupMocks({ employee: { id: 'e1', isActive: true, organizationId: 'org2' } });
      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if task inactive', async () => {
      setupMocks({ task: { id: 't1', projectId: 'p1', isActive: false } });
      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if activity from wrong project', async () => {
      setupMocks({ activity: { id: 'a1', projectId: 'p2', isActive: true } });
      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllByEmployee', () => {
    it('should return entries sorted', async () => {
      setupMocks();
      const entries = [
        { id: '1', date: '2026-09-09', createdAt: new Date('2026-09-09') },
        { id: '2', date: '2026-09-10', createdAt: new Date('2026-09-10') },
      ];
      vi.mocked(db.orm.public.TimeEntry.all).mockResolvedValueOnce(entries as any);

      const result = await service.findAllByEmployee('e1');
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
    });

    it('should throw NotFoundException if employee missing', async () => {
      vi.mocked(db.orm.public.Employee.first).mockResolvedValueOnce(null);
      await expect(service.findAllByEmployee('e1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return entry', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1' } as any);
      expect(await service.findOne('te1')).toEqual({ id: 'te1' });
    });
  });

  describe('update', () => {
    it('should update successfully with full revalidation', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1', employeeId: 'e1', projectId: 'p1', taskId: 't1', activityId: 'a1' } as any);
      setupMocks();
      vi.mocked(db.orm.public.TimeEntry.update).mockResolvedValueOnce({ id: 'te1', hours: 4 } as any);

      const result = await service.update('te1', { hours: 4 });
      expect(result).toEqual({ id: 'te1', hours: 4 });
      expect(db.orm.public.TimeEntry.update).toHaveBeenCalled();
    });

    it('should return existing if empty update', async () => {
      vi.mocked(db.orm.public.TimeEntry.first).mockResolvedValueOnce({ id: 'te1' } as any);
      const result = await service.update('te1', {});
      expect(result).toEqual({ id: 'te1' });
      expect(db.orm.public.TimeEntry.update).not.toHaveBeenCalled();
    });
  });
});
