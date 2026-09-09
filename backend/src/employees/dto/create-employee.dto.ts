import { z } from 'zod';

export const createEmployeeSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
  employeeCode: z.string().min(1, 'Employee Code is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  isActive: z.boolean().default(true),
});

export type CreateEmployeeDto = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  employeeCode: z.string().min(1, 'Employee Code is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateEmployeeDto = z.infer<typeof updateEmployeeSchema>;
