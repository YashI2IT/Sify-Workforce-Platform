import { Test, TestingModule } from '@nestjs/testing';
import { PublicHolidaysController } from './public-holidays.controller.js';
import { PublicHolidaysService } from './public-holidays.service.js';

describe('PublicHolidaysController', () => {
  let controller: PublicHolidaysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicHolidaysController],
      providers: [PublicHolidaysService],
    }).compile();

    controller = module.get<PublicHolidaysController>(PublicHolidaysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
