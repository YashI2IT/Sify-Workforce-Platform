import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

const mockProjectsService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  getProjectHealth: vi.fn(),
};

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let service: ProjectsService;
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
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active projects array', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const expectedProjects = [{ id: '1', name: 'P1' }];
      vi.mocked(service.findAll).mockResolvedValue(expectedProjects as any);

      expect(await controller.findAll(auth, {})).toBe(expectedProjects);
      expect(service.findAll).toHaveBeenCalledWith(auth, 1, 50);
    });
  });

  describe('findOne', () => {
    it('should return project by id', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const expectedProject = { id: '1', name: 'P1' };
      vi.mocked(service.findOne).mockResolvedValue(expectedProject as any);

      expect(await controller.findOne('1', auth)).toBe(expectedProject);
      expect(service.findOne).toHaveBeenCalledWith('1', auth);
    });
  });

  describe('getHealth', () => {
    it('should return project health', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const expectedHealth = { overdueTasksCount: 1 };
      vi.mocked(service.getProjectHealth).mockResolvedValue(expectedHealth as any);

      expect(await controller.getHealth('1', auth)).toBe(expectedHealth);
      expect(service.getProjectHealth).toHaveBeenCalledWith('1', auth);
    });
  });

  describe('create', () => {
    it('should create a valid project', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org-1', roles: [] };
      const validDto = {
        name: 'Project Alpha',
        code: 'ALPHA',
        status: 'PLANNING',
        isActive: true,
      };
      
      const createdProject = { id: '1', ...validDto, organizationId: 'org-1' };
      vi.mocked(service.create).mockResolvedValue(createdProject as any);

      expect(await controller.create(validDto, auth)).toBe(createdProject);
      expect(service.create).toHaveBeenCalledWith(validDto, auth);
    });

    it('should throw BadRequestException on missing required fields', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const invalidDto = {
        code: 'ALPHA',
      };
      
      await expect(controller.create(invalidDto as any, auth)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on empty string fields', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const invalidDto = {
        name: '',
        code: 'ALPHA',
      };
      
      await expect(controller.create(invalidDto as any, auth)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a valid project', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const validDto = {
        name: 'Project Beta',
      };
      
      const updatedProject = { id: '1', name: 'Project Beta' };
      vi.mocked(service.update).mockResolvedValue(updatedProject as any);

      expect(await controller.update('1', validDto, auth)).toBe(updatedProject);
      expect(service.update).toHaveBeenCalledWith('1', validDto, 'org1', 'e1');
    });

    it('should throw BadRequestException if update field is invalid', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const invalidDto = {
        name: '', // Empty string not allowed
      };
      
      await expect(controller.update('1', invalidDto, auth)).rejects.toThrow(BadRequestException);
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
