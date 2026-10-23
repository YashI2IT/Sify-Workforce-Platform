import { Injectable, Logger } from '@nestjs/common';
import { db } from '../../prisma/db.js';
import { 
  decodeTaskDescriptionWithMetadata, 
  encodeTaskDescriptionWithMetadata 
} from '../tasks.service.js';
import { RecurrenceConfig, RecurrenceFrequency } from './recurrence.types.js';
import { computeNextOccurrence, computeInitialSchedule } from './recurrence.calculator.js';
import { NotificationsService } from '../../notifications/notifications.service.js';

export interface GenerationSummary {
  checked: number;
  generated: number;
  skipped: number;
  errors: number;
  details: Array<{
    taskId: string;
    ticketId?: string;
    taskName?: string;
    recurrenceRule?: string;
    newTaskId?: string;
    newTicketId?: string;
    newTaskName?: string;
    nextScheduledAt?: string;
    status: 'GENERATED' | 'AWAITING_SCHEDULE' | 'SKIPPED' | 'ERROR';
    reason?: string;
  }>;
}

export function toSafeDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val?.epochMilliseconds === 'number') return new Date(val.epochMilliseconds);
  if (typeof val?.toString === 'function') {
    const s = val.toString();
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(val);
}

@Injectable()
export class RecurrenceGeneratorService {
  private readonly logger = new Logger(RecurrenceGeneratorService.name);

  constructor(private readonly notificationsService?: NotificationsService) {}

