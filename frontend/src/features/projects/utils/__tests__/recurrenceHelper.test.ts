import { describe, it, expect } from 'vitest';
import {
  computeNextOccurrencePreview,
  formatRecurrenceSummary,
  validateRecurrenceConfig,
  type RecurrenceConfigUI,
} from '../recurrenceHelper';

describe('Frontend Recurrence Helper', () => {
  describe('validateRecurrenceConfig', () => {
    it('returns error when interval is less than 1', () => {
      const config: RecurrenceConfigUI = {
        frequency: 'DAILY',
        interval: 0,
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      };
      expect(validateRecurrenceConfig(config)).toContain('Interval must be at least 1');
    });

    it('returns error when weekly has no weekdays selected', () => {
      const config: RecurrenceConfigUI = {
        frequency: 'WEEKLY',
        interval: 1,
        weekdays: [],
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      };
      expect(validateRecurrenceConfig(config)).toContain('at least one day of the week');
    });

    it('returns error when monthly day is invalid', () => {
      const config: RecurrenceConfigUI = {
        frequency: 'MONTHLY',
        interval: 1,
        dayOfMonth: 32,
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      };
      expect(validateRecurrenceConfig(config)).toContain('between 1 and 31');
    });

    it('returns error when ON_DATE end date is before schedule start', () => {
      const config: RecurrenceConfigUI = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-25',
        endType: 'ON_DATE',
        endDate: '2026-10-20',
      };
      expect(validateRecurrenceConfig(config)).toContain('earlier than schedule start date');
    });

    it('returns error when AFTER_COUNT occurrences is less than 1', () => {
      const config: RecurrenceConfigUI = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        endType: 'AFTER_COUNT',
        maxOccurrences: 0,
      };
      expect(validateRecurrenceConfig(config)).toContain('Occurrence count must be at least 1');
    });

    it('returns null for valid configuration', () => {
      const config: RecurrenceConfigUI = {
        frequency: 'WEEKLY',
        interval: 2,
        weekdays: [1, 3],
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      };
      expect(validateRecurrenceConfig(config)).toBeNull();
    });
  });

  describe('formatRecurrenceSummary', () => {
    it('formats daily recurrence', () => {
      expect(formatRecurrenceSummary({
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      })).toBe('Repeats daily');

      expect(formatRecurrenceSummary({
        frequency: 'DAILY',
        interval: 3,
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      })).toBe('Repeats every 3 days');
    });

    it('formats weekly recurrence with weekdays and end condition', () => {
      expect(formatRecurrenceSummary({
        frequency: 'WEEKLY',
        interval: 1,
        weekdays: [1, 5],
        scheduleStart: '2026-10-21',
        endType: 'AFTER_COUNT',
        maxOccurrences: 10,
      })).toBe('Repeats weekly on Mon, Fri, ending after 10 occurrences');
    });

    it('formats monthly recurrence with day of month and end date', () => {
      expect(formatRecurrenceSummary({
        frequency: 'MONTHLY',
        interval: 2,
        dayOfMonth: 15,
        scheduleStart: '2026-10-21',
        endType: 'ON_DATE',
        endDate: '2027-01-01',
      })).toBe('Repeats every 2 months on day 15 until 2027-01-01');
    });
  });

  describe('computeNextOccurrencePreview', () => {
    it('computes next daily occurrence from today', () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const preview = computeNextOccurrencePreview({
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        endType: 'NEVER',
      }, now);

      expect(preview).not.toBeNull();
      expect(preview?.getDate()).toBe(22);
    });

    it('returns null if next occurrence exceeds ON_DATE end date', () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const preview = computeNextOccurrencePreview({
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        endType: 'ON_DATE',
        endDate: '2026-10-21', // Ends today
      }, now);

      expect(preview).toBeNull();
    });
  });
});
