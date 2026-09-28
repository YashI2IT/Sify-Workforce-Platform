import { z } from 'zod';

export const createTaskTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  taskName: z.string().min(1, 'Task name is required'),
  description: z.string().nullable().optional(),
  priority: z.string().default('MEDIUM').optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CreateTaskTemplateDto = z.infer<typeof createTaskTemplateSchema>;

export const updateTaskTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  taskName: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.string().optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTaskTemplateDto = z.infer<typeof updateTaskTemplateSchema>;
