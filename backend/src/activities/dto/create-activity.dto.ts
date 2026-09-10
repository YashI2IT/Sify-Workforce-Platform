import { z } from 'zod';

export const createActivitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CreateActivityDto = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateActivityDto = z.infer<typeof updateActivitySchema>;
