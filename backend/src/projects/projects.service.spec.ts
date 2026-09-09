import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service.js';
import { db } from '../prisma/db.js';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../prisma/db.js', () => {
  const mProject = {
    all: vi.fn(),
    where: vi.fn(() => mProject),
    first: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  const mOrg = {
    where: vi.fn(() => mOrg),
    first: vi.fn(),
  };

  return {
    db: {
      orm: {
        public: {
          Project: mProject,
          Organization: mOrg,
        },
      },
    },
  };
});

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectsService],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should list only active projects by filtering isActive: true', async () => {
      const activeProjects = [
        { id: 'p1', name: 'Project 1', code: 'P1', status: 'ACTIVE', isActive: true },
      ];
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce(db.orm.public.Project as any);
      vi.mocked(db.orm.public.Project.all).mockResolvedValueOnce(activeProjects as any);

      const result = await service.findAll();

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual(activeProjects);
    });
  });

  describe('findOne', () => {
    it('should return active project by id', async () => {
      const project = { id: 'p1', name: 'Project 1', code: 'P1', status: 'ACTIVE', isActive: true };
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(project as any);

      const result = await service.findOne('p1');

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ id: 'p1' });
      expect(result).toEqual(project);
    });

    it('should return inactive project by id for historical records and reporting', async () => {
      const inactiveProject = {
        id: 'p2',
        name: 'Archived Project',
        code: 'P2',
        status: 'CLOSED',
        isActive: false,
      };
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(inactiveProject as any);

      const result = await service.findOne('p2');

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ id: 'p2' });
      expect(result).toEqual(inactiveProject);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);

      await expect(service.findOne('p-none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      organizationId: 'org-1',
      name: 'Alpha Project',
      code: 'ALPHA',
      status: 'PLANNING',
    };

    it('should throw NotFoundException if organization does not exist', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate project name in organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce({ id: 'p-existing' } as any);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if duplicate project code in organization', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Project.first)
        .mockResolvedValueOnce(null) // name check passes
        .mockResolvedValueOnce({ id: 'p-code-dup' } as any); // code check fails

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create project with explicit fields and default isActive to true', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Project.first)
        .mockResolvedValueOnce(null) // name check passes
        .mockResolvedValueOnce(null); // code check passes

      const created = { id: 'p1', ...dto, isActive: true };
      vi.mocked(db.orm.public.Project.create).mockResolvedValueOnce(created as any);

      const result = await service.create(dto);

      expect(db.orm.public.Project.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Alpha Project',
        code: 'ALPHA',
        status: 'PLANNING',
        isActive: true,
      });
      expect(result).toEqual(created);
    });

    it('should create project with explicit isActive boolean if provided', async () => {
      vi.mocked(db.orm.public.Organization.first).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(db.orm.public.Project.first)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const created = { id: 'p1', ...dto, isActive: false };
      vi.mocked(db.orm.public.Project.create).mockResolvedValueOnce(created as any);

      const result = await service.create({ ...dto, isActive: false });

      expect(db.orm.public.Project.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Alpha Project',
        code: 'ALPHA',
        status: 'PLANNING',
        isActive: false,
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    const existing = {
      id: 'p1',
      organizationId: 'org-1',
      name: 'Alpha Project',
      code: 'ALPHA',
      status: 'PLANNING',
      isActive: true,
    };

    it('should throw NotFoundException if project not found', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(null);

      await expect(service.update('p1', { name: 'Beta' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updating to duplicate name in organization', async () => {
      vi.mocked(db.orm.public.Project.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce({ id: 'p2' } as any); // duplicate name

      await expect(service.update('p1', { name: 'Beta' })).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if updating to duplicate code in organization', async () => {
      vi.mocked(db.orm.public.Project.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce({ id: 'p2' } as any); // duplicate code

      await expect(service.update('p1', { code: 'BETA' })).rejects.toThrow(ConflictException);
    });

    it('should soft-deactivate a project (isActive: false)', async () => {
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(existing as any);
      const updated = { ...existing, isActive: false };
      vi.mocked(db.orm.public.Project.update).mockResolvedValueOnce(updated as any);

      const result = await service.update('p1', { isActive: false });

      expect(db.orm.public.Project.update).toHaveBeenCalledWith({ isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should reactivate a project (isActive: true)', async () => {
      const inactive = { ...existing, isActive: false };
      vi.mocked(db.orm.public.Project.first).mockResolvedValueOnce(inactive as any);
      const reactivated = { ...inactive, isActive: true };
      vi.mocked(db.orm.public.Project.update).mockResolvedValueOnce(reactivated as any);

      const result = await service.update('p1', { isActive: true });

      expect(db.orm.public.Project.update).toHaveBeenCalledWith({ isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('should update allowed fields and keep organizationId immutable', async () => {
      vi.mocked(db.orm.public.Project.first)
        .mockResolvedValueOnce(existing as any)
        .mockResolvedValueOnce(null) // name check passes
        .mockResolvedValueOnce(null); // code check passes

      const updatePayload = {
        name: 'New Name',
        code: 'NEW_CODE',
        status: 'IN_PROGRESS',
        isActive: true,
      };

      const updated = { ...existing, ...updatePayload };
      vi.mocked(db.orm.public.Project.update).mockResolvedValueOnce(updated as any);

      const result = await service.update('p1', updatePayload);

      expect(db.orm.public.Project.update).toHaveBeenCalledWith(updatePayload);
      expect(result).toEqual(updated);
    });
  });
});
