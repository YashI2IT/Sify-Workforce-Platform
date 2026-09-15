import { z } from 'zod';

import { BadRequestException } from '@nestjs/common';

export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(50),
});

export type PaginationDto = z.infer<typeof paginationSchema>;

export function parsePagination(query: any): PaginationDto {
  try {
    return paginationSchema.parse(query || {});
  } catch (error: any) {
    if (error && Array.isArray(error.errors)) {
      throw new BadRequestException(error.errors.map((e: any) => e.message).join(', '));
    } else if (error && Array.isArray(error.issues)) {
      throw new BadRequestException(error.issues.map((e: any) => e.message).join(', '));
    }
    throw new BadRequestException('Invalid pagination parameters');
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