  /**
   * Evaluates all active recurring tasks where nextOccurrenceId is null.
   * If scheduled occurrence is due (<= now), generates the next occurrence
   * safely in an idempotent database transaction.
   *
   * Catch-up Policy:
   * Generates the pending due occurrence. If prolonged server downtime caused
   * the recurrence to lag behind, the schedule is advanced forward to the next
   * valid upcoming cycle so only one task per series is generated per run,
   * avoiding cascade board floods.
   */
  async processDueRecurringTasks(referenceTime = new Date()): Promise<GenerationSummary> {
    this.logger.log('[RecurringTaskCron] run_started');

    const summary: GenerationSummary = {
      checked: 0,
      generated: 0,
      skipped: 0,
      errors: 0,
      details: [],
    };

    // Find all active candidate tasks that have recurrence defined and have not spawned a successor
    const candidates = await db.orm.public.Task
      .where({ isActive: true })
      .where(t => (t as any).recurrence.isNotNull())
      .where(t => (t as any).nextOccurrenceId.isNull())
      .all();

    summary.checked = candidates.length;

    // Count how many candidates are currently due
    let dueCandidatesCount = 0;
    for (const t of candidates) {
      try {
        const dec = decodeTaskDescriptionWithMetadata(t.description);
        const sched = dec.metadata?.recurrenceConfig?.nextScheduledAt 
          ? toSafeDate(dec.metadata.recurrenceConfig.nextScheduledAt)
          : (t.startDate ? toSafeDate(t.startDate) : (t.createdAt ? toSafeDate(t.createdAt) : new Date(0)));
        if (sched.getTime() <= referenceTime.getTime()) {
          dueCandidatesCount++;
        }
      } catch {
        // ignore count error
      }
    }
    this.logger.log(`[RecurringTaskCron] due_series_found count=${dueCandidatesCount}`);

    for (const task of candidates) {
      try {
        const decoded = decodeTaskDescriptionWithMetadata(task.description);
        let config: RecurrenceConfig | undefined = decoded.metadata?.recurrenceConfig;

        // If recurrence configuration metadata is not yet populated, synthesize it from task fields
        if (!config || !config.nextScheduledAt) {
          const baseDate = task.startDate 
            ? toSafeDate(task.startDate) 
            : (task.createdAt ? toSafeDate(task.createdAt) : new Date());

          const initialDate = computeInitialSchedule({
            frequency: (task.recurrence as RecurrenceFrequency) || 'DAILY',
            interval: 1,
            scheduleStart: baseDate.toISOString().split('T')[0],
            endType: 'NEVER',
            timezone: 'Asia/Kolkata',
          }, referenceTime);

          config = {
            frequency: (task.recurrence as RecurrenceFrequency) || 'DAILY',
            interval: 1,
            scheduleStart: baseDate.toISOString().split('T')[0],
            nextScheduledAt: initialDate.toISOString(),
            endType: 'NEVER',
            occurrenceIndex: 1,
            seriesId: task.id,
            timezone: 'Asia/Kolkata',
          };
        }

        const scheduledDate = toSafeDate(config.nextScheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          summary.skipped++;
          summary.details.push({
            taskId: task.id,
            ticketId: task.ticketId,
            taskName: task.name,
            status: 'SKIPPED',
            reason: 'Invalid nextScheduledAt date',
          });
          continue;
        }

        // If not yet due, report awaiting schedule with human-readable date
        if (scheduledDate.getTime() > referenceTime.getTime()) {
          summary.skipped++;
          summary.details.push({
            taskId: task.id,
            ticketId: task.ticketId,
            taskName: task.name,
            recurrenceRule: `${config.frequency} (interval: ${config.interval})`,
            status: 'AWAITING_SCHEDULE',
            nextScheduledAt: scheduledDate.toISOString(),
            reason: `Next occurrence scheduled for ${scheduledDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          });
          continue;
        }

        // It is due! Compute next occurrence and advance schedule
        const nextOccurrenceResult = computeNextOccurrence(config, scheduledDate);

        // Catch-up policy: if the next date would also be in the past, advance until future or finished
        let advancedNextResult = nextOccurrenceResult;
        let advancedIndex = (config.occurrenceIndex || 1) + 1;
        while (
          !advancedNextResult.isFinished && 
          advancedNextResult.nextDate && 
          advancedNextResult.nextDate.getTime() <= referenceTime.getTime()
        ) {
          advancedIndex++;
          advancedNextResult = computeNextOccurrence({
            ...config,
            occurrenceIndex: advancedIndex,
          }, advancedNextResult.nextDate);
        }

        // Execute task generation in an atomic transaction with duplicate protection
        const result = await db.transaction(async (tx) => {
          // Re-verify that task has not been processed concurrently
          const currentTask = await tx.orm.public.Task.where({ id: task.id }).first();
          if (!currentTask || currentTask.nextOccurrenceId !== null || !currentTask.isActive || !currentTask.recurrence) {
            return { skipped: true, reason: 'Already generated or cancelled' };
          }

          // Verify project is active and not finished
          const project = await tx.orm.public.Project.where({ id: task.projectId }).first();
          if (!project || !project.isActive || project.status === 'COMPLETED' || project.status === 'ON_HOLD') {
            return { skipped: true, reason: `Project is ${project?.status || 'inactive'}` };
          }

          // Check assignee validity
          let effectiveAssigneeId: string | null = null;
          let assigneeName = 'Unassigned';
          if (task.assigneeId) {
            const assignee = await tx.orm.public.Employee.where({ id: task.assigneeId, isActive: true }).first();
            if (assignee) {
              const projectMember = await tx.orm.public.EmployeeProject
                .where({ employeeId: task.assigneeId, projectId: task.projectId })
                .first();
              if (projectMember) {
                effectiveAssigneeId = task.assigneeId;
                assigneeName = assignee.name;
              }
            }
          }

          // Increment project task sequence
          const nextSequence = (project.taskSequence || 0) + 1;
          await tx.orm.public.Project.where({ id: task.projectId }).update({ taskSequence: nextSequence });
          const newTicketId = `${project.code}-${nextSequence}`;

          // Format new task name with occurrence index
          const nextIndex = (config.occurrenceIndex || 1) + 1;
          const cleanBaseName = task.name.replace(/\s*\(#\d+\)$/, '').trim();
          const occurrenceName = `${cleanBaseName} (#${nextIndex})`;

          // Determine start and due dates for new occurrence
          let occurrenceStartDate: any = null;
          let occurrenceDueDate: any = null;

          if (task.startDate && task.dueDate) {
            const originalStart = toSafeDate(task.startDate).getTime();
            const originalDue = toSafeDate(task.dueDate).getTime();
            const duration = Math.max(0, originalDue - originalStart);
            const startDt = toSafeDate(scheduledDate);
            const dueDt = new Date(startDt.getTime() + duration);
            occurrenceStartDate = (globalThis as any).Temporal?.Instant?.from
              ? (globalThis as any).Temporal.Instant.from(startDt.toISOString())
              : startDt;
            occurrenceDueDate = (globalThis as any).Temporal?.Instant?.from
              ? (globalThis as any).Temporal.Instant.from(dueDt.toISOString())
              : dueDt;
          } else if (task.dueDate) {
            occurrenceDueDate = (globalThis as any).Temporal?.Instant?.from
              ? (globalThis as any).Temporal.Instant.from(toSafeDate(scheduledDate).toISOString())
              : toSafeDate(scheduledDate);
          } else if (task.startDate) {
            occurrenceStartDate = (globalThis as any).Temporal?.Instant?.from
              ? (globalThis as any).Temporal.Instant.from(toSafeDate(scheduledDate).toISOString())
              : toSafeDate(scheduledDate);
          }

          // Check if this newly generated occurrence is the final one in the series
          const subsequentResult = computeNextOccurrence(
            {
              ...config,
              occurrenceIndex: nextIndex,
            },
            advancedNextResult.nextDate || scheduledDate
          );

          const isFinished = subsequentResult.isFinished || !subsequentResult.nextDate;
          const newRecurrenceConfig: RecurrenceConfig | null = isFinished
            ? null
            : {
                ...config,
                occurrenceIndex: nextIndex,
                seriesId: config.seriesId || task.id,
                nextScheduledAt: subsequentResult.nextDate!.toISOString(),
                lastGeneratedAt: referenceTime.toISOString(),
              };

          const newMetadata = {
            ...(decoded.metadata || {}),
            recurrenceConfig: newRecurrenceConfig,
          };

          const newDescription = encodeTaskDescriptionWithMetadata(decoded.description, newMetadata);

          // Create the next occurrence task
          const createdTask = await tx.orm.public.Task.create({
            projectId: task.projectId,
            name: occurrenceName,
            description: newDescription,
            priority: task.priority,
            assigneeId: effectiveAssigneeId,
            creatorId: task.creatorId,
            requirementId: task.requirementId,
            milestoneId: task.milestoneId,
            parentTaskId: task.parentTaskId,
            startDate: occurrenceStartDate,
            dueDate: occurrenceDueDate,
            estimatedHours: task.estimatedHours,
            status: 'TODO',
            ticketId: newTicketId,
            recurrence: isFinished ? null : task.recurrence,
            nextOccurrenceId: null,
            isActive: true,
          });

          // Link previous task to the new occurrence via unique nextOccurrenceId
          await tx.orm.public.Task.where({ id: task.id }).update({
            nextOccurrenceId: createdTask.id,
          });

          // Send notification to assignee if assigned
          if (createdTask.assigneeId && this.notificationsService) {
            try {
              await this.notificationsService.createNotification({
                recipientId: createdTask.assigneeId,
                type: 'TASK_ASSIGNED',
                title: 'Recurring Task Occurrence Created',
                message: `New occurrence generated: ${createdTask.ticketId} - ${createdTask.name}`,
                relatedEntityType: 'TASK',
                relatedEntityId: `${createdTask.projectId}:${createdTask.id}`,
              }, tx);
            } catch (notifyErr: any) {
              this.logger.warn(`Failed to dispatch recurrence notification: ${notifyErr.message}`);
            }
          }

          return {
            skipped: false,
            createdTask,
            nextIndex,
            assigneeName,
            projectCode: project.code,
          };
        });

        if (result.skipped) {
          summary.skipped++;
          summary.details.push({
            taskId: task.id,
            ticketId: task.ticketId,
            taskName: task.name,
            recurrenceRule: `${config.frequency} (interval: ${config.interval})`,
            status: 'SKIPPED',
            reason: result.reason,
          });
        } else if (result.createdTask) {
          summary.generated++;
          summary.details.push({
            taskId: task.id,
            ticketId: task.ticketId,
            taskName: task.name,
            recurrenceRule: `${config.frequency} (interval: ${config.interval})`,
            newTaskId: result.createdTask.id,
            newTicketId: result.createdTask.ticketId,
            newTaskName: result.createdTask.name,
            nextScheduledAt: advancedNextResult.nextDate ? advancedNextResult.nextDate.toISOString() : undefined,
            status: 'GENERATED',
            reason: `Generated next occurrence ${result.createdTask.ticketId} (${result.createdTask.name}) successfully`,
          });
          const nextRunAt = advancedNextResult.nextDate ? advancedNextResult.nextDate.toISOString() : 'None';
          this.logger.log(`[RecurringTaskCron] occurrence_created project=${result.projectCode || task.ticketId?.split('-')[0]} assignee=${result.assigneeName || 'Unassigned'} taskId=${result.createdTask.id} ticketId=${result.createdTask.ticketId}`);
          this.logger.log(`[RecurringTaskCron] next_occurrence_scheduled nextRunAt=${nextRunAt}`);
          this.logger.log(`Generated recurring task occurrence ${result.createdTask.ticketId} from ${task.ticketId}`);
        }
      } catch (err: any) {
        summary.errors++;
        summary.details.push({
          taskId: task.id,
          ticketId: task.ticketId,
          taskName: task.name,
          status: 'ERROR',
          reason: err.message,
        });
        this.logger.error(`Error processing recurring task ${task.id}: ${err.message}`, err.stack);
      }
    }

    this.logger.log(`[RecurringTaskCron] run_completed created=${summary.generated} skipped=${summary.skipped} failed=${summary.errors}`);
    return summary;
  }
}
