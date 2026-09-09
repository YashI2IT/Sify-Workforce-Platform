import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockProjectsService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let module: TestingModule;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active projects array', async () => {
      const activeProjects = [{ id: 'p1', name: 'Portal', isActive: true }];
      mockProjectsService.findAll.mockResolvedValueOnce(activeProjects);

      const result = await controller.findAll();

      expect(mockProjectsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(activeProjects);
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      const project = { id: 'p1', name: 'Portal', isActive: true };
      mockProjectsService.findOne.mockResolvedValueOnce(project);

      const result = await controller.findOne('p1');

      expect(mockProjectsService.findOne).toHaveBeenCalledWith('p1');
      expect(result).toEqual(project);
    });
  });

  describe('create', () => {
    it('should create a valid project', async () => {
      const validDto = {
        organizationId: 'org-1',
        name: 'Project Portal',
        code: 'PRJ-PORTAL',
        status: 'ACTIVE',
      };
      const created = { id: 'p1', ...validDto, isActive: true };
      mockProjectsService.create.mockResolvedValueOnce(created);

      const result = await controller.create(validDto);

      expect(mockProjectsService.create).toHaveBeenCalledWith({
        ...validDto,
        isActive: true,
      });
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException on missing required fields', async () => {
      await expect(controller.create({ name: 'Portal' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on empty string fields', async () => {
      await expect(
        controller.create({
          organizationId: '',
          name: 'Portal',
          code: 'CODE',
          status: 'ACTIVE',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a valid project', async () => {
      const updateDto = {
        name: 'Updated Portal',
        status: 'IN_PROGRESS',
        isActive: false,
      };
      const updated = { id: 'p1', ...updateDto };
      mockProjectsService.update.mockResolvedValueOnce(updated);

      const result = await controller.update('p1', updateDto);

      expect(mockProjectsService.update).toHaveBeenCalledWith('p1', updateDto);
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException if update field is invalid', async () => {
      await expect(controller.update('p1', { name: '' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('swagger integration', () => {
    it('should register project endpoints in swagger document', () => {
      const app = module.createNestApplication();
      app.setGlobalPrefix('api/v1');
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Sify Workforce Platform')
        .build();
      const document = SwaggerModule.createDocument(app, swaggerConfig);

      expect(document.paths['/api/v1/projects']).toBeDefined();
      expect(document.paths['/api/v1/projects'].get).toBeDefined();
      expect(document.paths['/api/v1/projects'].post).toBeDefined();

      expect(document.paths['/api/v1/projects/{id}']).toBeDefined();
      expect(document.paths['/api/v1/projects/{id}'].get).toBeDefined();
      expect(document.paths['/api/v1/projects/{id}'].patch).toBeDefined();
    });
  });
});
