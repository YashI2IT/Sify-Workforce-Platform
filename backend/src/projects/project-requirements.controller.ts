import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ProjectsService } from './projects.service.js';
import { GetAuthContext } from '../auth/auth-context.decorator.js';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('Project Requirements')
@Controller('project-requirements')
export class ProjectRequirementsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get project requirement by ID' })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  async getRequirement(@Param('id') id: string, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.getRequirement(id, auth);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update project requirement' })
  @ApiParam({ name: 'id', description: 'Requirement UUID' })
  async updateRequirement(@Param('id') id: string, @Body() body: any, @GetAuthContext() auth: AuthenticatedContext) {
    return this.projectsService.updateRequirement(id, body, auth);
  }
}
