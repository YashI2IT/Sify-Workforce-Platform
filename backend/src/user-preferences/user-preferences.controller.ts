import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { UserPreferencesService } from './user-preferences.service.js';
import type { PreferenceBody } from './user-preferences.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { RolesGuard } from '../auth/roles.guard.js';

@ApiTags('User Preferences')
@Controller('preferences')
@UseGuards(RolesGuard)
export class UserPreferencesController {
  constructor(private readonly userPreferencesService: UserPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get own preferences for the authenticated employee' })
  async getMyPreferences(@GetAuthContext() auth: AuthenticatedContext) {
    return this.userPreferencesService.getMyPreferences(auth);
  }

  @Put()
  @ApiOperation({ summary: 'Update own preferences' })
  @ApiBody({ schema: { type: 'object', properties: {
    timezone: { type: 'string', example: 'Asia/Kolkata' },
    language: { type: 'string', example: 'en' },
    theme: { type: 'string', example: 'system' },
    defaultView: { type: 'string', example: 'timesheet' },
    dateFormat: { type: 'string', example: 'DD/MM/YYYY' },
    emailNotifications: { type: 'boolean', example: true },
  }}})
  async updateMyPreferences(@GetAuthContext() auth: AuthenticatedContext, @Body() body: PreferenceBody) {
    return this.userPreferencesService.updateMyPreferences(auth, body);
  }
}
