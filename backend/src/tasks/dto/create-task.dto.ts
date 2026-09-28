import { z } from 'zod';

export const createTaskSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  priority: z.string().default('MEDIUM').optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  status: z.string().min(1, 'Status is required'),
  recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  isActive: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.startDate && data.dueDate) {
      return new Date(data.startDate) <= new Date(data.dueDate);
    }
    return true;
  },
  {
    message: "startDate must be before or equal to dueDate",
    path: ["startDate"],
  }
);

export type CreateTaskDto = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  estimatedHours: z.number().nonnegative().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  status: z.string().min(1, 'Status is required').optional(),
  recurrence: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  isActive: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.dueDate) {
      return new Date(data.startDate) <= new Date(data.dueDate);
    }
    return true;
  },
  {
    message: "startDate must be before or equal to dueDate",
    path: ["startDate"],
  }
);

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
