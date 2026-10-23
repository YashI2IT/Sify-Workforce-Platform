import 'dotenv/config';
import { db } from '../dist/prisma/db.js';
import { decodeTaskDescriptionWithMetadata, encodeTaskDescriptionWithMetadata } from '../dist/tasks/tasks.service.js';

/**
 * Live Recurring Task Demonstration Helper for Team Lead
 * Project: Enterprise Client Onboarding Q4 (PRJ-ONB-Q4)
 * Assignee: Arjun Patel (arjun.patel@gmail.com)
 */

const PROJECT_ID = '11f88555-daeb-4420-9a6e-044660e0ddd3';
const ASSIGNEE_EMAIL = 'arjun.patel@gmail.com';
const ASSIGNEE_ID = '5eebe186-4bf9-4143-add0-965e658381c0';
const TASK_BASE_NAME = 'DEMO - Automated Project Status Report';

async function runDemo() {
  const mode = process.argv[2] || 'status';

  if (mode === 'status') {
    console.log('\n--- 1. Database Verification ---');
    const project = await db.orm.public.Project.where({ id: PROJECT_ID }).first();
    const assignee = await db.orm.public.Employee.where({ id: ASSIGNEE_ID }).first();
    const membership = await db.orm.public.EmployeeProject.where({ projectId: PROJECT_ID, employeeId: ASSIGNEE_ID }).first();

    console.log(`Target Project: ${project?.name} [${project?.code}] (Active: ${project?.isActive}, Sequence: ${project?.taskSequence})`);
    console.log(`Target Assignee: ${assignee?.name} <${assignee?.email}> (Role: ${assignee?.role}, Active: ${assignee?.isActive})`);
    console.log(`Project Membership: ${membership ? 'CONFIRMED' : 'MISSING'}`);

    console.log('\n--- 2. Current Project Tasks ---');
    const tasks = await db.orm.public.Task.where({ projectId: PROJECT_ID }).all();
    for (const t of tasks) {
      const decoded = decodeTaskDescriptionWithMetadata(t.description);
      console.log(`- [${t.ticketId}] "${t.name}"`);
      console.log(`    Status: ${t.status} | Recurrence: ${t.recurrence || 'None'} | NextOccurrenceId: ${t.nextOccurrenceId || 'None'}`);
      if (decoded.metadata?.recurrenceConfig) {
        console.log(`    Recurrence Config:`, JSON.stringify(decoded.metadata.recurrenceConfig));
      }
    }
  } else if (mode === 'trigger-check') {
    console.log('\n--- Triggering Inngest Scheduled Recurrence Evaluation ---');
    const { RecurrenceGeneratorService } = await import('../dist/tasks/recurrence/recurrence-generator.service.js');
    const generator = new RecurrenceGeneratorService();
    const result = await generator.processDueRecurringTasks();
    console.log('Execution Result:', JSON.stringify(result, null, 2));
  } else if (mode === 'disable') {
    console.log('\n--- Disabling Recurring Task Series ---');
    const tasks = await db.orm.public.Task.where({ projectId: PROJECT_ID }).all();
    const demoTasks = tasks.filter(t => t.name.startsWith(TASK_BASE_NAME));
    for (const t of demoTasks) {
      const decoded = decodeTaskDescriptionWithMetadata(t.description);
      const metadata = decoded.metadata ? { ...decoded.metadata } : {};
      delete metadata.recurrenceConfig;
      const cleanDesc = encodeTaskDescriptionWithMetadata(decoded.description, metadata);
      await db.orm.public.Task.where({ id: t.id }).update({
        recurrence: null,
        description: cleanDesc,
      });
      console.log(`Disabled recurrence for [${t.ticketId}] "${t.name}"`);
    }
    console.log('Demo recurrence successfully disabled.');
  } else {
    console.log('Usage: node scripts/demo-recurring-task.js [status|trigger-check|disable]');
  }
}

runDemo().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
