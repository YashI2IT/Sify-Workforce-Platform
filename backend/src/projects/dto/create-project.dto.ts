import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  status: z.string().min(1, 'Status is required'),
  isActive: z.boolean().default(true),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  code: z.string().min(1, 'Code is required').optional(),
  status: z.string().min(1, 'Status is required').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateProjectDto = z.infer<typeof updateProjectSchema>;
