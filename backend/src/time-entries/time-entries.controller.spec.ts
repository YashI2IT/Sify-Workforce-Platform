import { Test, TestingModule } from '@nestjs/testing';
import { TimeEntriesController } from './time-entries.controller.js';
import { TimeEntriesService } from './time-entries.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('TimeEntriesController', () => {
  let controller: TimeEntriesController;
  let service: TimeEntriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimeEntriesController],
      providers: [
        {
          provide: TimeEntriesService,
          useValue: {
            create: vi.fn(),
            findAllByEmployee: vi.fn(),
            findOne: vi.fn(),
            update: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TimeEntriesController>(TimeEntriesController);
    service = module.get<TimeEntriesService>(TimeEntriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const validDto = { employeeId: '8093122c-a2b8-4c12-9c3f-42721a364a51', projectId: '8093122c-a2b8-4c12-9c3f-42721a364a52', taskId: '8093122c-a2b8-4c12-9c3f-42721a364a53', activityId: '8093122c-a2b8-4c12-9c3f-42721a364a54', date: '2026-09-10', hours: 8 };
      vi.mocked(service.create).mockResolvedValueOnce({ id: 'te1', ...validDto } as any);

      const result = await controller.create(validDto);
      expect(result.id).toBe('te1');
      expect(service.create).toHaveBeenCalledWith(validDto);
    });

    it('should throw BadRequestException on invalid hours', async () => {
      const invalidDto = { employeeId: '8093122c-a2b8-4c12-9c3f-42721a364a51', projectId: '8093122c-a2b8-4c12-9c3f-42721a364a52', taskId: '8093122c-a2b8-4c12-9c3f-42721a364a53', activityId: '8093122c-a2b8-4c12-9c3f-42721a364a54', date: '2026-09-10', hours: -1 };
      await expect(controller.create(invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      vi.mocked(service.update).mockResolvedValueOnce({ id: 'te1', hours: 4 } as any);
      const result = await controller.update('te1', { hours: 4 });
      expect(result).toEqual({ id: 'te1', hours: 4 });
      expect(service.update).toHaveBeenCalledWith('te1', { hours: 4 });
    });
  });
});
