import { Test, TestingModule } from '@nestjs/testing';
import { TimeEntriesController } from './time-entries.controller.js';
import { TimeEntriesService } from './time-entries.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

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
      const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const validDto = { projectId: '8093122c-a2b8-4c12-9c3f-42721a364a51', taskId: '8093122c-a2b8-4c12-9c3f-42721a364a52', activityId: '8093122c-a2b8-4c12-9c3f-42721a364a53', date: '2026-09-10', hours: 8 };
      
      const createdEntry = { id: 'te1', ...validDto, employeeId: 'e1' };
      vi.mocked(service.create).mockResolvedValueOnce(createdEntry as any);

      const result = await controller.create(validDto, authCtx);
      expect(result.id).toBe('te1');
      expect(service.create).toHaveBeenCalledWith(validDto, authCtx);
    });

    it('should throw BadRequestException on invalid hours', async () => {
      const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const invalidDto = { projectId: '8093122c-a2b8-4c12-9c3f-42721a364a51', taskId: '8093122c-a2b8-4c12-9c3f-42721a364a52', activityId: '8093122c-a2b8-4c12-9c3f-42721a364a53', date: '2026-09-10', hours: -1 };
      await expect(controller.create(invalidDto as any, authCtx)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const authCtx: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const updateDto = { hours: 4 };
      vi.mocked(service.update).mockResolvedValueOnce({ id: 'te1', hours: 4 } as any);

      const result = await controller.update('te1', updateDto, authCtx);
      expect(result).toEqual({ id: 'te1', hours: 4 });
      expect(service.update).toHaveBeenCalledWith('te1', updateDto, authCtx);
    });
  });
});
