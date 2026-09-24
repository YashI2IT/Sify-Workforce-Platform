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
      expect(mockTeamsService.create).toHaveBeenCalledWith(validDto, 'org1', 'e1');
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
      expect(mockTeamsService.update).toHaveBeenCalledWith('t1', updateDto, 'org1', 'e1');
      expect(result).toEqual(updated);
    });

    it('should throw BadRequestException on validation fail', async () => {
      const auth: AuthenticatedContext = { userId: 'u1', employeeId: 'e1', organizationId: 'org1', roles: [] };
      await expect(controller.update('t1', { name: '' }, auth)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Role Metadata (RBAC)', () => {
    it('1. ADMIN can read Teams (findAll requires ADMIN or MANAGER)', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toContain('ADMIN');
    });

    it('2. MANAGER can read Teams (findAll requires ADMIN or MANAGER)', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).toContain('MANAGER');
    });

    it('3. EMPLOYEE cannot read Teams if route is restricted', () => {
      const roles = Reflect.getMetadata('roles', controller.findAll);
      expect(roles).not.toContain('EMPLOYEE');
    });

    it('4. ADMIN can create Team', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toContain('ADMIN');
    });

    it('5. MANAGER cannot create Team', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).not.toContain('MANAGER');
    });

    it('6. EMPLOYEE cannot create Team', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).not.toContain('EMPLOYEE');
    });

    it('7. ADMIN can update Team', () => {
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).toContain('ADMIN');
    });

    it('8. MANAGER cannot update Team', () => {
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).not.toContain('MANAGER');
    });

    it('9. EMPLOYEE cannot update Team', () => {
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).not.toContain('EMPLOYEE');
    });
  });
});
