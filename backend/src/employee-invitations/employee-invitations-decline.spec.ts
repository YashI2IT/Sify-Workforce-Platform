import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmployeeInvitationsService } from './employee-invitations.service.js';
import { EmployeeInvitationsController } from './employee-invitations.controller.js';
import { db } from '../prisma/db.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';

vi.mock('../prisma/db.js', () => ({
  db: {
    orm: {
      public: {
        EmployeeInvitation: {
          where: vi.fn(),
        },
        Organization: {
          where: vi.fn(),
        },
        Employee: {
          where: vi.fn(),
        },
      },
    },
    transaction: vi.fn(async (cb) => cb({
      orm: {
        public: {
          Employee: {
            create: vi.fn(),
          },
          EmployeeInvitation: {
            where: vi.fn().mockReturnValue({
              update: vi.fn().mockResolvedValue({ status: 'ACCEPTED' }),
            }),
          },
        },
      },
    })),
  },
}));

vi.mock('../mail/mail.service.js', () => ({
  MailService: vi.fn().mockImplementation(() => ({
    sendInvitationEmail: vi.fn(),
  })),
}));

describe('EmployeeInvitations - Decline Flow', () => {
  let service: EmployeeInvitationsService;
  let controller: EmployeeInvitationsController;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EmployeeInvitationsService({} as any, {} as any);
    controller = new EmployeeInvitationsController(service);
  });

  describe('declineById', () => {
    it('successfully declines a pending invitation for matching user email', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: 'user@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockInvitation),
      } as any);

      const updateMock = vi.fn().mockResolvedValueOnce({ id: 'inv-123', status: 'DECLINED' });
      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        update: updateMock,
      } as any);

      const result = await service.declineById('inv-123', { email: 'user@example.com' });

      expect(result).toEqual({ success: true });
      expect(updateMock).toHaveBeenCalledWith({ status: 'DECLINED' });
    });

    it('throws NotFoundException if invitation does not exist', async () => {
      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(null),
      } as any);

      await expect(service.declineById('inv-not-found', { email: 'user@example.com' }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if invitation is not PENDING', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: 'user@example.com',
        status: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockInvitation),
      } as any);

      await expect(service.declineById('inv-123', { email: 'user@example.com' }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if invitation is expired', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: 'user@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 86400000).toISOString(),
      };

      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockInvitation),
      } as any);

      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        update: vi.fn().mockResolvedValueOnce({ status: 'EXPIRED' }),
      } as any);

      await expect(service.declineById('inv-123', { email: 'user@example.com' }))
        .rejects.toThrow('Invitation has expired');
    });

    it('throws BadRequestException if user email does not match invitation recipient', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: 'intended@example.com',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      };

      vi.mocked(db.orm.public.EmployeeInvitation.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValueOnce(mockInvitation),
      } as any);

      await expect(service.declineById('inv-123', { email: 'other@example.com' }))
        .rejects.toThrow('INVITATION_EMAIL_MISMATCH');
    });
  });

  describe('controller.declineInviteById', () => {
    it('delegates to service when req.umsUser is present', async () => {
      const declineSpy = vi.spyOn(service, 'declineById').mockResolvedValueOnce({ success: true });
      const req = { umsUser: { email: 'user@example.com' } };

      const result = await controller.declineInviteById('inv-123', req);

      expect(declineSpy).toHaveBeenCalledWith('inv-123', req.umsUser);
      expect(result).toEqual({ data: { success: true } });
    });

    it('throws BadRequestException when user is missing from request', async () => {
      const req = {};
      await expect(controller.declineInviteById('inv-123', req))
        .rejects.toThrow('User must be authenticated to decline invitation');
    });
  });
});
