import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';
import { vi } from 'vitest';
import { ROLES_KEY } from '../auth/roles.decorator.js';
import { BadRequestException } from '@nestjs/common';
import type { AuthenticatedContext } from '../auth/authenticated-context.js';

const mockEmployeesService = {
  findAll: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

describe('EmployeesController', () => {
  let controller: EmployeesController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  const authContext: AuthenticatedContext = {
    userId: 'user1',
    roles: ['ADMIN'],
    employeeId: 'emp1',
    organizationId: 'org1',
  };

  describe('Endpoint Authorization (Metadata)', () => {
    it('GET /employees is restricted to ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findAll);
      expect(roles).toEqual(['ADMIN', 'MANAGER']);
    });

    it('GET /employees/:id is restricted to ADMIN and MANAGER', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findOne);
      expect(roles).toEqual(['ADMIN', 'MANAGER']);
    });

    it('POST /employees is restricted to ADMIN only', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.create);
      expect(roles).toEqual(['ADMIN']);
    });

    it('PATCH /employees/:id is restricted to ADMIN only', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.update);
      expect(roles).toEqual(['ADMIN']);
    });
  });

  describe('create (POST)', () => {
    const validBody = {
      organizationId: 'org1',
      employeeCode: 'EMP001',
      name: 'Test',
      email: 'test@example.com',
    };

    it('accepts valid creation without role (defaults to EMPLOYEE)', async () => {
      mockEmployeesService.create.mockResolvedValue({ id: 'newEmp' });
      await controller.create(validBody, authContext, 'Bearer fake-token');
      expect(mockEmployeesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test', role: 'EMPLOYEE' }),
        'org1',
        'fake-token'
      );
    });

    it('accepts valid creation with valid role (ADMIN, MANAGER, EMPLOYEE)', async () => {
      for (const role of ['ADMIN', 'MANAGER', 'EMPLOYEE']) {
        await controller.create({ ...validBody, role }, authContext, 'Bearer fake-token');
        expect(mockEmployeesService.create).toHaveBeenCalledWith(
          expect.objectContaining({ role }),
          'org1',
          'fake-token'
        );
      }
    });

    it('rejects creation with invalid role', async () => {
      await expect(controller.create({ ...validBody, role: 'INVALID' }, authContext, 'Bearer fake-token')).rejects.toThrow(BadRequestException);
    });

    it('Client cannot submit another organizationId to override auth', async () => {
      // The controller passes auth.organizationId to the service, which acts as the source of truth
      await controller.create({ ...validBody, organizationId: 'maliciousOrg' }, authContext, 'Bearer fake-token');
      // The second argument to service.create must be the auth.organizationId
      expect(mockEmployeesService.create).toHaveBeenCalledWith(
        expect.anything(),
        'org1',
        'fake-token'
      );
    });
  });

  describe('update (PATCH)', () => {
    it('accepts valid update with valid role', async () => {
      mockEmployeesService.update.mockResolvedValue({ id: 'emp1' });
      await controller.update('emp1', { role: 'MANAGER' }, authContext);
      expect(mockEmployeesService.update).toHaveBeenCalledWith(
        'emp1',
        { role: 'MANAGER' },
        'org1',
        'emp1'
      );
    });

    it('rejects update with invalid role', async () => {
      await expect(controller.update('emp1', { role: 'SUPERUSER' }, authContext)).rejects.toThrow(BadRequestException);
    });
  });
});
