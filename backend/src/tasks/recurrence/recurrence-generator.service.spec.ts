import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecurrenceGeneratorService } from './recurrence-generator.service.js';
import { db } from '../../prisma/db.js';
import { encodeTaskDescriptionWithMetadata } from '../tasks.service.js';
import { RecurrenceConfig } from './recurrence.types.js';

describe('RecurrenceGeneratorService', () => {
  let service: RecurrenceGeneratorService;
  const mockNotificationsService = {
    createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecurrenceGeneratorService(mockNotificationsService);
  });

  describe('processDueRecurringTasks', () => {
    it('skips tasks that are scheduled in the future', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2); // 2 days in future
      const recurrenceConfig: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-20',
        nextScheduledAt: futureDate.toISOString(),
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const mockCandidateTask = {
        id: 'task-1',
        projectId: 'proj-1',
        name: 'Daily Report',
        ticketId: 'PRJ-10',
        description: encodeTaskDescriptionWithMetadata('Daily status report', { recurrenceConfig }),
        recurrence: 'DAILY',
        nextOccurrenceId: null,
        isActive: true,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        startDate: null,
        dueDate: null,
        estimatedHours: 2,
        assigneeId: 'emp-1',
        creatorId: 'mgr-1',
      };

      // Mock db.orm.public.Task.where().all()
      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        where: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue([mockCandidateTask]),
          }),
        }),
      })) as any);

      const summary = await service.processDueRecurringTasks(new Date());

      expect(summary.checked).toBe(1);
      expect(summary.generated).toBe(0);
      expect(summary.skipped).toBe(1);
    });

    it('generates next occurrence for due recurring task and resets status to TODO', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const recurrenceConfig: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-20',
        nextScheduledAt: pastDate.toISOString(),
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const mockTask = {
        id: 'task-1',
        projectId: 'proj-1',
        name: 'Daily Report',
        ticketId: 'PRJ-10',
        description: encodeTaskDescriptionWithMetadata('Daily status report', { recurrenceConfig }),
        recurrence: 'DAILY',
        nextOccurrenceId: null,
        isActive: true,
        priority: 'HIGH',
        status: 'COMPLETED', // original was completed
        startDate: pastDate,
        dueDate: pastDate,
        estimatedHours: 4,
        assigneeId: 'emp-1',
        creatorId: 'mgr-1',
        requirementId: null,
        milestoneId: null,
        parentTaskId: null,
      };

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        where: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue([mockTask]),
          }),
        }),
      })) as any);

      let createdTaskPayload: any = null;
      let previousTaskUpdate: any = null;

      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Task: {
                where: () => ({
                  first: vi.fn().mockResolvedValue(mockTask),
                  update: vi.fn().mockImplementation((data) => {
                    previousTaskUpdate = data;
                    return Promise.resolve({ ...mockTask, ...data });
                  }),
                }),
                create: vi.fn().mockImplementation((data) => {
                  createdTaskPayload = data;
                  return Promise.resolve({ id: 'task-2', ...data });
                }),
              },
              Project: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({
                    id: 'proj-1',
                    code: 'PRJ',
                    taskSequence: 10,
                    isActive: true,
                    status: 'IN_PROGRESS',
                  }),
                  update: vi.fn().mockResolvedValue({}),
                }),
              },
              Employee: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({ id: 'emp-1', isActive: true }),
                }),
              },
              EmployeeProject: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({ id: 'ep-1', employeeId: 'emp-1', projectId: 'proj-1' }),
                }),
              },
            },
          },
        };
        return await callback(tx);
      });

      const summary = await service.processDueRecurringTasks(new Date());

      expect(summary.checked).toBe(1);
      expect(summary.generated).toBe(1);
      expect(summary.skipped).toBe(0);

      // Verify created task properties
      expect(createdTaskPayload).not.toBeNull();
      expect(createdTaskPayload.projectId).toBe('proj-1');
      expect(createdTaskPayload.name).toBe('Daily Report (#2)');
      expect(createdTaskPayload.status).toBe('TODO'); // Reset to TODO
      expect(createdTaskPayload.priority).toBe('HIGH');
      expect(createdTaskPayload.assigneeId).toBe('emp-1');
      expect(createdTaskPayload.ticketId).toBe('PRJ-11');
      expect(createdTaskPayload.recurrence).toBe('DAILY');
      expect(createdTaskPayload.nextOccurrenceId).toBeNull();

      // Verify previous task was linked
      expect(previousTaskUpdate).toEqual({ nextOccurrenceId: 'task-2' });
      // Verify notification sent
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('prevents duplicate generation if task was already processed concurrently', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const recurrenceConfig: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-20',
        nextScheduledAt: pastDate.toISOString(),
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const mockTask = {
        id: 'task-1',
        projectId: 'proj-1',
        name: 'Daily Standup',
        ticketId: 'PRJ-5',
        description: encodeTaskDescriptionWithMetadata('Daily standup sync', { recurrenceConfig }),
        recurrence: 'DAILY',
        nextOccurrenceId: null,
        isActive: true,
      };

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        where: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue([mockTask]),
          }),
        }),
      })) as any);

      // Inside transaction, currentTask already has nextOccurrenceId set by another concurrent worker
      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Task: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({
                    ...mockTask,
                    nextOccurrenceId: 'task-already-created-by-worker-1',
                  }),
                }),
                create: vi.fn(),
              },
            },
          },
        };
        return await callback(tx);
      });

      const summary = await service.processDueRecurringTasks(new Date());

      expect(summary.checked).toBe(1);
      expect(summary.generated).toBe(0);
      expect(summary.skipped).toBe(1);
      expect(summary.details[0].reason).toContain('Already generated');
    });

    it('stops recurrence when end condition (AFTER_COUNT) is met on new occurrence', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const recurrenceConfig: RecurrenceConfig = {
        frequency: 'WEEKLY',
        interval: 1,
        scheduleStart: '2026-10-01',
        nextScheduledAt: pastDate.toISOString(),
        endType: 'AFTER_COUNT',
        maxOccurrences: 2,
        occurrenceIndex: 1, // Currently on occurrence 1, so next is occurrence 2 (the final one)
        timezone: 'Asia/Kolkata',
      };

      const mockTask = {
        id: 'task-1',
        projectId: 'proj-1',
        name: 'Weekly Review',
        ticketId: 'PRJ-20',
        description: encodeTaskDescriptionWithMetadata('Weekly sprint review', { recurrenceConfig }),
        recurrence: 'WEEKLY',
        nextOccurrenceId: null,
        isActive: true,
        priority: 'MEDIUM',
        status: 'TODO',
      };

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        where: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue([mockTask]),
          }),
        }),
      })) as any);

      let createdTaskPayload: any = null;

      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Task: {
                where: () => ({
                  first: vi.fn().mockResolvedValue(mockTask),
                  update: vi.fn().mockResolvedValue({}),
                }),
                create: vi.fn().mockImplementation((data) => {
                  createdTaskPayload = data;
                  return Promise.resolve({ id: 'task-2', ...data });
                }),
              },
              Project: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({ id: 'proj-1', code: 'PRJ', taskSequence: 20, isActive: true }),
                  update: vi.fn().mockResolvedValue({}),
                }),
              },
              Employee: { where: () => ({ first: vi.fn().mockResolvedValue(null) }) },
              EmployeeProject: { where: () => ({ first: vi.fn().mockResolvedValue(null) }) },
            },
          },
        };
        return await callback(tx);
      });

      const summary = await service.processDueRecurringTasks(new Date());

      expect(summary.generated).toBe(1);
      // Because occurrence 2 is the maximum, recurrence is terminated (recurrence: null)
      expect(createdTaskPayload.recurrence).toBeNull();
    });

    it('handles inactive project or unassigned inactive employee safely', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const recurrenceConfig: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-20',
        nextScheduledAt: pastDate.toISOString(),
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const mockTask = {
        id: 'task-1',
        projectId: 'proj-1',
        name: 'Daily Check',
        ticketId: 'PRJ-30',
        description: encodeTaskDescriptionWithMetadata('Daily sync', { recurrenceConfig }),
        recurrence: 'DAILY',
        nextOccurrenceId: null,
        isActive: true,
        assigneeId: 'departed-employee',
      };

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        where: () => ({
          where: () => ({
            all: vi.fn().mockResolvedValue([mockTask]),
          }),
        }),
      })) as any);

      // Project is COMPLETED
      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Task: {
                where: () => ({
                  first: vi.fn().mockResolvedValue(mockTask),
                }),
              },
              Project: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({
                    id: 'proj-1',
                    code: 'PRJ',
                    isActive: true,
                    status: 'COMPLETED', // Completed project!
                  }),
                }),
              },
            },
          },
        };
        return await callback(tx);
      });

      const summary = await service.processDueRecurringTasks(new Date());

      expect(summary.checked).toBe(1);
      expect(summary.generated).toBe(0);
      expect(summary.skipped).toBe(1);
      expect(summary.details[0].reason).toContain('COMPLETED');
    });
  });

  describe('TasksService - Recurrence Persistence & Management', () => {
    it('creates a one-time task without recurrence configuration', async () => {
      const { TasksService } = await import('../tasks.service.js');
      const tasksService = new TasksService(mockNotificationsService);

      const auth: any = {
        organizationId: 'org-1',
        employeeId: 'emp-1',
        roles: ['MANAGER'],
      };

      // Mock Project & EmployeeProject
      vi.spyOn(db.orm.public.Project, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue({ id: 'proj-1', organizationId: 'org-1', isActive: true, status: 'IN_PROGRESS', code: 'PRJ', taskSequence: 1 }),
        update: vi.fn().mockResolvedValue({}),
      })) as any);

      vi.spyOn(db.orm.public.EmployeeProject, 'where').mockImplementation((() => ({
        where: () => ({
          first: vi.fn().mockResolvedValue({ id: 'ep-1', employeeId: 'emp-1', projectId: 'proj-1' }),
        }),
      })) as any);

      vi.spyOn(db.orm.public.Team, 'where').mockImplementation((() => ({
        all: vi.fn().mockResolvedValue([]),
      })) as any);

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue(null),
      })) as any);

      let createdTaskRecord: any = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Project: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({ id: 'proj-1', code: 'PRJ', taskSequence: 1 }),
                  update: vi.fn().mockResolvedValue({}),
                }),
              },
              Task: {
                create: vi.fn().mockImplementation((data) => {
                  createdTaskRecord = { id: 'task-new', ...data };
                  return Promise.resolve(createdTaskRecord);
                }),
                where: () => ({ update: vi.fn().mockResolvedValue({}) }),
              },
            },
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.create('proj-1', {
        name: 'Simple One-Time Task',
        status: 'TODO',
        isActive: true,
        description: 'Plain description',
      }, auth);

      expect(result.name).toBe('Simple One-Time Task');
      expect(result.recurrence).toBeNull();
      expect(result.metadata?.recurrenceConfig).toBeUndefined();
    });

    it('creates a recurring task with persisted schedule and next occurrence', async () => {
      const { TasksService } = await import('../tasks.service.js');
      const tasksService = new TasksService(mockNotificationsService);

      const auth: any = {
        organizationId: 'org-1',
        employeeId: 'emp-1',
        roles: ['MANAGER'],
      };

      vi.spyOn(db.orm.public.Project, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue({ id: 'proj-1', organizationId: 'org-1', isActive: true, status: 'IN_PROGRESS', code: 'PRJ', taskSequence: 5 }),
        update: vi.fn().mockResolvedValue({}),
      })) as any);

      vi.spyOn(db.orm.public.EmployeeProject, 'where').mockImplementation((() => ({
        where: () => ({
          first: vi.fn().mockResolvedValue({ id: 'ep-1', employeeId: 'emp-1', projectId: 'proj-1' }),
        }),
      })) as any);

      vi.spyOn(db.orm.public.Team, 'where').mockImplementation((() => ({
        all: vi.fn().mockResolvedValue([]),
      })) as any);

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue(null),
      })) as any);

      let createdTaskRecord: any = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Project: {
                where: () => ({
                  first: vi.fn().mockResolvedValue({ id: 'proj-1', code: 'PRJ', taskSequence: 5 }),
                  update: vi.fn().mockResolvedValue({}),
                }),
              },
              Task: {
                create: vi.fn().mockImplementation((data) => {
                  createdTaskRecord = { id: 'task-rec-1', ...data };
                  return Promise.resolve(createdTaskRecord);
                }),
                where: () => ({
                  update: vi.fn().mockImplementation((data) => {
                    Object.assign(createdTaskRecord, data);
                    return Promise.resolve(createdTaskRecord);
                  }),
                }),
              },
            },
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.create('proj-1', {
        name: 'Weekly Standup',
        status: 'TODO',
        isActive: true,
        description: 'Team weekly check-in',
        recurrence: 'WEEKLY',
        metadata: {
          recurrenceConfig: {
            frequency: 'WEEKLY',
            interval: 1,
            weekdays: [1], // Monday
            scheduleStart: '2026-10-19',
            endType: 'NEVER',
            timezone: 'Asia/Kolkata',
          },
        },
      }, auth);

      expect(result.recurrence).toBe('WEEKLY');
      expect(result.metadata.recurrenceConfig).toBeDefined();
      expect(result.metadata.recurrenceConfig.frequency).toBe('WEEKLY');
      expect(result.metadata.recurrenceConfig.occurrenceIndex).toBe(1);
      expect(result.metadata.recurrenceConfig.seriesId).toBe('task-rec-1');
      expect(result.metadata.recurrenceConfig.nextScheduledAt).toBeDefined();
    });

    it('cancels recurrence when task is updated with recurrence = null', async () => {
      const { TasksService } = await import('../tasks.service.js');
      const tasksService = new TasksService(mockNotificationsService);

      const auth: any = {
        organizationId: 'org-1',
        employeeId: 'emp-1',
        roles: ['MANAGER'],
      };

      const existingTask = {
        id: 'task-rec-1',
        projectId: 'proj-1',
        name: 'Weekly Standup',
        description: encodeTaskDescriptionWithMetadata('Team weekly check-in', {
          recurrenceConfig: {
            frequency: 'WEEKLY',
            interval: 1,
            nextScheduledAt: '2026-10-26T00:00:00.000Z',
          },
        }),
        recurrence: 'WEEKLY',
        status: 'TODO',
        isActive: true,
      };

      vi.spyOn(db.orm.public.Task, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue(existingTask),
      })) as any);

      vi.spyOn(db.orm.public.Project, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue({ id: 'proj-1', organizationId: 'org-1', isActive: true, status: 'IN_PROGRESS' }),
      })) as any);

      vi.spyOn(db.orm.public.EmployeeProject, 'where').mockImplementation((() => ({
        where: () => ({
          first: vi.fn().mockResolvedValue({ id: 'ep-1', employeeId: 'emp-1', projectId: 'proj-1' }),
        }),
      })) as any);

      vi.spyOn(db.orm.public.Team, 'where').mockImplementation((() => ({
        all: vi.fn().mockResolvedValue([]),
      })) as any);

      let updatedTaskRecord: any = null;
      vi.spyOn(db, 'transaction').mockImplementation(async (callback: any) => {
        const tx = {
          orm: {
            public: {
              Task: {
                where: () => ({
                  first: vi.fn().mockResolvedValue(existingTask),
                  update: vi.fn().mockImplementation((data) => {
                    updatedTaskRecord = { ...existingTask, ...data };
                    return Promise.resolve(updatedTaskRecord);
                  }),
                }),
              },
            },
          },
        };
        return await callback(tx);
      });

      const result = await tasksService.update('task-rec-1', {
        recurrence: null,
      }, auth);

      expect(result.recurrence).toBeNull();
      expect(result.metadata?.recurrenceConfig).toBeUndefined();
    });

    it('enforces strict organization isolation and rejects cross-organization task mutations', async () => {
      const { TasksService } = await import('../tasks.service.js');
      const tasksService = new TasksService(mockNotificationsService);

      const crossOrgAuth: any = {
        organizationId: 'org-attacker',
        employeeId: 'emp-attacker',
        roles: ['ADMIN'],
      };

      // Project belongs to org-victim, so query where({ id, organizationId: 'org-attacker' }) returns null
      vi.spyOn(db.orm.public.Project, 'where').mockImplementation((() => ({
        first: vi.fn().mockResolvedValue(null),
      })) as any);

      await expect(
        tasksService.create('proj-victim', {
          name: 'Intrusion Task',
          status: 'TODO',
          isActive: true,
        }, crossOrgAuth)
      ).rejects.toThrow('Project not found');
    });
  });
});


