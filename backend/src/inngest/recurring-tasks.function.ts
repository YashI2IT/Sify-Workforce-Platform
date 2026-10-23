import { inngest } from './inngest.client.js';
import { RecurrenceGeneratorService } from '../tasks/recurrence/recurrence-generator.service.js';

export function createRecurringTasksFunction(generatorService: RecurrenceGeneratorService) {
  const defaultCron = 'TZ=Asia/Kolkata 0 0 * * *';
  const cronSchedule = process.env.RECURRENCE_CRON_SCHEDULE || defaultCron;
  const triggers: Array<{ cron: string } | { event: string }> = [
    { event: 'sify/tasks.recurrence.check' },
  ];

  if (cronSchedule && cronSchedule !== 'disabled' && cronSchedule !== 'false') {
    triggers.unshift({ cron: cronSchedule });
  }

  return inngest.createFunction(
    {
      id: 'process-recurring-tasks',
      name: 'Process Due Recurring Tasks',
      triggers,
    },
    async ({ step }) => {
      const summary = await step.run('generate-due-occurrences', async () => {
        return await generatorService.processDueRecurringTasks();
      });

      return {
        success: true,
        summary,
      };
    }
  );
}
