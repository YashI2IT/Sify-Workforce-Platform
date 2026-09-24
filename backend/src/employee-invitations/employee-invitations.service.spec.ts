import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeInvitationsService } from './employee-invitations.service.js';
import { MailService } from '../mail/mail.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import crypto from 'crypto';

import { vi } from 'vitest';

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        Organization: { where: vi.fn() },
        OrganizationSettings: { where: vi.fn() },
        Team: { where: vi.fn() },
        Employee: { where: vi.fn() },
        EmployeeInvitation: { where: vi.fn(), create: vi.fn() },
      }
    }
  }
}));

describe('EmployeeInvitationsService', () => {
  let service: EmployeeInvitationsService;
  let mailService: MailService;

  const mockMailService = {
    sendInvitationEmail: vi.fn(),
    sendInvitationCredentialsEmail: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeInvitationsService,
        { provide: MailService, useValue: mockMailService }
      , { provide: AuditLogsService, useValue: { logEvent: vi.fn(), getOrganizationLogs: vi.fn() } }],
    }).compile();

    service = module.get<EmployeeInvitationsService>(EmployeeInvitationsService);
    mailService = module.get<MailService>(MailService);
  });

  describe('create', () => {
    const createDto = {
      email: 'test@sify.com',
      name: 'Test User',
      role: 'EMPLOYEE' as const,
      teamId: null
    };

    it('should create an invitation and send an email successfully', async () => {
      // Mock org
      (db.orm.public.Organization.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' })
      });
      // Mock org settings
      (db.orm.public.OrganizationSettings.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ defaultEmployeeRole: 'EMPLOYEE' })
      });
      // Mock existing employee
      (db.orm.public.Employee.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });
      // Mock pending invitation
      (db.orm.public.EmployeeInvitation.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(true)
      });
      // Mock create
      (db.orm.public.EmployeeInvitation.create as any).mockResolvedValue({
        id: 'inv-1',
        email: createDto.email,
        status: 'PENDING'
      });

      mockMailService.sendInvitationEmail.mockResolvedValue(undefined);

      const result = await service.create(createDto, 'org-1', 'emp-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('inv-1');
      expect(mockMailService.sendInvitationEmail).toHaveBeenCalledWith(
        'test@sify.com',
        'Test User',
        'Test Org',
        'EMPLOYEE',
        null,
        expect.any(String)
      );
    });

    it('should throw InternalServerErrorException and rollback if email fails', async () => {
      // Mock org
      (db.orm.public.Organization.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' })
      });
      // Mock existing employee
      (db.orm.public.Employee.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });
      const deleteMock = vi.fn();
      // Mock pending invitation
      (db.orm.public.EmployeeInvitation.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        delete: deleteMock
      });
      // Mock create
      (db.orm.public.EmployeeInvitation.create as any).mockResolvedValue({
        id: 'inv-1',
        email: createDto.email,
        status: 'PENDING'
      });

      mockMailService.sendInvitationEmail.mockRejectedValue(new InternalServerErrorException('SMTP failed'));

      await expect(service.create(createDto, 'org-1', 'emp-1')).rejects.toThrow(InternalServerErrorException);
      expect(deleteMock).toHaveBeenCalled();
    });
    
    it('should provision user in UMS and send credentials email when username and password provided', async () => {
      const createWithCredsDto = {
        email: 'newuser@sify.com',
        name: 'New Colleague',
        username: 'newcolleague',
        password: 'TemporaryPass123!',
        role: 'EMPLOYEE' as const,
        teamId: null,
      };

      (db.orm.public.Organization.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' })
      });
      (db.orm.public.Employee.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });
      (db.orm.public.EmployeeInvitation.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });
      (db.orm.public.EmployeeInvitation.create as any).mockResolvedValue({
        id: 'inv-2',
        email: createWithCredsDto.email,
        status: 'PENDING'
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ code: 0, message: 'User registered', data: { id: 'ums-123' } })
      }) as any;

      mockMailService.sendInvitationCredentialsEmail.mockResolvedValue(undefined);

      try {
        const result = await service.create(createWithCredsDto, 'org-1', 'emp-1');
        expect(result).toBeDefined();
        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/user'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"username":"newcolleague"')
          })
        );
        expect(mockMailService.sendInvitationCredentialsEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'newuser@sify.com',
            username: 'newcolleague',
            password: 'TemporaryPass123!',
            orgName: 'Test Org'
          })
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should throw ConflictException if UMS reports user already exists', async () => {
      const createWithCredsDto = {
        email: 'existing@sify.com',
        name: 'Existing User',
        username: 'existinguser',
        password: 'TemporaryPass123!',
        role: 'EMPLOYEE' as const,
        teamId: null,
      };

      (db.orm.public.Organization.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' })
      });
      (db.orm.public.Employee.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });
      (db.orm.public.EmployeeInvitation.where as any).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      });

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: vi.fn().mockResolvedValue({ message: 'User with this email already exists' })
      }) as any;

      try {
        await expect(service.create(createWithCredsDto, 'org-1', 'emp-1')).rejects.toThrow(ConflictException);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
