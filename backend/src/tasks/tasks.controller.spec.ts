import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: {
            findAllByProject: vi.fn(),
            findOne: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a task', async () => {
      const dto = { name: 'New Task', status: 'TODO' };
      const validatedDto = { ...dto, isActive: true };
      const expectedResult = { id: 't1', projectId: 'p1', ...validatedDto };
      vi.mocked(service.create).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.create('p1', dto, { organizationId: 'org1' } as any);

      expect(service.create).toHaveBeenCalledWith('p1', validatedDto, { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException on validation failure (missing name)', async () => {
      const dto = { status: 'TODO' };
      
      await expect(controller.create('p1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on validation failure (missing status)', async () => {
      const dto = { name: 'Task' };
      
      await expect(controller.create('p1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should accept nullable description', async () => {
      const dto = { name: 'New Task', status: 'TODO', description: null };
      const expectedResult = { id: 't1', projectId: 'p1', ...dto, isActive: true };
      vi.mocked(service.create).mockResolvedValueOnce(expectedResult as any);

      await expect(controller.create('p1', dto, { organizationId: 'org1' } as any)).resolves.toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should successfully update a task', async () => {
      const dto = { name: 'Updated' };
      const expectedResult = { id: 't1', projectId: 'p1', name: 'Updated', status: 'TODO', isActive: true };
      vi.mocked(service.update).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.update('t1', dto, { organizationId: 'org1' } as any);

      expect(service.update).toHaveBeenCalledWith('t1', dto, { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException on invalid update (empty name)', async () => {
      const dto = { name: '' };
      
      await expect(controller.update('t1', dto)).rejects.toThrow(BadRequestException);
    });
    
    it('projectId cannot be updated by omitting it from schema', async () => {
      const dto = { name: 'N' };
      vi.mocked(service.update).mockResolvedValueOnce({ id: 't1', name: 'N', projectId: 'p1', status: 'TODO', isActive: true } as any);

      await controller.update('t1', dto, { organizationId: 'org1' } as any);

      expect(service.update).toHaveBeenCalledWith('t1', { name: 'N' }, { organizationId: 'org1' });
    });
  });

  describe('findAllByProject', () => {
    it('should return tasks from service', async () => {
      const expectedResult = [{ id: 't1' }];
      vi.mocked(service.findAllByProject).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.findAllByProject('p1', { organizationId: 'org1' } as any);
      expect(service.findAllByProject).toHaveBeenCalledWith('p1', { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return task from service', async () => {
      const expectedResult = { id: 't1' };
      vi.mocked(service.findOne).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.findOne('t1', { organizationId: 'org1' } as any);
      expect(service.findOne).toHaveBeenCalledWith('t1', { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });
  });
});
