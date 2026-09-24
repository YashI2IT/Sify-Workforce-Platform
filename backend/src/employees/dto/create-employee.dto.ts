import { z } from 'zod';

export const createEmployeeSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  teamId: z.string().uuid().nullable().optional(),
  employeeCode: z.string().min(1, 'Employee Code is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  isActive: z.boolean().default(true),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE').optional(),
});

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  teamId: z.string().uuid().nullable().optional(),
  employeeCode: z.string().min(1, 'Employee Code is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
});

export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
