import { Controller, Get, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { UmsAuthGuard } from '../auth/ums-auth.guard.js';

@Controller('ai')
@UseGuards(UmsAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('project/:id')
  async getProjectSummary(@Param('id') id: string, @Request() req: any) {
    if (!id) throw new BadRequestException('Project ID is required');
    return this.aiService.getProjectSummary(id, req.auth);
  }

  @Get('team')
  async getManagerTeamSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    return this.aiService.getManagerTeamSummary(startDate, endDate, req.auth);
  }

  @Get('me')
  async getEmployeeWorkSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req: any
  ) {
    if (!startDate || !endDate) throw new BadRequestException('startDate and endDate are required');
    return this.aiService.getEmployeeWorkSummary(startDate, endDate, req.auth);
  }
}
