import { z } from 'zod';

export const createInvitationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  teamId: z.string().uuid().nullable().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
});

export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
