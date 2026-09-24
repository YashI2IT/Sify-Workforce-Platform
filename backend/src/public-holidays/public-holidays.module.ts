import { Module } from '@nestjs/common';
import { PublicHolidaysService } from './public-holidays.service.js';
import { PublicHolidaysController } from './public-holidays.controller.js';

@Module({
  providers: [PublicHolidaysService],
  controllers: [PublicHolidaysController]
})
export class PublicHolidaysModule {}
