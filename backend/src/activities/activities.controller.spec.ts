import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let service: ActivitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: {
            findAllByProject: vi.fn(),
            findOne: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create an activity', async () => {
      const dto = { name: 'New Activity' };
      const validatedDto = { ...dto, isActive: true };
      const expectedResult = { id: 'a1', projectId: 'p1', ...validatedDto };
      vi.mocked(service.create).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.create('p1', dto, { organizationId: 'org1' } as any);

      expect(service.create).toHaveBeenCalledWith('p1', validatedDto, { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException on validation failure (missing name)', async () => {
      const dto = {};
      await expect(controller.create('p1', dto, { organizationId: 'org1' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should accept nullable description', async () => {
      const dto = { name: 'New Activity', description: null };
      const validatedDto = { ...dto, isActive: true };
      const expectedResult = { id: 'a1', projectId: 'p1', ...validatedDto };
      vi.mocked(service.create).mockResolvedValueOnce(expectedResult as any);

      await expect(controller.create('p1', dto, { organizationId: 'org1' } as any)).resolves.toEqual(expectedResult);
    });
  });

  describe('update', () => {
    it('should successfully update an activity', async () => {
      const dto = { name: 'Updated' };
      const expectedResult = { id: 'a1', projectId: 'p1', name: 'Updated', isActive: true };
      vi.mocked(service.update).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.update('a1', dto, { organizationId: 'org1' } as any);

      expect(service.update).toHaveBeenCalledWith('a1', dto, { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException on invalid update (empty name)', async () => {
      const dto = { name: '' };
      await expect(controller.update('a1', dto, { organizationId: 'org1' } as any)).rejects.toThrow(BadRequestException);
    });
    
    it('projectId cannot be updated by omitting it from schema', async () => {
      const dto = { name: 'N' };
      vi.mocked(service.update).mockResolvedValueOnce({ id: 'a1', name: 'N', projectId: 'p1', isActive: true } as any);

      await controller.update('a1', dto, { organizationId: 'org1' } as any);

      expect(service.update).toHaveBeenCalledWith('a1', { name: 'N' }, { organizationId: 'org1' });
    });
  });

  describe('findAllByProject', () => {
    it('should return activities from service', async () => {
      const expectedResult = [{ id: 'a1' }];
      vi.mocked(service.findAllByProject).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.findAllByProject('p1', { organizationId: 'org1' } as any);
      expect(service.findAllByProject).toHaveBeenCalledWith('p1', { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return activity from service', async () => {
      const expectedResult = { id: 'a1' };
      vi.mocked(service.findOne).mockResolvedValueOnce(expectedResult as any);

      const result = await controller.findOne('a1', { organizationId: 'org1' } as any);
      expect(service.findOne).toHaveBeenCalledWith('a1', { organizationId: 'org1' });
      expect(result).toEqual(expectedResult);
    });
  });
});
