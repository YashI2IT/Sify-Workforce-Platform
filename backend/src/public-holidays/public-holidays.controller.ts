import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { PublicHolidaysService } from './public-holidays.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Public Holidays')
@Controller('public-holidays')
@UseGuards(RolesGuard)
export class PublicHolidaysController {
  constructor(private readonly publicHolidaysService: PublicHolidaysService) {}

  @Get()
  @ApiOperation({ summary: 'List organization public holidays' })
  async findAll(@GetAuthContext() auth: AuthenticatedContext) {
    return this.publicHolidaysService.findAll(auth);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a public holiday (ADMIN)' })
  @ApiBody({ schema: { type: 'object', properties: {
    name: { type: 'string' }, date: { type: 'string', example: '2026-01-01' }, isActive: { type: 'boolean' }
  }, required: ['name', 'date'] }})
  async create(@GetAuthContext() auth: AuthenticatedContext, @Body() body: { name: string; date: string; isActive?: boolean }) {
    return this.publicHolidaysService.create(auth, body);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a public holiday (ADMIN)' })
  @ApiParam({ name: 'id', description: 'Holiday UUID' })
  async update(
    @Param('id') id: string,
    @GetAuthContext() auth: AuthenticatedContext,
    @Body() body: { name?: string; date?: string; isActive?: boolean },
  ) {
    return this.publicHolidaysService.update(id, auth, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Deactivate a public holiday (ADMIN)' })
  @ApiParam({ name: 'id', description: 'Holiday UUID' })
  async remove(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.publicHolidaysService.remove(id, auth);
  }
}
