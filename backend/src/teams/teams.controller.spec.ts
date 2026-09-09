import { Test, TestingModule } from '@nestjs/testing';
import { TeamsController } from './teams.controller.js';
import { TeamsService } from './teams.service.js';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

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
      const dto = { organizationId: 'org1', name: 'Team A' };
      mockTeamsService.create.mockResolvedValueOnce({ id: 't1', ...dto });
      const result = await controller.create(dto);
      expect(result).toEqual({ id: 't1', ...dto });
    });

    it('should throw BadRequestException on validation fail', async () => {
      await expect(controller.create({ name: 'Team' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update a valid team', async () => {
      const dto = { name: 'Team B' };
      mockTeamsService.update.mockResolvedValueOnce({ id: 't1', ...dto });
      const result = await controller.update('t1', dto);
      expect(result).toEqual({ id: 't1', ...dto });
    });

    it('should throw BadRequestException on validation fail', async () => {
      await expect(controller.update('t1', { name: '' })).rejects.toThrow(BadRequestException);
    });
  });
});
