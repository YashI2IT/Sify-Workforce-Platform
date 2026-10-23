/**
 * Human-readable mapping and utility helpers for Audit Logs / Activity History
 */

export const ACTION_READABLE_MAP: Record<string, string> = {
  // Projects
  PROJECT_CREATED: 'Project created',
  PROJECT_UPDATED: 'Project updated',
  PROJECT_ACTIVATED: 'Project activated',
  PROJECT_DEACTIVATED: 'Project deactivated',
  PROJECT_DELETED: 'Project deleted',
  EMPLOYEE_ASSIGNED_TO_PROJECT: 'Assigned to project',
  EMPLOYEE_REMOVED_FROM_PROJECT: 'Removed from project',

  // Timesheets & Time Entries
  TIME_ENTRY_CREATED: 'Time entry created',
  TIME_ENTRY_UPDATED: 'Time entry updated',
  TIME_ENTRY_DELETED: 'Time entry deleted',
  TIMESHEET_SUBMITTED: 'Timesheet submitted',
  TIMESHEET_APPROVED: 'Timesheet approved',
  TIMESHEET_REJECTED: 'Timesheet rejected',
  SUBMISSION_CREATED: 'Submission created',
  SUBMISSION_APPROVED: 'Submission approved',
  SUBMISSION_REJECTED: 'Submission rejected',

  // Teams
  TEAM_CREATED: 'Team created',
  TEAM_UPDATED: 'Team updated',
  TEAM_MANAGER_ASSIGNED: 'Team manager assigned',
  TEAM_MANAGER_REMOVED: 'Team manager removed',

  // Employees & Onboarding
  EMPLOYEE_CREATED: 'Employee onboarded',
  EMPLOYEE_UPDATED: 'Employee updated',
  EMPLOYEE_ACTIVATED: 'Employee activated',
  EMPLOYEE_DEACTIVATED: 'Employee deactivated',

  // Invitations
  INVITATION_CREATED: 'Invitation sent',
  INVITATION_ACCEPTED: 'Invitation accepted',
  INVITATION_DECLINED: 'Invitation declined',
  INVITATION_REVOKED: 'Invitation revoked',
  INVITATION_RESENT: 'Invitation resent',

  // Organization & Settings
  ORGANIZATION_CREATED: 'Organization created',
  ORGANIZATION_UPDATED: 'Organization details updated',
  ORGANIZATION_SETTINGS_UPDATED: 'Organization settings updated',

  // Public Holidays & Work Calendars
  PUBLIC_HOLIDAY_CREATED: 'Public holiday added',
  PUBLIC_HOLIDAY_UPDATED: 'Public holiday updated',
  PUBLIC_HOLIDAY_DELETED: 'Public holiday deleted',
  WORKING_HOURS_UPDATED: 'Working hours updated',
};

/**
 * Translates technical audit event identifiers into readable plain-language labels
 */
export function formatAuditAction(action: string): string {
  if (!action) return 'Unknown action';
  if (ACTION_READABLE_MAP[action]) {
    return ACTION_READABLE_MAP[action];
  }
  return action
    .toLowerCase()
    .split('_')
    .map((word, idx) => (idx === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * Restrained semantic badge styling for event categories
 */
export function getActionBadgeStyle(action: string): string {
  const act = (action || '').toUpperCase();
  if (
    act.includes('CREATE') ||
    act.includes('ACTIVATE') ||
    act.includes('ACCEPT') ||
    act.includes('APPROVE')
  ) {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
  }
  if (
    act.includes('DELETE') ||
    act.includes('REMOVE') ||
    act.includes('DECLINE') ||
    act.includes('REJECT') ||
    act.includes('REVOKE') ||
    act.includes('DEACTIVATE')
  ) {
    return 'bg-rose-50 text-rose-800 border-rose-200/80';
  }
  if (
    act.includes('UPDATE') ||
    act.includes('EDIT') ||
    act.includes('MODIFY') ||
    act.includes('RESET')
  ) {
    return 'bg-blue-50 text-blue-800 border-blue-200/80';
  }
  if (
    act.includes('ASSIGN') ||
    act.includes('SUBMIT') ||
    act.includes('RESEND') ||
    act.includes('RESENT') ||
    act.includes('INVITE')
  ) {
    return 'bg-amber-50 text-amber-800 border-amber-200/80';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200/80';
}

/**
 * Formats timestamps according to organization timezone and configured date format
 */
export function formatConfiguredDateTime(
  dateInput: string | Date,
  timeZone?: string,
  dateFormat?: string,
): { dateStr: string; timeStr: string; full: string } {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return { dateStr: 'Invalid date', timeStr: '', full: 'Invalid date' };
    }

    const tz = timeZone || 'Asia/Kolkata';

    // Format parts using Intl.DateTimeFormat with target timeZone
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(d);
    let day = '01';
    let month = '01';
    let year = '1970';
    let hour = '00';
    let minute = '00';
    let second = '00';

    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'year') year = p.value;
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'second') second = p.value;
    }

    let dateStr = `${day}/${month}/${year}`;
    if (dateFormat === 'MM/DD/YYYY') {
      dateStr = `${month}/${day}/${year}`;
    } else if (dateFormat === 'YYYY-MM-DD') {
      dateStr = `${year}-${month}-${day}`;
    }

    const timeStr = `${hour}:${minute}:${second}`;
    const full = `${dateStr} ${timeStr}`;

    return { dateStr, timeStr, full };
  } catch {
    return {
      dateStr: String(dateInput),
      timeStr: '',
      full: String(dateInput),
    };
  }
}

