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

export const orgProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Organization Name is required')
    .max(100, 'Organization Name must not exceed 100 characters'),
  organizationType: z.enum(VALID_ORGANIZATION_TYPES, {
    error: 'Please select a valid Industry Type',
  }),
  description: z
    .string()
    .trim()
    .max(500, 'Description must not exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export type OrgProfileFormData = z.infer<typeof orgProfileSchema>;
