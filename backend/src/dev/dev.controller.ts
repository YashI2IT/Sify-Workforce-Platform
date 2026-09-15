import { Controller, Get, NotFoundException } from '@nestjs/common';
import { db } from '../prisma/db.js';

@Controller('dev')
export class DevController {
  @Get('employees')
  async getDevEmployees() {
    // Extra safety measure in case the controller is accidentally registered in production
    const isDevEnvironment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (!isDevEnvironment) {
      throw new NotFoundException();
    }

    return db.orm.public.Employee.where({ isActive: true })
      .limit(100)
      .all();
  }
}
