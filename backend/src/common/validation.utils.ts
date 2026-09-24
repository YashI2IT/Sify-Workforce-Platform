import { z } from 'zod';

/**
 * Common Validation Utilities
 *
 * Standardized Zod schemas and error formatting helpers for controller queries and DTOs.
 */

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const dateRangeRefinement = (data: { startDate?: string; endDate?: string }): boolean => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    return start <= end;
  }
  return true;
};

export const dateRangeRefinementOptions = {
  message: 'endDate cannot be before startDate',
  path: ['endDate'],
};

export function formatZodError(error: any): string {
  if (error && Array.isArray(error.issues)) {
    return error.issues.map((e: any) => e.message).join(', ');
  }
  if (error && Array.isArray(error.errors)) {
    return error.errors.map((e: any) => e.message).join(', ');
  }
  if (error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Validation failed';
}
