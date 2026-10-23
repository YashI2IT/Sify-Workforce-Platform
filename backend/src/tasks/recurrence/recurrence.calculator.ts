import { RecurrenceConfig } from './recurrence.types.js';

export interface NextOccurrenceResult {
  nextDate: Date | null;
  isFinished: boolean;
}

/**
 * Computes the next scheduled occurrence date for a given recurring task configuration.
 *
 * @param config The recurrence configuration
 * @param fromDate The reference date from which to compute the next occurrence (defaults to current nextScheduledAt or now)
 * @returns {NextOccurrenceResult} The next scheduled occurrence Date or null if recurrence has completed
 */
export function computeNextOccurrence(
  config: RecurrenceConfig,
  fromDate?: Date
): NextOccurrenceResult {
  // Check occurrence count limit
  if (
    config.endType === 'AFTER_COUNT' &&
    config.maxOccurrences &&
    config.occurrenceIndex >= config.maxOccurrences
  ) {
    return { nextDate: null, isFinished: true };
  }

  const baseDate = fromDate
    ? new Date(fromDate)
    : config.nextScheduledAt
      ? new Date(config.nextScheduledAt)
      : new Date();

  if (isNaN(baseDate.getTime())) {
    return { nextDate: null, isFinished: true };
  }

  const interval = Math.max(1, config.interval || 1);
  let next = new Date(baseDate.getTime());

  switch (config.frequency) {
    case 'DAILY': {
      next.setDate(next.getDate() + interval);
      break;
    }

    case 'WEEKLY': {
      const weekdays = Array.isArray(config.weekdays) && config.weekdays.length > 0
        ? [...new Set(config.weekdays)].sort((a, b) => a - b)
        : [baseDate.getDay()];

      const currentDay = baseDate.getDay();
      // Look for a day later in the same week
      const laterDay = weekdays.find(d => d > currentDay);

      if (laterDay !== undefined) {
        // Next occurrence is later in the same week
        const diff = laterDay - currentDay;
        next.setDate(next.getDate() + diff);
      } else {
        // Next occurrence is in a subsequent week
        const firstDayOfWeek = weekdays[0];
        const daysToNextWeek = 7 - currentDay + firstDayOfWeek;
        const additionalWeeks = (interval - 1) * 7;
        next.setDate(next.getDate() + daysToNextWeek + additionalWeeks);
      }
      break;
    }

    case 'MONTHLY': {
      const targetDay = config.dayOfMonth || baseDate.getDate();
      const currentYear = next.getFullYear();
      const currentMonth = next.getMonth();
      const targetMonth = currentMonth + interval;

      // Find max days in the target month
      const daysInTargetMonth = new Date(currentYear, targetMonth + 1, 0).getDate();
      const finalDay = Math.min(targetDay, daysInTargetMonth);

      next = new Date(currentYear, targetMonth, finalDay, next.getHours(), next.getMinutes(), next.getSeconds(), next.getMilliseconds());
      break;
    }

    default:
      return { nextDate: null, isFinished: true };
  }

  // Check end date limit
  if (config.endType === 'ON_DATE' && config.endDate) {
    const end = new Date(config.endDate);
    // End date is inclusive up to the end of that day (23:59:59.999)
    end.setHours(23, 59, 59, 999);
    if (next.getTime() > end.getTime()) {
      return { nextDate: null, isFinished: true };
    }
  }

  return { nextDate: next, isFinished: false };
}

/**
 * Calculates initial scheduled occurrence date when creating a recurring task.
 * If scheduleStart is in the future, uses scheduleStart.
 * If scheduleStart is today or in the past, finds the immediate valid occurrence.
 */
export function computeInitialSchedule(
  config: Omit<RecurrenceConfig, 'nextScheduledAt' | 'occurrenceIndex'>,
  now = new Date()
): Date {
  const start = new Date(config.scheduleStart || now);
  if (isNaN(start.getTime())) return new Date();

  // If start is in the future, that is the first scheduled occurrence
  if (start.getTime() > now.getTime()) {
    return start;
  }

  // If today or past, compute the next occurrence from start
  const tempConfig: RecurrenceConfig = {
    ...config,
    occurrenceIndex: 1,
    nextScheduledAt: start.toISOString(),
  };

  const result = computeNextOccurrence(tempConfig, start);
  return result.nextDate || start;
}
