import { parsePagination } from './pagination.dto.js';
import { BadRequestException } from '@nestjs/common';
import { describe, it, expect } from 'vitest';

describe('Pagination Parsing', () => {
  it('should parse valid pagination defaults', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 50 });
  });

  it('should clamp/throw on oversized pagination limits', () => {
    expect(() => parsePagination({ limit: 501 })).toThrow(BadRequestException);
    expect(() => parsePagination({ limit: 5000 })).toThrow(BadRequestException);
    // 200 and 500 should be valid (needed by time entries board)
    expect(parsePagination({ limit: 200 })).toEqual({ page: 1, limit: 200 });
    expect(parsePagination({ limit: 500 })).toEqual({ page: 1, limit: 500 });
  });

  it('should throw on invalid pages or limits', () => {
    expect(() => parsePagination({ page: 0 })).toThrow(BadRequestException);
    expect(() => parsePagination({ page: -1 })).toThrow(BadRequestException);
    expect(() => parsePagination({ limit: 0 })).toThrow(BadRequestException);
    expect(() => parsePagination({ limit: -10 })).toThrow(BadRequestException);
  });
});
