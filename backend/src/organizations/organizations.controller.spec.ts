import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsService } from './organizations.service.js';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
            getAvailableOrganizations: vi.fn(),
            joinOrganization: vi.fn(),
            getSetupStatus: vi.fn(),
            completeSetup: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('createOrganization', () => {
    it('should successfully create an organization', async () => {
      const req = { umsUser: { id: 'ums1', email: 'test@example.com' } };
      vi.mocked(service.createOnboardingOrganization).mockResolvedValue({
        data: { organization: { id: 'org1', name: 'Org', organizationType: 'TECHNOLOGY', description: null }, employee: { id: 'emp1', employeeCode: 'EMP1', name: 'Test', email: 'test@example.com' }, role: 'ADMIN' }
      } as any);

      const result = await controller.createOrganization({ name: 'Org', organizationType: 'TECHNOLOGY' }, req);
      expect(result.data.organization.name).toBe('Org');
      expect(service.createOnboardingOrganization).toHaveBeenCalledWith(
        { id: 'ums1', email: 'test@example.com' },
        'Org',
        'TECHNOLOGY',
        undefined
      );
    });

    it('should throw BadRequestException if name is missing', async () => {
      await expect(controller.createOrganization({ organizationType: 'TECHNOLOGY' }, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if type is missing', async () => {
      await expect(controller.createOrganization({ name: 'Org' }, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if type is invalid', async () => {
      await expect(controller.createOrganization({ name: 'Org', organizationType: 'INVALID' }, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if description is too long', async () => {
      const longDesc = 'a'.repeat(501);
      await expect(controller.createOrganization({ name: 'Org', organizationType: 'TECHNOLOGY', description: longDesc }, {})).rejects.toThrow(BadRequestException);
    });
  });


  describe('getCurrent', () => {
    it('should return current organization', async () => {
      const auth: any = { organizationId: 'org1', roles: ['ADMIN'] };
      vi.mocked(service.getCurrentOrganization).mockResolvedValue({ id: 'org1', name: 'Acme' } as any);

      const result = await controller.getCurrent(auth);
      expect(result.name).toBe('Acme');
      expect(service.getCurrentOrganization).toHaveBeenCalledWith('org1');
    });
  });

  describe('getSetupStatus', () => {
    it('should return setup status checklist and isProfileSaved', async () => {
      const auth: any = { organizationId: 'org1', roles: ['ADMIN'] };
      vi.mocked(service.getSetupStatus).mockResolvedValue({
        data: {
          isProfileSaved: true,
          hasEmployees: false,
          hasTeams: false,
          hasRoles: false,
          hasManagers: false,
        }
      } as any);

      const result = await controller.getSetupStatus(auth);
      expect(result.data.isProfileSaved).toBe(true);
      expect(service.getSetupStatus).toHaveBeenCalledWith('org1');
    });
  });

  describe('updateCurrent', () => {
    it('authorized admin can update current organization and ignores client-supplied organizationId', async () => {
      const auth: any = { organizationId: 'org1', roles: ['ADMIN'] };
      vi.mocked(service.updateCurrentOrganization).mockResolvedValue({
        id: 'org1', name: 'New Name', organizationType: 'TECHNOLOGY'
      } as any);

      // Client attempts to pass a forged organizationId in the body
      const result = await controller.updateCurrent(
        { name: 'New Name', organizationType: 'TECHNOLOGY', organizationId: 'forged-org-id' },
        auth
      );
      expect(result!.name).toBe('New Name');
      // Verifies server uses auth.organizationId ('org1'), not 'forged-org-id'
      expect(service.updateCurrentOrganization).toHaveBeenCalledWith('org1', undefined, {
        name: 'New Name',
        organizationType: 'TECHNOLOGY',
        description: undefined,
      });
    });

    it('unauthorized non-admin user cannot update organization (throws 403 Forbidden)', async () => {
      const auth: any = { organizationId: 'org1', roles: ['EMPLOYEE'] };
      await expect(
        controller.updateCurrent({ name: 'Hacked Name' }, auth)
      ).rejects.toThrow(ForbiddenException);
      expect(service.updateCurrentOrganization).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if name is empty', async () => {
      const auth: any = { organizationId: 'org1', roles: ['ADMIN'] };
      await expect(controller.updateCurrent({ name: '  ' }, auth)).rejects.toThrow(BadRequestException);
    });
    
    it('should throw BadRequestException if type is invalid', async () => {
      const auth: any = { organizationId: 'org1', roles: ['ADMIN'] };
      await expect(controller.updateCurrent({ organizationType: 'INVALID' }, auth)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if description exceeds 500 characters', async () => {
      const auth: any = { organizationId: 'org1', roles: ['ADMIN'] };
      const longDesc = 'a'.repeat(501);
      await expect(controller.updateCurrent({ description: longDesc }, auth)).rejects.toThrow(BadRequestException);
    });
  });
});
