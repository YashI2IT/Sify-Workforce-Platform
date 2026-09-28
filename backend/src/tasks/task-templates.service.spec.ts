import { Test, TestingModule } from '@nestjs/testing';
import { TaskTemplatesService } from './task-templates.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthenticatedContext } from '../auth/authenticated-context.js';

vi.mock('../prisma/db.js', () => {
  const mTaskTemplate = {
    all: vi.fn(),
    where: vi.fn(() => mTaskTemplate),
    orderBy: vi.fn(() => mTaskTemplate),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const mProject = {
    where: vi.fn(() => mProject),
    first: vi.fn(),
  };
  return {
    db: {
      orm: {
        public: {
          TaskTemplate: mTaskTemplate,
          Project: mProject,
        },
      },
    },
    default: {
      orm: {
        public: {
          TaskTemplate: mTaskTemplate,
          Project: mProject,
        },
      },
    },
  };
});

describe('TaskTemplatesService', () => {
  let service: TaskTemplatesService;

  const mockAuth: AuthenticatedContext = {
    employeeId: 'emp-1',
    organizationId: 'org-1',
    email: 'test@example.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskTemplatesService],
    }).compile();

    service = module.get<TaskTemplatesService>(TaskTemplatesService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllByProject', () => {
    it('should return templates', async () => {
      (db.orm.public.Project.first as any).mockResolvedValue({ id: 'proj-1', organizationId: 'org-1' });
      (db.orm.public.TaskTemplate.all as any).mockResolvedValue([{ id: 'tpl-1' }]);

      const result = await service.findAllByProject('proj-1', mockAuth);
      expect(result).toEqual([{ id: 'tpl-1' }]);
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if project not found', async () => {
      (db.orm.public.Project.first as any).mockResolvedValue(null);

      await expect(service.create('proj-1', { name: 'T1', taskName: 'Task 1' } as any, mockAuth))
        .rejects.toThrow(NotFoundException);
    });

    it('should create template successfully', async () => {
      (db.orm.public.Project.first as any).mockResolvedValue({ id: 'proj-1', organizationId: 'org-1', isActive: true });
      (db.orm.public.TaskTemplate.first as any).mockResolvedValue(null);
      (db.orm.public.TaskTemplate.create as any).mockResolvedValue({ id: 'tpl-1', name: 'T1' });

      const result = await service.create('proj-1', { name: 'T1', taskName: 'Task 1' } as any, mockAuth);
      expect(result.id).toBe('tpl-1');
    });
  });

  describe('update', () => {
    it('should update template', async () => {
      (db.orm.public.Project.first as any).mockResolvedValue({ id: 'proj-1', organizationId: 'org-1', isActive: true });
      (db.orm.public.TaskTemplate.first as any)
        .mockResolvedValueOnce({ id: 'tpl-1', name: 'T1', projectId: 'proj-1' }) // first check for existence
        .mockResolvedValueOnce(null); // second check for duplicate name
      (db.orm.public.TaskTemplate.update as any).mockResolvedValue({ id: 'tpl-1', name: 'T2' });

      const result = await service.update('proj-1', 'tpl-1', { name: 'T2' } as any, mockAuth);
      expect(result.name).toBe('T2');
    });
  });

  describe('remove', () => {
    it('should delete template', async () => {
      (db.orm.public.Project.first as any).mockResolvedValue({ id: 'proj-1', organizationId: 'org-1', isActive: true });
      (db.orm.public.TaskTemplate.first as any).mockResolvedValue({ id: 'tpl-1', projectId: 'proj-1' });

      await service.remove('proj-1', 'tpl-1', mockAuth);
      expect(db.orm.public.TaskTemplate.delete).toHaveBeenCalled();
    });
  });
});
