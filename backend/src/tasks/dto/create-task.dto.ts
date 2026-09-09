import { z } from 'zod';

export const createTaskSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  status: z.string().min(1, 'Status is required'),
  isActive: z.boolean().default(true),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
  status: z.string().min(1, 'Status is required').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
