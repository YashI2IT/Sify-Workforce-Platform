import { describe, it, expect } from 'vitest';
import {
  formatAuditAction,
  getActionBadgeStyle,
  formatConfiguredDateTime,
  parseEventChanges,
} from '../auditLogUtils';

describe('auditLogUtils', () => {
  describe('formatAuditAction', () => {
    it('translates technical enum names to plain-language labels', () => {
      expect(formatAuditAction('PROJECT_CREATED')).toBe('Project created');
      expect(formatAuditAction('PROJECT_UPDATED')).toBe('Project updated');
      expect(formatAuditAction('PROJECT_ACTIVATED')).toBe('Project activated');
      expect(formatAuditAction('PROJECT_DEACTIVATED')).toBe('Project deactivated');
      expect(formatAuditAction('PROJECT_DELETED')).toBe('Project deleted');
      expect(formatAuditAction('TIME_ENTRY_CREATED')).toBe('Time entry created');
      expect(formatAuditAction('TIMESHEET_APPROVED')).toBe('Timesheet approved');
      expect(formatAuditAction('SUBMISSION_REJECTED')).toBe('Submission rejected');
      expect(formatAuditAction('EMPLOYEE_ASSIGNED_TO_PROJECT')).toBe('Assigned to project');
      expect(formatAuditAction('ORGANIZATION_SETTINGS_UPDATED')).toBe('Organization settings updated');
    });

    it('falls back gracefully for unknown event codes', () => {
      expect(formatAuditAction('CUSTOM_AUDIT_ACTION')).toBe('Custom audit action');
      expect(formatAuditAction('')).toBe('Unknown action');
    });
  });

  describe('getActionBadgeStyle', () => {
    it('applies semantic color themes', () => {
      expect(getActionBadgeStyle('PROJECT_CREATED')).toContain('bg-emerald-50');
      expect(getActionBadgeStyle('TIMESHEET_APPROVED')).toContain('bg-emerald-50');
      expect(getActionBadgeStyle('PROJECT_DELETED')).toContain('bg-rose-50');
      expect(getActionBadgeStyle('TIMESHEET_REJECTED')).toContain('bg-rose-50');
      expect(getActionBadgeStyle('PROJECT_UPDATED')).toContain('bg-blue-50');
      expect(getActionBadgeStyle('INVITATION_RESENT')).toContain('bg-amber-50');
      expect(getActionBadgeStyle('EMPLOYEE_ASSIGNED_TO_PROJECT')).toContain('bg-amber-50');
    });
  });

  describe('formatConfiguredDateTime', () => {
    it('formats date and time using configured timezone and format', () => {
      const iso = '2026-10-22T10:30:45.000Z';
      const formatted = formatConfiguredDateTime(iso, 'UTC', 'DD/MM/YYYY');
      expect(formatted.dateStr).toBe('22/10/2026');
      expect(formatted.timeStr).toBe('10:30:45');
      expect(formatted.full).toBe('22/10/2026 10:30:45');
    });

    it('supports MM/DD/YYYY format', () => {
      const iso = '2026-10-22T10:30:45.000Z';
      const formatted = formatConfiguredDateTime(iso, 'UTC', 'MM/DD/YYYY');
      expect(formatted.dateStr).toBe('10/22/2026');
    });

    it('supports YYYY-MM-DD format', () => {
      const iso = '2026-10-22T10:30:45.000Z';
      const formatted = formatConfiguredDateTime(iso, 'UTC', 'YYYY-MM-DD');
      expect(formatted.dateStr).toBe('2026-10-22');
    });
  });

  describe('parseEventChanges', () => {
    it('returns empty type when details is null or empty object', () => {
      expect(parseEventChanges(null)).toEqual({
        type: 'empty',
        emptyMessage: 'No additional change details were recorded for this event.',
      });
      expect(parseEventChanges({})).toEqual({
        type: 'empty',
        emptyMessage: 'No additional change details were recorded for this event.',
      });
    });

    it('extracts before-and-after rows when changes mapping exists', () => {
      const details = {
        changes: {
          status: { from: 'ACTIVE', to: 'INACTIVE' },
          name: { from: 'Portal Alpha', to: 'Portal Beta' },
        },
      };
      const parsed = parseEventChanges(details);
      expect(parsed.type).toBe('diff');
      expect(parsed.diffRows).toHaveLength(2);
      expect(parsed.diffRows![0]).toEqual({
        field: 'Status',
        from: 'ACTIVE',
        to: 'INACTIVE',
      });
    });

    it('extracts field names list without inventing values when updatedFields is present', () => {
      const details = { updatedFields: ['status', 'budget', 'billingType'] };
      const parsed = parseEventChanges(details);
      expect(parsed.type).toBe('fields');
      expect(parsed.fieldList).toEqual(['Status', 'Budget', 'Billing type']);
    });

    it('extracts specific attributes for invitations, time entries, etc.', () => {
      const details = { invitedEmail: 'arjun@sify.com', role: 'EMPLOYEE' };
      const parsed = parseEventChanges(details);
      expect(parsed.type).toBe('attributes');
      expect(parsed.attributeRows).toEqual([
        { label: 'Invited Email', value: 'arjun@sify.com' },
        { label: 'Assigned Role', value: 'EMPLOYEE' },
      ]);
    });

    it('formats Assigned Employee with human-readable name instead of raw UUID', () => {
      // 1. Direct assignedEmployeeName from enriched backend
      const detailsWithName = {
        assignedEmployeeId: '5eebe186-4bf9-4143-add0-965e658381c0',
        assignedEmployeeName: 'Yash Borade',
      };
      const parsedDirect = parseEventChanges(detailsWithName);
      expect(parsedDirect.type).toBe('attributes');
      expect(parsedDirect.attributeRows).toEqual([
        { label: 'Assigned Employee', value: 'Yash Borade' },
      ]);

      // 2. Dynamic lookupContext resolution from employee directory
      const detailsWithIdOnly = {
        assignedEmployeeId: '5eebe186-4bf9-4143-add0-965e658381c0',
      };
      const lookupContext = {
        getEmployeeName: (id: string) =>
          id === '5eebe186-4bf9-4143-add0-965e658381c0' ? 'Yash Borade' : undefined,
      };
      const parsedLookup = parseEventChanges(detailsWithIdOnly, lookupContext);
      expect(parsedLookup.type).toBe('attributes');
      expect(parsedLookup.attributeRows).toEqual([
        { label: 'Assigned Employee', value: 'Yash Borade' },
      ]);
    });

    it('formats Removed Employee with human-readable name instead of raw UUID', () => {
      const details = {
        removedEmployeeId: 'emp-99',
        removedEmployeeName: 'Priya Sharma',
      };
      const parsed = parseEventChanges(details);
      expect(parsed.type).toBe('attributes');
      expect(parsed.attributeRows).toEqual([
        { label: 'Removed Employee', value: 'Priya Sharma' },
      ]);
    });
  });
});