export interface ParsedDiff {
  type: 'diff' | 'fields' | 'attributes' | 'empty';
  diffRows?: { field: string; from: string; to: string }[];
  fieldList?: string[];
  attributeRows?: { label: string; value: string }[];
  emptyMessage?: string;
}

export interface EntityLookupContext {
  getEmployeeName?: (id: string) => string | undefined;
  getProjectName?: (id: string) => string | undefined;
  getTeamName?: (id: string) => string | undefined;
}

/**
 * Extracts clean, non-fabricated diff information from event details payload.
 * Resolves human-readable names so users never see hard-to-remember raw UUIDs.
 */
export function parseEventChanges(
  details: any,
  lookupContext?: EntityLookupContext,
): ParsedDiff {
  if (!details || (typeof details === 'object' && Object.keys(details).length === 0)) {
    return {
      type: 'empty',
      emptyMessage: 'No additional change details were recorded for this event.',
    };
  }

  // 1. Direct before-and-after changes object
  if (details.changes && typeof details.changes === 'object') {
    const diffRows: { field: string; from: string; to: string }[] = [];
    for (const [key, val] of Object.entries(details.changes)) {
      if (val && typeof val === 'object' && ('from' in val || 'to' in val)) {
        const fieldLabel = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .toLowerCase()
          .trim();
        const readableField = fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1);
        diffRows.push({
          field: readableField,
          from: String((val as any).from ?? 'None'),
          to: String((val as any).to ?? 'None'),
        });
      }
    }
    if (diffRows.length > 0) {
      return { type: 'diff', diffRows };
    }
  }

  // 2. Updated field names list
  if (Array.isArray(details.updatedFields) && details.updatedFields.length > 0) {
    const fieldList = details.updatedFields.map((f: string) => {
      const field = f.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim();
      return field.charAt(0).toUpperCase() + field.slice(1);
    });
    return { type: 'fields', fieldList };
  }

  // 3. Known single-action attributes (never invent fake "from" values)
  const attributeRows: { label: string; value: string }[] = [];

  if (details.invitedEmail) {
    attributeRows.push({ label: 'Invited Email', value: details.invitedEmail });
    if (details.role) attributeRows.push({ label: 'Assigned Role', value: details.role });
    if (details.teamName) {
      attributeRows.push({ label: 'Target Team', value: details.teamName });
    } else if (details.teamId) {
      const teamName = lookupContext?.getTeamName?.(details.teamId);
      attributeRows.push({ label: 'Target Team', value: teamName || 'Assigned Team' });
    }
  }

  if (details.hours !== undefined) {
    attributeRows.push({ label: 'Logged Hours', value: `${details.hours} hrs` });
  }
  if (details.date) {
    attributeRows.push({ label: 'Entry Date', value: details.date });
  }
  if (details.timesheetName || details.timesheetId) {
    attributeRows.push({ label: 'Timesheet', value: details.timesheetName || 'Weekly Timesheet' });
  }
  if (details.weekStart) {
    attributeRows.push({ label: 'Week Starting', value: details.weekStart });
  }
  if (details.weekEnd) {
    attributeRows.push({ label: 'Week Ending', value: details.weekEnd });
  }
  if (details.totalHours !== undefined) {
    attributeRows.push({ label: 'Total Hours', value: `${details.totalHours} hrs` });
  }
  if (details.comment) {
    attributeRows.push({ label: 'Reviewer Comment', value: details.comment });
  }
  if (details.reason) {
    attributeRows.push({ label: 'Rejection Reason', value: details.reason });
  }

  // Assigned Employee: ALWAYS display the human-readable Name, NEVER raw UUID or "Assigned Employee ID"
  if (details.assignedEmployeeName || details.assignedEmployeeId) {
    const employeeName =
      details.assignedEmployeeName ||
      (details.assignedEmployeeId ? lookupContext?.getEmployeeName?.(details.assignedEmployeeId) : undefined) ||
      details.employeeName;
    attributeRows.push({
      label: 'Assigned Employee',
      value: employeeName || 'Assigned Member',
    });
  }

  // Removed Employee: ALWAYS display the human-readable Name
  if (details.removedEmployeeName || details.removedEmployeeId) {
    const employeeName =
      details.removedEmployeeName ||
      (details.removedEmployeeId ? lookupContext?.getEmployeeName?.(details.removedEmployeeId) : undefined) ||
      details.employeeName;
    attributeRows.push({
      label: 'Removed Employee',
      value: employeeName || 'Removed Member',
    });
  }

  // Standalone Employee Name
  if (
    (details.employeeName || details.employeeId) &&
    !details.assignedEmployeeName &&
    !details.assignedEmployeeId &&
    !details.removedEmployeeName &&
    !details.removedEmployeeId
  ) {
    const employeeName =
      details.employeeName ||
      (details.employeeId ? lookupContext?.getEmployeeName?.(details.employeeId) : undefined);
    attributeRows.push({
      label: 'Employee',
      value: employeeName || 'Team Member',
    });
  }

  // Project Name
  if (details.projectName || (details.projectId && !details.name)) {
    const projectName =
      details.projectName ||
      (details.projectId ? lookupContext?.getProjectName?.(details.projectId) : undefined);
    attributeRows.push({
      label: 'Project',
      value: projectName || 'Project',
    });
  }

  // Team Name
  if (details.teamName && !details.invitedEmail) {
    attributeRows.push({ label: 'Team', value: details.teamName });
  }

  if (details.name && !details.projectName && !details.employeeName) {
    attributeRows.push({ label: 'Resource Name', value: details.name });
  }

  if (attributeRows.length > 0) {
    return { type: 'attributes', attributeRows };
  }

  // 4. Any other non-empty object: present as attribute pairs
  const genericRows: { label: string; value: string }[] = [];
  const handledKeys = new Set([
    'updatedFields',
    'changes',
    'assignedEmployeeId',
    'assignedEmployeeName',
    'removedEmployeeId',
    'removedEmployeeName',
    'employeeId',
    'employeeName',
    'projectId',
    'projectName',
    'teamId',
    'teamName',
    'managerId',
    'managerName',
    'timesheetId',
    'timesheetName',
    'invitedEmail',
    'role',
    'hours',
    'date',
    'weekStart',
    'weekEnd',
    'totalHours',
    'comment',
    'reason',
    'name',
  ]);

  for (const [k, v] of Object.entries(details)) {
    if (handledKeys.has(k)) continue;

    const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);

    // If value matches an entity ID, attempt name lookup
    const resolvedName =
      lookupContext?.getEmployeeName?.(valStr) ||
      lookupContext?.getProjectName?.(valStr) ||
      lookupContext?.getTeamName?.(valStr);

    const rawLabel = k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase().trim();
    const cleanLabel = rawLabel.replace(/\bid\b/i, '').trim();
    const displayLabel = (cleanLabel || rawLabel).charAt(0).toUpperCase() + (cleanLabel || rawLabel).slice(1);

    genericRows.push({
      label: displayLabel,
      value: resolvedName || valStr,
    });
  }

  if (genericRows.length > 0) {
    return { type: 'attributes', attributeRows: genericRows };
  }

  return {
    type: 'empty',
    emptyMessage: 'No additional change details were recorded for this event.',
  };
}
