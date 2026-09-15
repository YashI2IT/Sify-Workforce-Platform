import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  managerId: z.string().nullable().optional(),
});

export type CreateTeamDto = z.infer<typeof createTeamSchema>;

export const updateTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  managerId: z.string().nullable().optional(),
});

export type UpdateTeamDto = z.infer<typeof updateTeamSchema>;
