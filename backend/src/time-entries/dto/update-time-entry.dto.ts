import { z } from 'zod';

export const updateTimeEntrySchema = z.object({
  projectId: z.string().uuid('Invalid project ID').optional(),
  taskId: z.string().uuid('Invalid task ID').optional(),
  activityId: z.string().uuid('Invalid activity ID').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === val;
  }, 'Date must be a valid calendar date').optional(),
  hours: z.number().positive('Hours must be positive').max(24, 'Hours cannot exceed 24').optional(),
  remarks: z.string().nullable().optional(),
});

export type UpdateTimeEntryDto = z.infer<typeof updateTimeEntrySchema>;
