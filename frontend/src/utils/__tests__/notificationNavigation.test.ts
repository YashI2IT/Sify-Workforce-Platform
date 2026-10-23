import { describe, it, expect } from 'vitest';
import {
  resolveNotificationDestination,
  isValidInternalRoute,
  type NotificationPayload,
} from '../notificationNavigation';

describe('notificationNavigation Utility', () => {
  describe('isValidInternalRoute Security Validator', () => {
    it('accepts safe relative application routes', () => {
      expect(isValidInternalRoute('/projects/proj-1')).toBe(true);
      expect(isValidInternalRoute('/projects/proj-1?taskId=task-2')).toBe(true);
      expect(isValidInternalRoute('/timesheets/ts-100')).toBe(true);
      expect(isValidInternalRoute('/approvals/timesheets/ts-100')).toBe(true);
      expect(isValidInternalRoute('/submission-approvals?submissionId=sub-200')).toBe(true);
      expect(isValidInternalRoute('/dashboard')).toBe(true);
      expect(isValidInternalRoute('/employees')).toBe(true);
      expect(isValidInternalRoute('/teams')).toBe(true);
      expect(isValidInternalRoute('/organization')).toBe(true);
    });

    it('rejects external URLs and dangerous schemes', () => {
      expect(isValidInternalRoute('https://evil.com/projects')).toBe(false);
      expect(isValidInternalRoute('http://evil.com')).toBe(false);
      expect(isValidInternalRoute('//evil.com/projects')).toBe(false);
      expect(isValidInternalRoute('javascript:alert(1)')).toBe(false);
      expect(isValidInternalRoute('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidInternalRoute('/projects<script>')).toBe(false);
      expect(isValidInternalRoute('')).toBe(false);
      expect(isValidInternalRoute(null)).toBe(false);
      expect(isValidInternalRoute(undefined)).toBe(false);
      expect(isValidInternalRoute('/unauthorized-random-prefix')).toBe(false);
    });
  });

  describe('resolveNotificationDestination', () => {
    describe('Pre-validated Destination Reuse', () => {
      it('reuses safe pre-existing internal destination', () => {
        const notif: NotificationPayload = {
          type: 'CUSTOM_EVENT',
          destination: '/projects/proj-abc?taskId=task-xyz',
        };
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-abc?taskId=task-xyz');
      });

      it('ignores untrusted external destinations and falls back safely', () => {
        const notif: NotificationPayload = {
          type: 'TASK_ASSIGNED',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-1:task-2',
          destination: 'https://attacker.com/steal-creds',
        };
        // Rejects external URL and falls back to entity record mapping
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-1?taskId=task-2');
      });
    });

    describe('Task Record Destinations', () => {
      it('resolves TASK_ASSIGNED with composite projectId:taskId', () => {
        const notif: NotificationPayload = {
          type: 'TASK_ASSIGNED',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-10:task-20',
        };
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-10?taskId=task-20');
      });

      it('resolves TASK_STATUS_CHANGED with composite projectId:taskId', () => {
        const notif: NotificationPayload = {
          type: 'TASK_STATUS_CHANGED',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-10:task-20',
        };
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-10?taskId=task-20');
      });

      it('resolves DEPENDENCY_ADDED to successor task in project', () => {
        const notif: NotificationPayload = {
          type: 'DEPENDENCY_ADDED',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-10:task-successor',
        };
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-10?taskId=task-successor');
      });

      it('resolves COMMENT_ADDED and COMMENT_MENTION to task in project', () => {
        const commentNotif: NotificationPayload = {
          type: 'COMMENT_ADDED',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-10:task-20',
        };
        expect(resolveNotificationDestination(commentNotif)).toBe('/projects/proj-10?taskId=task-20');

        const mentionNotif: NotificationPayload = {
          type: 'COMMENT_MENTION',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-10:task-20',
        };
        expect(resolveNotificationDestination(mentionNotif)).toBe('/projects/proj-10?taskId=task-20');
      });

      it('safely handles non-composite or missing entityId for tasks', () => {
        expect(resolveNotificationDestination({
          type: 'TASK_ASSIGNED',
          relatedEntityType: 'TASK',
          relatedEntityId: 'proj-10',
        })).toBe('/projects/proj-10');

        expect(resolveNotificationDestination({
          type: 'TASK_ASSIGNED',
          relatedEntityType: 'TASK',
        })).toBe('/projects');
      });
    });

    describe('Project Record Destinations', () => {
      it('resolves PROJECT_ASSIGNED to project detail', () => {
        const notif: NotificationPayload = {
          type: 'PROJECT_ASSIGNED',
          relatedEntityType: 'PROJECT',
          relatedEntityId: 'proj-999',
        };
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-999');
      });

      it('resolves PROJECT_UNASSIGNED to project detail', () => {
        const notif: NotificationPayload = {
          type: 'PROJECT_UNASSIGNED',
          relatedEntityType: 'PROJECT',
          relatedEntityId: 'proj-999',
        };
        expect(resolveNotificationDestination(notif)).toBe('/projects/proj-999');
      });

      it('safely handles missing projectId', () => {
        expect(resolveNotificationDestination({
          type: 'PROJECT_ASSIGNED',
          relatedEntityType: 'PROJECT',
        })).toBe('/projects');
      });
    });

    describe('Timesheet and Submission Record Destinations', () => {
      it('routes TIMESHEET_SUBMITTED for submission batch to submission approvals with ID', () => {
        const notif: NotificationPayload = {
          type: 'TIMESHEET_SUBMITTED',
          relatedEntityType: 'TIMESHEET_SUBMISSION',
          relatedEntityId: 'sub-444',
        };
        expect(resolveNotificationDestination(notif)).toBe('/submission-approvals?submissionId=sub-444');
      });

      it('routes TIMESHEET_SUBMITTED for weekly timesheet to manager approval review', () => {
        const notif: NotificationPayload = {
          type: 'TIMESHEET_SUBMITTED',
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: 'ts-555',
        };
        expect(resolveNotificationDestination(notif)).toBe('/approvals/timesheets/ts-555');
      });

      it('routes TIMESHEET_APPROVED to employee timesheet detail', () => {
        const notif: NotificationPayload = {
          type: 'TIMESHEET_APPROVED',
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: 'ts-555',
        };
        expect(resolveNotificationDestination(notif)).toBe('/timesheets/ts-555');
      });

      it('routes TIMESHEET_REJECTED for submission to time-entries for re-editing', () => {
        const notif: NotificationPayload = {
          type: 'TIMESHEET_REJECTED',
          relatedEntityType: 'TIMESHEET_SUBMISSION',
          relatedEntityId: 'sub-444',
        };
        expect(resolveNotificationDestination(notif)).toBe('/time-entries');
      });

      it('routes TIMESHEET_REJECTED for standard timesheet to timesheet detail', () => {
        const notif: NotificationPayload = {
          type: 'TIMESHEET_REJECTED',
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: 'ts-555',
        };
        expect(resolveNotificationDestination(notif)).toBe('/timesheets/ts-555');
      });

      it('routes TIMESHEET_REMINDER to employee timesheet', () => {
        const notif: NotificationPayload = {
          type: 'TIMESHEET_REMINDER',
          relatedEntityType: 'TIMESHEET',
          relatedEntityId: 'ts-555',
        };
        expect(resolveNotificationDestination(notif)).toBe('/timesheets/ts-555');
      });
    });

    describe('Other Organizational Entities & Fallbacks', () => {
      it('routes EMPLOYEE entity to /employees', () => {
        expect(resolveNotificationDestination({ relatedEntityType: 'EMPLOYEE' })).toBe('/employees');
      });

      it('routes TEAM entity to /teams', () => {
        expect(resolveNotificationDestination({ relatedEntityType: 'TEAM' })).toBe('/teams');
      });

      it('routes ORGANIZATION entity to /organization', () => {
        expect(resolveNotificationDestination({ relatedEntityType: 'ORGANIZATION' })).toBe('/organization');
      });

      it('applies contextual fallback instead of dumping to dashboard', () => {
        expect(resolveNotificationDestination({ type: 'PROJECT_SOMETHING' })).toBe('/projects');
        expect(resolveNotificationDestination({ type: 'TIME_RECORD_ALERT' })).toBe('/timesheets');
        expect(resolveNotificationDestination({ type: 'APPROVAL_DEADLINE' })).toBe('/approvals');
      });

      it('falls back to /dashboard only when no entity or recognizable context exists', () => {
        expect(resolveNotificationDestination({} as any)).toBe('/dashboard');
        expect(resolveNotificationDestination(null as any)).toBe('/dashboard');
      });
    });
  });
});
