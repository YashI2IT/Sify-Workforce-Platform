import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: {
            getCurrentOrganization: vi.fn(),
            updateCurrentOrganization: vi.fn(),
            createOnboardingOrganization: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('createOrganization', () => {
    it('should create organization and employee', async () => {
      const req = { umsUser: { id: 'ums1', email: 'test@example.com' } };
      vi.mocked(service.createOnboardingOrganization).mockResolvedValue({
        data: { organization: { id: 'org1', name: 'Org', code: 'ORG' }, employee: { id: 'emp1', employeeCode: 'EMP1', name: 'Test', email: 'test@example.com' }, role: 'ADMIN' }
      } as any);

      const result = await controller.createOrganization({ name: 'Org', code: 'ORG' }, req);
      expect(result.data.organization.id).toBe('org1');
      expect(service.createOnboardingOrganization).toHaveBeenCalledWith(req.umsUser, 'Org', 'ORG');
    });

    it('should throw BadRequestException if name is missing', async () => {
      await expect(controller.createOrganization({ code: 'ORG' }, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is missing', async () => {
      await expect(controller.createOrganization({ name: 'Org' }, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCurrent', () => {
    it('should return current organization', async () => {
      const auth: any = { organizationId: 'org1' };
      vi.mocked(service.getCurrentOrganization).mockResolvedValue({ id: 'org1', name: 'Acme' } as any);

      const result = await controller.getCurrent(auth);
      expect(result.name).toBe('Acme');
      expect(service.getCurrentOrganization).toHaveBeenCalledWith('org1');
    });
  });

  describe('updateCurrent', () => {
    it('should update organization', async () => {
      const auth: any = { organizationId: 'org1' };
      vi.mocked(service.updateCurrentOrganization).mockResolvedValue({ id: 'org1', name: 'Acme 2' } as any);

      const result = await controller.updateCurrent({ name: 'Acme 2' }, auth);
      expect(result.name).toBe('Acme 2');
      expect(service.updateCurrentOrganization).toHaveBeenCalledWith('org1', { name: 'Acme 2' });
    });

    it('should throw BadRequestException if name is empty', async () => {
      const auth: any = { organizationId: 'org1' };
      await expect(controller.updateCurrent({ name: '' }, auth)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is empty', async () => {
      const auth: any = { organizationId: 'org1' };
      await expect(controller.updateCurrent({ code: '  ' }, auth)).rejects.toThrow(BadRequestException);
    });
  });
});
