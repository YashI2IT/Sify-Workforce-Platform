import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException } from '@nestjs/common';

vi.mock('../prisma/db.js', () => {
  const mNotification = {
    where: vi.fn(),
    create: vi.fn(),
  };
  return {
    db: {
      orm: {
        public: {
          Notification: mNotification
        }
      },
      transaction: vi.fn(async (cb: any) => cb({
        orm: {
          public: {
            Notification: mNotification
          }
        }
      })),
    }
  };
});

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('createNotification', () => {
    it('creates a notification correctly if no unread duplicate exists', async () => {
      const dto = {
        recipientId: 'emp1',
        type: 'TASK_ASSIGNED',
        title: 'Title',
        message: 'Message',
        relatedEntityType: 'TASK',
        relatedEntityId: 't1'
      };
      
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockWhere = vi.fn().mockReturnValue({ first: mockFirst });
      (db.orm.public.Notification.where as any) = mockWhere;

      const mockCreate = vi.fn().mockResolvedValue({ ...dto, id: 'n1', isRead: false });
      (db.orm.public.Notification.create as any) = mockCreate;
      
      const result = await service.createNotification(dto);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        ...dto,
        isRead: false
      }));
      expect(result.id).toBe('n1');
    });

    it('prevents duplicate unread notifications for the same event type and entity', async () => {
      const dto = {
        recipientId: 'emp1',
        type: 'TASK_ASSIGNED',
        title: 'Title',
        message: 'Message',
        relatedEntityType: 'TASK',
        relatedEntityId: 't1'
      };
      
      const mockFirst = vi.fn().mockResolvedValue({ id: 'existing1', isRead: false });
      const mockWhere = vi.fn().mockReturnValue({ first: mockFirst });
      (db.orm.public.Notification.where as any) = mockWhere;

      const mockCreate = vi.fn();
      (db.orm.public.Notification.create as any) = mockCreate;

      const result = await service.createNotification(dto);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.id).toBe('existing1');
    });
  });

  describe('getMyNotifications', () => {
    it('returns notifications for the authenticated user only (authorization)', async () => {
      const mockAll = vi.fn().mockResolvedValue([{ id: 'n1', recipientId: 'emp1' }]);
      const mockOrderBy = vi.fn().mockReturnValue({ all: mockAll });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      (db.orm.public.Notification.where as any) = mockWhere;

      const auth: any = { employeeId: 'emp1' };
      const result = await service.getMyNotifications(auth);

      expect(mockWhere).toHaveBeenCalledWith({ recipientId: 'emp1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('markAsRead', () => {
    it('throws NotFound if notification belongs to someone else', async () => {
      const mockFirst = vi.fn().mockResolvedValue(null);
      const mockWhere = vi.fn().mockReturnValue({ first: mockFirst });
      (db.orm.public.Notification.where as any) = mockWhere;

      await expect(service.markAsRead('n1', { employeeId: 'emp1' } as any)).rejects.toThrow(NotFoundException);
      expect(mockWhere).toHaveBeenCalledWith({ id: 'n1', recipientId: 'emp1' });
    });

    it('marks as read if not already read (unread/read state)', async () => {
      const mockFirst = vi.fn().mockResolvedValue({ id: 'n1', recipientId: 'emp1', isRead: false });
      const mockUpdate = vi.fn().mockResolvedValue({ count: 1 });
      
      (db.orm.public.Notification.where as any) = vi.fn((args: any) => {
        if (args.id === 'n1' && args.recipientId === 'emp1') {
          return { first: mockFirst };
        }
        if (args.id === 'n1' && Object.keys(args).length === 1) {
          return { update: mockUpdate };
        }
        return { first: vi.fn(), update: vi.fn() };
      });

      const result = await service.markAsRead('n1', { employeeId: 'emp1' } as any);
      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ isRead: true }));
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications for the user', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ count: 2 });
      const mockWhere = vi.fn().mockReturnValue({ update: mockUpdate });
      (db.orm.public.Notification.where as any) = mockWhere;

      const result = await service.markAllAsRead({ employeeId: 'emp1' } as any);
      
      expect(mockWhere).toHaveBeenCalledWith({ recipientId: 'emp1', isRead: false });
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ isRead: true }));
      expect(result.success).toBe(true);
    });
  });
});
