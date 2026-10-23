import { describe, it, expect } from 'vitest';
import { computeNotificationDestination } from './notifications.service.js';

describe('NotificationsService - Destination Mapping', () => {
  describe('Task Notifications', () => {
    it('maps TASK_ASSIGNED with composite projectId:taskId to project task view', () => {
      const destination = computeNotificationDestination({
        type: 'TASK_ASSIGNED',
        relatedEntityType: 'TASK',
        relatedEntityId: 'proj-123:task-456',
      });
      expect(destination).toBe('/projects/proj-123?taskId=task-456');
    });

    it('maps TASK_STATUS_CHANGED with composite projectId:taskId to project task view', () => {
      const destination = computeNotificationDestination({
        type: 'TASK_STATUS_CHANGED',
        relatedEntityType: 'TASK',
        relatedEntityId: 'proj-abc:task-xyz',
      });
      expect(destination).toBe('/projects/proj-abc?taskId=task-xyz');
    });

    it('maps DEPENDENCY_ADDED to successor task in project', () => {
      const destination = computeNotificationDestination({
        type: 'DEPENDENCY_ADDED',
        relatedEntityType: 'TASK',
        relatedEntityId: 'proj-77:task-99',
      });
      expect(destination).toBe('/projects/proj-77?taskId=task-99');
    });

    it('maps COMMENT_ADDED and COMMENT_MENTION to task within project', () => {
      const commentDest = computeNotificationDestination({
        type: 'COMMENT_ADDED',
        relatedEntityType: 'TASK',
        relatedEntityId: 'proj-1:task-2',
      });
      expect(commentDest).toBe('/projects/proj-1?taskId=task-2');

      const mentionDest = computeNotificationDestination({
        type: 'COMMENT_MENTION',
        relatedEntityType: 'TASK',
        relatedEntityId: 'proj-1:task-2',
      });
      expect(mentionDest).toBe('/projects/proj-1?taskId=task-2');
    });

    it('falls back safely when task entity has single ID or missing ID', () => {
      expect(computeNotificationDestination({
        type: 'TASK_ASSIGNED',
        relatedEntityType: 'TASK',
        relatedEntityId: 'proj-only',
      })).toBe('/projects/proj-only');

      expect(computeNotificationDestination({
        type: 'TASK_ASSIGNED',
        relatedEntityType: 'TASK',
        relatedEntityId: undefined,
      })).toBe('/projects');
    });
  });

  describe('Project Notifications', () => {
    it('maps PROJECT_ASSIGNED to the project detail page', () => {
      const destination = computeNotificationDestination({
        type: 'PROJECT_ASSIGNED',
        relatedEntityType: 'PROJECT',
        relatedEntityId: 'proj-500',
      });
      expect(destination).toBe('/projects/proj-500');
    });

    it('maps PROJECT_UNASSIGNED to the project page', () => {
      const destination = computeNotificationDestination({
        type: 'PROJECT_UNASSIGNED',
        relatedEntityType: 'PROJECT',
        relatedEntityId: 'proj-500',
      });
      expect(destination).toBe('/projects/proj-500');
    });

    it('falls back to /projects when project entityId is missing', () => {
      const destination = computeNotificationDestination({
        type: 'PROJECT_ASSIGNED',
        relatedEntityType: 'PROJECT',
      });
      expect(destination).toBe('/projects');
    });
  });

  describe('Timesheet and Submission Notifications', () => {
    it('maps TIMESHEET_SUBMITTED with submission to submission approvals with ID', () => {
      const destination = computeNotificationDestination({
        type: 'TIMESHEET_SUBMITTED',
        relatedEntityType: 'TIMESHEET_SUBMISSION',
        relatedEntityId: 'sub-888',
      });
      expect(destination).toBe('/submission-approvals?submissionId=sub-888');
    });

    it('maps TIMESHEET_SUBMITTED for standard timesheet to manager timesheet review', () => {
      const destination = computeNotificationDestination({
        type: 'TIMESHEET_SUBMITTED',
        relatedEntityType: 'TIMESHEET',
        relatedEntityId: 'ts-202',
      });
      expect(destination).toBe('/approvals/timesheets/ts-202');
    });

    it('maps TIMESHEET_APPROVED to employee timesheet detail', () => {
      const destination = computeNotificationDestination({
        type: 'TIMESHEET_APPROVED',
        relatedEntityType: 'TIMESHEET',
        relatedEntityId: 'ts-202',
      });
      expect(destination).toBe('/timesheets/ts-202');
    });

    it('maps TIMESHEET_REJECTED to employee timesheet detail or time-entries', () => {
      const tsDest = computeNotificationDestination({
        type: 'TIMESHEET_REJECTED',
        relatedEntityType: 'TIMESHEET',
        relatedEntityId: 'ts-202',
      });
      expect(tsDest).toBe('/timesheets/ts-202');

      const subDest = computeNotificationDestination({
        type: 'TIMESHEET_REJECTED',
        relatedEntityType: 'TIMESHEET_SUBMISSION',
        relatedEntityId: 'sub-303',
      });
      expect(subDest).toBe('/time-entries');
    });

    it('maps TIMESHEET_REMINDER to employee timesheet', () => {
      const destination = computeNotificationDestination({
        type: 'TIMESHEET_REMINDER',
        relatedEntityType: 'TIMESHEET',
        relatedEntityId: 'ts-55',
      });
      expect(destination).toBe('/timesheets/ts-55');
    });
  });

  describe('Other Organizational Entities & Fallbacks', () => {
    it('maps EMPLOYEE entity to /employees', () => {
      expect(computeNotificationDestination({ relatedEntityType: 'EMPLOYEE' })).toBe('/employees');
    });

    it('maps TEAM entity to /teams', () => {
      expect(computeNotificationDestination({ relatedEntityType: 'TEAM' })).toBe('/teams');
    });

    it('maps ORGANIZATION entity to /organization', () => {
      expect(computeNotificationDestination({ relatedEntityType: 'ORGANIZATION' })).toBe('/organization');
    });

    it('returns null for completely unrecognized notifications without entity', () => {
      expect(computeNotificationDestination({ type: 'UNKNOWN_EVENT' })).toBeNull();
    });
  });
});
