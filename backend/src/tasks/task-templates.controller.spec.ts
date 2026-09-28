import { Test, TestingModule } from '@nestjs/testing';
import { TaskTemplatesController } from './task-templates.controller.js';
import { TaskTemplatesService } from './task-templates.service.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('TaskTemplatesController', () => {
  let controller: TaskTemplatesController;
  let service: TaskTemplatesService;

  beforeEach(async () => {
    const mockService = {
      create: vi.fn(),
      findAllByProject: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskTemplatesController],
      providers: [
        { provide: TaskTemplatesService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<TaskTemplatesController>(TaskTemplatesController);
    service = module.get<TaskTemplatesService>(TaskTemplatesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const mockDto = { name: 'T1', taskName: 'Task 1' } as any;
      const mockReq = { user: { employeeId: 'emp-1', role: 'ADMIN' } };
      await controller.create('proj-1', mockDto, mockReq.user as any);
      expect(service.create).toHaveBeenCalledWith(
        'proj-1',
        { ...mockDto, isActive: true, priority: 'MEDIUM' },
        mockReq.user
      );
    });
  });

  describe('findAll', () => {
    it('should call service.findAllByProject', async () => {
      const mockReq = { user: { employeeId: 'emp-1', role: 'ADMIN' } };
      await controller.findAllByProject('proj-1', mockReq.user as any);
      expect(service.findAllByProject).toHaveBeenCalledWith('proj-1', mockReq.user);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const mockDto = { name: 'T2' } as any;
      const mockReq = { user: { employeeId: 'emp-1', role: 'ADMIN' } };
      await controller.update('proj-1', 'tpl-1', mockDto, mockReq.user as any);
      expect(service.update).toHaveBeenCalledWith('proj-1', 'tpl-1', mockDto, mockReq.user);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      const mockReq = { user: { employeeId: 'emp-1', role: 'ADMIN' } };
      await controller.remove('proj-1', 'tpl-1', mockReq.user as any);
      expect(service.remove).toHaveBeenCalledWith('proj-1', 'tpl-1', mockReq.user);
    });
  });
});
