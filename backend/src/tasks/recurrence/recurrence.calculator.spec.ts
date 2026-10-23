import { describe, it, expect } from 'vitest';
import { computeNextOccurrence } from './recurrence.calculator.js';
import { RecurrenceConfig } from './recurrence.types.js';

describe('Recurrence Calculator', () => {
  describe('DAILY recurrence', () => {
    it('calculates next day for daily interval 1', () => {
      const config: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        nextScheduledAt: '2026-10-21T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-10-22T09:00:00.000Z');
    });

    it('calculates next occurrence for custom interval (e.g. every 3 days)', () => {
      const config: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 3,
        scheduleStart: '2026-10-21',
        nextScheduledAt: '2026-10-21T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-10-24T09:00:00.000Z');
    });
  });

  describe('WEEKLY recurrence', () => {
    it('advances to next selected weekday in same week', () => {
      // 2026-10-19 is a Monday (1)
      const config: RecurrenceConfig = {
        frequency: 'WEEKLY',
        interval: 1,
        weekdays: [1, 3, 5], // Mon, Wed, Fri
        scheduleStart: '2026-10-19',
        nextScheduledAt: '2026-10-19T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      // From Monday (1), next should be Wednesday (3) -> Oct 21
      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-10-21T09:00:00.000Z');
    });

    it('wraps around to first selected weekday of next week', () => {
      // 2026-10-23 is a Friday (5)
      const config: RecurrenceConfig = {
        frequency: 'WEEKLY',
        interval: 1,
        weekdays: [1, 3, 5], // Mon, Wed, Fri
        scheduleStart: '2026-10-19',
        nextScheduledAt: '2026-10-23T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 3,
        timezone: 'Asia/Kolkata',
      };

      // From Friday (5), next should wrap to next Monday (1) -> Oct 26
      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-10-26T09:00:00.000Z');
    });

    it('handles bi-weekly interval (every 2 weeks)', () => {
      // Friday 2026-10-23 with interval 2
      const config: RecurrenceConfig = {
        frequency: 'WEEKLY',
        interval: 2,
        weekdays: [1], // Only Monday
        scheduleStart: '2026-10-19',
        nextScheduledAt: '2026-10-19T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      // Mon Oct 19 + 2 weeks -> Mon Nov 02
      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-11-02T09:00:00.000Z');
    });
  });

  describe('MONTHLY recurrence', () => {
    it('advances by interval months on the same day of month', () => {
      const config: RecurrenceConfig = {
        frequency: 'MONTHLY',
        interval: 1,
        dayOfMonth: 15,
        scheduleStart: '2026-10-15',
        nextScheduledAt: '2026-10-15T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-11-15T09:00:00.000Z');
    });

    it('clamps to last day of shorter month (e.g. Jan 31 -> Feb 28)', () => {
      const config: RecurrenceConfig = {
        frequency: 'MONTHLY',
        interval: 1,
        dayOfMonth: 31,
        scheduleStart: '2026-01-31',
        nextScheduledAt: '2026-01-31T09:00:00.000Z',
        endType: 'NEVER',
        occurrenceIndex: 1,
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      // 2026 is not a leap year, February has 28 days
      expect(result.nextDate?.toISOString()).toBe('2026-02-28T09:00:00.000Z');
    });
  });

  describe('End Conditions', () => {
    it('stops recurrence when maxOccurrences is reached (AFTER_COUNT)', () => {
      const config: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        nextScheduledAt: '2026-10-21T09:00:00.000Z',
        endType: 'AFTER_COUNT',
        maxOccurrences: 3,
        occurrenceIndex: 3, // Already at 3 of 3
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(true);
      expect(result.nextDate).toBeNull();
    });

    it('stops recurrence when next date exceeds endDate (ON_DATE)', () => {
      const config: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        nextScheduledAt: '2026-10-25T09:00:00.000Z',
        endType: 'ON_DATE',
        endDate: '2026-10-25', // Next would be Oct 26 which exceeds endDate
        occurrenceIndex: 5,
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(true);
      expect(result.nextDate).toBeNull();
    });

    it('continues when next date is within endDate (ON_DATE)', () => {
      const config: RecurrenceConfig = {
        frequency: 'DAILY',
        interval: 1,
        scheduleStart: '2026-10-21',
        nextScheduledAt: '2026-10-24T09:00:00.000Z',
        endType: 'ON_DATE',
        endDate: '2026-10-25', // Next is Oct 25, which is <= Oct 25
        occurrenceIndex: 4,
        timezone: 'Asia/Kolkata',
      };

      const result = computeNextOccurrence(config);
      expect(result.isFinished).toBe(false);
      expect(result.nextDate?.toISOString()).toBe('2026-10-25T09:00:00.000Z');
    });
  });
});
