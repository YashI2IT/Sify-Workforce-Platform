import { Test, TestingModule } from '@nestjs/testing';
import { UserPreferencesController } from './user-preferences.controller.js';
import { UserPreferencesService } from './user-preferences.service.js';

describe('UserPreferencesController', () => {
  let controller: UserPreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPreferencesController],
      providers: [UserPreferencesService],
    }).compile();

    controller = module.get<UserPreferencesController>(UserPreferencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
