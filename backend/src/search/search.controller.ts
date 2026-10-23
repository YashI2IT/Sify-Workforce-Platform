import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import type { UnifiedSearchResponse } from './search.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global enterprise search across projects, tasks, people, teams, and timesheets' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search term or ticket identifier' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum results per category' })
  @ApiResponse({ status: 200, description: 'Categorized search results' })
  async search(
    @GetAuthContext() auth: AuthenticatedContext,
    @Query('q') query?: string,
    @Query('limit') limitStr?: string,
  ): Promise<UnifiedSearchResponse> {
    const q = (query || '').trim();
    if (q.length > 100) {
      throw new BadRequestException('Search query is too long (maximum 100 characters)');
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 5;
    return this.searchService.search(q, auth, isNaN(limit) ? 5 : limit);
  }
}
