import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

const mockTeamsService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

describe('TeamsController', () => {
  let controller: TeamsController;
  let service: TeamsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: mockTeamsService,
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
    service = module.get<TeamsService>(TeamsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a valid team', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const validDto = { name: 'Engineering', managerId: 'm1' };
      const created = { id: 't1', ...validDto, isActive: true, organizationId: 'org1' };
      mockTeamsService.create.mockResolvedValueOnce(created);

      const result = await controller.create(validDto, auth);
      expect(mockTeamsService.create).toHaveBeenCalledWith(validDto, 'org1');
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException on validation fail', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      await expect(controller.create({ managerId: 'm1' } as any, auth)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a valid team', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      const updateDto = { name: 'Eng Team' };
      const updated = { id: 't1', ...updateDto, isActive: true };
      mockTeamsService.update.mockResolvedValueOnce(updated);

      const result = await controller.update('t1', updateDto, auth);
      expect(mockTeamsService.update).toHaveBeenCalledWith('t1', updateDto, 'org1');
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException on validation fail', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      await expect(controller.update('t1', { name: '' }, auth)).rejects.toThrow(BadRequestException);
    });
  });
});
