import { z } from 'zod';

export const VALID_ORGANIZATION_TYPES = [
  'TECHNOLOGY',
  'EDUCATION',
  'HEALTHCARE',
  'FINANCE',
  'MANUFACTURING',
  'RETAIL',
  'NGO',
  'GOVERNMENT',
  'OTHER',
] as const;

export const createOrgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please provide an organization name.')
    .max(100, 'Organization name must be 100 characters or less.'),
  organizationType: z.enum(VALID_ORGANIZATION_TYPES, {
    error: 'Please select a valid organization type.',
  }),
  description: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or less.')
    .optional(),
});

export type CreateOrgFormValues = z.infer<typeof createOrgSchema>;
