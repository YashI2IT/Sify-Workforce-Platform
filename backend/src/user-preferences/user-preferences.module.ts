import { Module } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service.js';
import { UserPreferencesController } from './user-preferences.controller.js';

@Module({
  providers: [UserPreferencesService],
  controllers: [UserPreferencesController]
})
export class UserPreferencesModule {}
