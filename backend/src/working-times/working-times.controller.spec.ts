import { Test, TestingModule } from '@nestjs/testing';
import { WorkingTimesController } from './working-times.controller.js';
import { WorkingTimesService } from './working-times.service.js';

describe('WorkingTimesController', () => {
  let controller: WorkingTimesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkingTimesController],
      providers: [WorkingTimesService],
    }).compile();

    controller = module.get<WorkingTimesController>(WorkingTimesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
