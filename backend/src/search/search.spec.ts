import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { db } from '../prisma/db.js';

describe('SearchService & SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  const adminAuth = {
    employeeId: 'emp-admin',
    organizationId: 'org-1',
    roles: ['ADMIN'],
    userId: 'user-admin',
  } as any;

  const managerAuth = {
    employeeId: 'emp-manager',
    organizationId: 'org-1',
    roles: ['MANAGER'],
    userId: 'user-mgr',
  } as any;

  const staffAuth = {
    employeeId: 'emp-staff',
    organizationId: 'org-1',
    roles: ['EMPLOYEE'],
    userId: 'user-staff',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SearchService();
    controller = new SearchController(service);
  });

  describe('SearchController - Input Validation', () => {
    it('returns empty result set for blank or whitespace query', async () => {
      const result = await controller.search(adminAuth, '   ');
      expect(result.totalMatches).toBe(0);
      expect(result.projects).toEqual([]);
      expect(result.tasks).toEqual([]);
      expect(result.employees).toEqual([]);
      expect(result.teams).toEqual([]);
    });

    it('rejects search queries longer than 100 characters', async () => {
      const longQuery = 'a'.repeat(101);
      await expect(controller.search(adminAuth, longQuery)).rejects.toThrow(BadRequestException);
    });

    it('accepts valid query and delegates to SearchService', async () => {
      const mockResponse = {
        projects: [{ id: 'p-1', type: 'project', title: 'Portal', url: '/projects/p-1' } as any],
        tasks: [],
        employees: [],
        teams: [],
        timesheets: [],
        totalMatches: 1,
      };
      vi.spyOn(service, 'search').mockResolvedValue(mockResponse);

      const result = await controller.search(adminAuth, 'Portal', '5');
      expect(result).toEqual(mockResponse);
      expect(service.search).toHaveBeenCalledWith('Portal', adminAuth, 5);
    });
  });

  describe('SearchService - Data Scoping & Role Isolation', () => {
    it('grants ADMIN access to all org projects in accessible projects list', async () => {
      vi.spyOn(db.orm.public.Project, 'where').mockReturnValue({
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]),
        }),
      } as any);

      const ids = await service.getAccessibleProjectIds(adminAuth);
      expect(ids).toEqual(['p-1', 'p-2']);
      expect(db.orm.public.Project.where).toHaveBeenCalledWith({
        organizationId: 'org-1',
        isActive: true,
      });
    });

    it('scopes EMPLOYEE to specifically assigned projects via EmployeeProject', async () => {
      vi.spyOn(db.orm.public.EmployeeProject, 'where').mockReturnValue({
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ projectId: 'p-assigned-1' }]),
        }),
      } as any);

      const ids = await service.getAccessibleProjectIds(staffAuth);
      expect(ids).toEqual(['p-assigned-1']);
    });

    it('scopes MANAGER to assigned projects plus managed team member projects', async () => {
      // 1. Managed teams
      vi.spyOn(db.orm.public.Team, 'where').mockReturnValue({
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ id: 'team-1' }]),
        }),
      } as any);

      // 2. Team members
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([{ id: 'emp-member-1' }]),
          }),
        }),
      } as any);

      // 3. EmployeeProject assignments
      vi.spyOn(db.orm.public.EmployeeProject, 'where').mockReturnValue({
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([
            { projectId: 'p-mgr' },
            { projectId: 'p-team-member' },
          ]),
        }),
      } as any);

      const ids = await service.getAccessibleProjectIds(managerAuth);
      expect(ids).toContain('p-mgr');
      expect(ids).toContain('p-team-member');
    });
  });

  describe('SearchService - Ranking & Ticket ID Prioritization', () => {
    it('prioritizes exact ticket ID matches over partial text matches', async () => {
      // Mock accessible projects
      vi.spyOn(service, 'getAccessibleProjectIds').mockResolvedValue(['p-1']);

      // Mock projects query
      vi.spyOn(db.orm.public.Project, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([{ id: 'p-1', name: 'Workforce Portal', code: 'WP' }]),
        }),
      } as any);

      // Mock tasks query returning 2 tasks: one with exact ticket ID match and one with name match
      vi.spyOn(db.orm.public.Task, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              all: vi.fn().mockResolvedValue([
                { id: 't-2', name: 'Fix PRJ-10 login bug', ticketId: 'PRJ-99', projectId: 'p-1', status: 'TODO' },
                { id: 't-1', name: 'Design Header', ticketId: 'PRJ-10', projectId: 'p-1', status: 'IN_PROGRESS' },
              ]),
            }),
          }),
        }),
      } as any);

      // Mock employees
      vi.spyOn(db.orm.public.Employee, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([]),
          }),
        }),
        select: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Mock teams
      vi.spyOn(db.orm.public.Team, 'where').mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await service.search('PRJ-10', adminAuth, 5);
      expect(result.tasks.length).toBe(2);
      // The task with exact ticket ID PRJ-10 must be ranked #1
      expect(result.tasks[0].id).toBe('t-1');
      expect(result.tasks[0].badge).toBe('PRJ-10');
      expect(result.tasks[0].url).toBe('/projects/p-1?taskId=t-1');
    });
  });
});
