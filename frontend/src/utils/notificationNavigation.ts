/**
 * Notification Destination Resolver — Sify Workforce Platform
 * 
 * Safely resolves internal application routes for notifications using reliable record
 * identifiers (entity type, entity ID, project ID), preventing untrusted external
 * navigation, handling composite identifiers, and providing graceful fallbacks.
 */

export interface NotificationPayload {
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  destination?: string | null;
  isRead?: boolean;
  [key: string]: any;
}

/**
 * Validates whether a provided destination string is a safe, relative internal route.
 * Strictly blocks external URLs (http, https, protocol-relative '//'), script schemes,
 * and dangerous characters.
 */
export const isValidInternalRoute = (route?: string | null): boolean => {
  if (!route || typeof route !== 'string') return false;
  const trimmed = route.trim();

  // Must begin with a single slash and NOT a double slash (protocol-relative URL)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return false;
  }

  // Must not contain URL protocols or dangerous schemes anywhere
  const forbiddenPatterns = [
    /^[a-z][a-z0-9+.-]*:/i, // schemes like http:, https:, javascript:, data:
    /[<>"'`\\]/,            // HTML / script injection characters
    /\s/,                   // whitespace
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }

  // Check against permitted app route prefixes
  const allowedPrefixes = [
    '/projects',
    '/timesheets',
    '/time-entries',
    '/team-timesheets',
    '/approvals',
    '/submission-approvals',
    '/employees',
    '/teams',
    '/organization',
    '/admin',
    '/settings',
    '/reports',
    '/dashboard',
  ];

  return allowedPrefixes.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`) || trimmed.startsWith(`${prefix}?`)
  );
};

/**
 * Resolves the exact context-aware internal destination for a given notification.
 * 
 * Navigation hierarchy:
 * 1. Pre-validated internal `destination` property (if supplied and safe).
 * 2. Exact record routing by `relatedEntityType` and `relatedEntityId`.
 * 3. Type-based event mapping (for supported workforce notification events).
 * 4. Contextual domain fallback (e.g. `/projects`, `/timesheets`).
 */
export const resolveNotificationDestination = (
  notification: NotificationPayload,
  _userRole?: string
): string => {
  if (!notification) return '/dashboard';

  // 1. If notification already includes a valid internal destination, reuse it safely
  if (notification.destination && isValidInternalRoute(notification.destination)) {
    return notification.destination.trim();
  }

  const entityType = (notification.relatedEntityType || '').toUpperCase().trim();
  const entityId = (notification.relatedEntityId || '').trim();
  const type = (notification.type || '').toUpperCase().trim();

  // 2. Task notifications (composite format: `${projectId}:${taskId}`)
  if (
    entityType === 'TASK' ||
    type === 'TASK_ASSIGNED' ||
    type === 'TASK_STATUS_CHANGED' ||
    type === 'DEPENDENCY_ADDED' ||
    type === 'DEPENDENCY_REMOVED' ||
    type === 'COMMENT_ADDED' ||
    type === 'COMMENT_MENTION' ||
    type.startsWith('TASK_') ||
    type.startsWith('COMMENT_') ||
    type.startsWith('DEPENDENCY_')
  ) {
    if (entityId) {
      const parts = entityId.split(':');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const projectId = encodeURIComponent(parts[0]);
        const taskId = encodeURIComponent(parts[1]);
        return `/projects/${projectId}?taskId=${taskId}`;
      }
      // Single ID provided
      return `/projects/${encodeURIComponent(entityId)}`;
    }
    return '/projects';
  }

  // 3. Project notifications
  if (
    entityType === 'PROJECT' ||
    type === 'PROJECT_ASSIGNED' ||
    type === 'PROJECT_UNASSIGNED' ||
    type === 'PROJECT_UPDATE' ||
    type.startsWith('PROJECT_')
  ) {
    if (entityId) {
      return `/projects/${encodeURIComponent(entityId)}`;
    }
    return '/projects';
  }

  // 4. Timesheet Submissions (per-entry or daily/weekly submission batch)
  if (entityType === 'TIMESHEET_SUBMISSION') {
    if (type === 'TIMESHEET_SUBMITTED' || type === 'TIMESHEET_RESUBMITTED') {
      // Sent to approver (Manager / Admin)
      return entityId
        ? `/submission-approvals?submissionId=${encodeURIComponent(entityId)}`
        : '/submission-approvals';
    }
    if (type === 'TIMESHEET_REJECTED') {
      // Rejected submission sends employee to time-entries to re-edit
      return '/time-entries';
    }
    // TIMESHEET_APPROVED or general submission
    return '/timesheets';
  }

  // 5. Timesheet notifications
  if (entityType === 'TIMESHEET' || type.includes('TIMESHEET')) {
    if (type === 'TIMESHEET_SUBMITTED' || type === 'TIMESHEET_RESUBMITTED') {
      // Approver route
      return entityId
        ? `/approvals/timesheets/${encodeURIComponent(entityId)}`
        : '/approvals';
    }
    if (type === 'TIMESHEET_APPROVED' || type === 'TIMESHEET_REJECTED' || type === 'TIMESHEET_REMINDER') {
      // Employee timesheet detail route
      return entityId
        ? `/timesheets/${encodeURIComponent(entityId)}`
        : '/timesheets';
    }
    return entityId
      ? `/timesheets/${encodeURIComponent(entityId)}`
      : '/timesheets';
  }

  // 6. Employee & Team records
  if (entityType === 'EMPLOYEE' || type.startsWith('EMPLOYEE_')) {
    return '/employees';
  }

  if (entityType === 'TEAM' || type.startsWith('TEAM_')) {
    return '/teams';
  }

  if (entityType === 'ORGANIZATION' || type.startsWith('ORGANIZATION_')) {
    return '/organization';
  }

  // 7. Contextual safe fallbacks (avoid dumping everything to /dashboard)
  if (type.includes('TASK') || type.includes('PROJECT')) {
    return '/projects';
  }
  if (type.includes('TIME') || type.includes('HOUR')) {
    return '/timesheets';
  }
  if (type.includes('APPROVAL')) {
    return '/approvals';
  }

  return '/dashboard';
};
