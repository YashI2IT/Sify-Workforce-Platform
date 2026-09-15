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
      const projects = [{ id: 'p1', name: 'Portal' }];
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(projects)
            }))
          }))
        })),
        all: vi.fn().mockResolvedValue(projects),
        count: vi.fn().mockResolvedValue(1)
      } as any);

      const result = await service.findAll('org1', 1, 50);

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ organizationId: 'org1', isActive: true });
      expect(result.data).toEqual(projects);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return active project by id', async () => {
      const activeProject = { id: 'p1', name: 'Project 1', code: 'P1', status: 'ACTIVE', isActive: true };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(activeProject),
        count: vi.fn().mockResolvedValue(1)
      } as any);

      const result = await service.findOne('p1', 'org1');

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ id: 'p1', organizationId: 'org1' });
      expect(result).toEqual(activeProject);
    });

    it('should return inactive project by id for historical records and reporting', async () => {
      const inactiveProject = { id: 'p2', name: 'Archived Project', code: 'P2', status: 'CLOSED', isActive: false };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(inactiveProject),
        count: vi.fn().mockResolvedValue(1)
      } as any);

      const result = await service.findOne('p2', 'org1');

      expect(db.orm.public.Project.where).toHaveBeenCalledWith({ id: 'p2', organizationId: 'org1' });
      expect(result).toEqual(inactiveProject);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.findOne('p-none', 'org1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { name: 'Alpha Project', code: 'ALPHA', status: 'PLANNING' };

    it('should create project with explicit fields and default isActive to true', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // code check
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // name check
      } as any);
      vi.mocked(db.orm.public.Project.create).mockResolvedValueOnce({ id: 'p1', organizationId: 'org-1', ...dto, isActive: true } as any);

      const result = await service.create(dto, 'org-1');

      expect(db.orm.public.Project.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Alpha Project',
        code: 'ALPHA',
        status: 'PLANNING',
        isActive: true,
      });
      expect(result.id).toBe('p1');
    });

    it('should create project with explicit isActive boolean if provided', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // code check
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // name check
      } as any);
      vi.mocked(db.orm.public.Project.create).mockResolvedValueOnce({ id: 'p1', organizationId: 'org-1', ...dto, isActive: false } as any);

      const result = await service.create({ ...dto, isActive: false }, 'org-1');

      expect(db.orm.public.Project.create).toHaveBeenCalledWith({
        organizationId: 'org-1',
        name: 'Alpha Project',
        code: 'ALPHA',
        status: 'PLANNING',
        isActive: false,
      });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.create(dto, 'org-none')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate project name in organization', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p2' }) // name exists
      } as any);

      await expect(service.create(dto, 'org-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if duplicate project code in organization', async () => {
      vi.mocked(db.orm.public.Organization.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'org-1' })
      } as any);
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null) // name ok
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p3' }) // code exists
      } as any);

      await expect(service.create(dto, 'org-1')).rejects.toThrow(ConflictException);
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
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue(null)
      } as any);

      await expect(service.update('p1', { name: 'Beta' }, 'org1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updating to duplicate name in organization', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1', name: 'Alpha' }) // exists
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p2' }) // duplicate name exists
      } as any);

      await expect(service.update('p1', { name: 'Beta' }, 'org1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if updating to duplicate code in organization', async () => {
      vi.mocked(db.orm.public.Project.where).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p1', organizationId: 'org1', name: 'Alpha' }) // exists
      } as any).mockReturnValueOnce({
        first: vi.fn().mockResolvedValue({ id: 'p2' }) // code duplicate
      } as any);

      await expect(service.update('p1', { code: 'BETA' }, 'org1')).rejects.toThrow(ConflictException);
    });

    it('should soft-deactivate a project (isActive: false)', async () => {
      const updated = { ...existing, isActive: false };
      const mockUpdate = vi.fn().mockResolvedValue(updated);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing),
        update: mockUpdate
      } as any);
      
      const result = await service.update('p1', { isActive: false }, 'org1');

      expect(mockUpdate).toHaveBeenCalledWith({ isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should reactivate a project (isActive: true)', async () => {
      const inactive = { ...existing, isActive: false };
      const reactivated = { ...inactive, isActive: true };
      const mockUpdate = vi.fn().mockResolvedValue(reactivated);
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(inactive),
        update: mockUpdate
      } as any);
      
      const result = await service.update('p1', { isActive: true }, 'org1');

      expect(mockUpdate).toHaveBeenCalledWith({ isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('should update allowed fields and keep organizationId immutable', async () => {
      const updatePayload = { name: 'Omega' };
      const updated = { ...existing, ...updatePayload };
      vi.mocked(db.orm.public.Project.where).mockReturnValue({
        first: vi.fn().mockResolvedValue(existing).mockResolvedValueOnce(existing).mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        update: vi.fn().mockResolvedValue(updated)
      } as any);

      const result = await service.update('p1', updatePayload, 'org1');
      expect(result.name).toBe('Omega');
    });
  });
});
