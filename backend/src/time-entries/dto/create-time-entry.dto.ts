import { z } from 'zod';

export const createTimeEntrySchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  taskId: z.string().uuid('Invalid task ID'),
  activityId: z.string().uuid('Invalid activity ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  hours: z.number().positive('Hours must be positive'),
  remarks: z.string().nullable().optional(),
});

export type CreateTimeEntryDto = z.infer<typeof createTimeEntrySchema>;
