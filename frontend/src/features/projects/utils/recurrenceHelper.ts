export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type RecurrenceEndType = 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';

export interface RecurrenceConfigUI {
  frequency: RecurrenceFrequency;
  interval: number;
  weekdays?: number[];
  dayOfMonth?: number;
  scheduleStart: string;
  nextScheduledAt?: string;
  endType: RecurrenceEndType;
  endDate?: string | null;
  maxOccurrences?: number | null;
  timezone?: string;
}

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const FULL_WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface EnrichedRecurrenceConfig extends RecurrenceConfigUI {
  occurrenceIndex?: number;
  seriesId?: string;
  lastGeneratedAt?: string;
  nextScheduledAt?: string;
}

export function extractRecurrenceConfig(task: any): EnrichedRecurrenceConfig | null {
  if (!task) return null;
  const cfg = task.metadata?.recurrenceConfig;
  if (cfg && cfg.frequency) {
    return {
      frequency: cfg.frequency,
      interval: Number(cfg.interval) || 1,
      weekdays: Array.isArray(cfg.weekdays) ? cfg.weekdays : undefined,
      dayOfMonth: cfg.dayOfMonth || cfg.monthDay,
      scheduleStart: cfg.scheduleStart || (task.startDate ? String(task.startDate).split('T')[0] : ''),
      nextScheduledAt: cfg.nextScheduledAt,
      endType: cfg.endType || 'NEVER',
      endDate: cfg.endDate,
      maxOccurrences: cfg.maxOccurrences || cfg.endCount,
      timezone: cfg.timezone || 'Asia/Kolkata',
      occurrenceIndex: cfg.occurrenceIndex || 1,
      seriesId: cfg.seriesId,
      lastGeneratedAt: cfg.lastGeneratedAt,
    };
  }
  if (task.recurrence) {
    return {
      frequency: task.recurrence,
      interval: 1,
      scheduleStart: task.startDate ? String(task.startDate).split('T')[0] : '',
      endType: 'NEVER',
      nextScheduledAt: task.startDate || undefined,
      occurrenceIndex: 1,
      timezone: 'Asia/Kolkata',
    };
  }
  return null;
}

export function formatDateIST(dateVal: any, includeTime = true): string {
  if (!dateVal) return 'Not scheduled';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
    };
    return new Intl.DateTimeFormat('en-IN', options).format(d);
  } catch {
    return String(dateVal);
  }
}

export function formatFrequencyLabel(frequency: RecurrenceFrequency, interval: number): string {
  const intVal = Math.max(1, interval || 1);
  if (frequency === 'DAILY') {
    return intVal === 1 ? 'Daily' : `Every ${intVal} days`;
  }
  if (frequency === 'WEEKLY') {
    return intVal === 1 ? 'Weekly' : `Every ${intVal} weeks`;
  }
  if (frequency === 'MONTHLY') {
    return intVal === 1 ? 'Monthly' : `Every ${intVal} months`;
  }
  return frequency;
}

export function computeNextOccurrencePreview(
  config: RecurrenceConfigUI,
  now = new Date()
): Date | null {
  const start = new Date(config.scheduleStart || now);
  if (isNaN(start.getTime())) return null;

  const interval = Math.max(1, config.interval || 1);
  let next = new Date(start.getTime());

  // If start is in future, that is the first occurrence
  if (next.getTime() > now.getTime()) {
    // If weekly and start day doesn't match selected weekdays, adjust to first valid weekday
    if (config.frequency === 'WEEKLY' && config.weekdays && config.weekdays.length > 0) {
      const weekdays = [...new Set(config.weekdays)].sort((a, b) => a - b);
      if (!weekdays.includes(next.getDay())) {
        const nextDay = weekdays.find(d => d >= next.getDay());
        if (nextDay !== undefined) {
          next.setDate(next.getDate() + (nextDay - next.getDay()));
        } else {
          next.setDate(next.getDate() + (7 - next.getDay() + weekdays[0]));
        }
      }
    }
  } else {
    // Start is past or today: calculate first future occurrence
    switch (config.frequency) {
      case 'DAILY': {
        const diffMs = now.getTime() - start.getTime();
        const daysPassed = Math.max(0, Math.floor(diffMs / (86400000 * interval)));
        next.setDate(start.getDate() + (daysPassed + 1) * interval);
        break;
      }
      case 'WEEKLY': {
        const weekdays = Array.isArray(config.weekdays) && config.weekdays.length > 0
          ? [...new Set(config.weekdays)].sort((a, b) => a - b)
          : [now.getDay()];

        const currentDay = now.getDay();
        const laterDay = weekdays.find(d => d > currentDay);

        if (laterDay !== undefined) {
          next = new Date(now.getTime());
          next.setDate(now.getDate() + (laterDay - currentDay));
        } else {
          next = new Date(now.getTime());
          const firstDay = weekdays[0];
          const daysToNext = 7 - currentDay + firstDay + (interval - 1) * 7;
          next.setDate(now.getDate() + daysToNext);
        }
        break;
      }
      case 'MONTHLY': {
        const targetDay = config.dayOfMonth || start.getDate();
        let targetMonth = now.getMonth();
        let targetYear = now.getFullYear();

        if (now.getDate() >= targetDay) {
          targetMonth += interval;
        }

        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const finalDay = Math.min(targetDay, daysInMonth);
        next = new Date(targetYear, targetMonth, finalDay, start.getHours(), start.getMinutes());
        break;
      }
    }
  }

  // Validate end conditions
  if (config.endType === 'ON_DATE' && config.endDate) {
    const end = new Date(config.endDate);
    end.setHours(23, 59, 59, 999);
    if (next.getTime() > end.getTime()) {
      return null;
    }
  }

  return next;
}

export function formatRecurrenceSummary(config: RecurrenceConfigUI): string {
  const interval = Math.max(1, config.interval || 1);
  let summary = '';

  if (config.frequency === 'DAILY') {
    summary = interval === 1 ? 'Repeats daily' : `Repeats every ${interval} days`;
  } else if (config.frequency === 'WEEKLY') {
    const days = (config.weekdays || [1]).map(d => WEEKDAY_NAMES[d]).join(', ');
    summary = interval === 1 
      ? `Repeats weekly on ${days}` 
      : `Repeats every ${interval} weeks on ${days}`;
  } else if (config.frequency === 'MONTHLY') {
    const day = config.dayOfMonth || 1;
    summary = interval === 1 
      ? `Repeats monthly on day ${day}` 
      : `Repeats every ${interval} months on day ${day}`;
  }

  if (config.endType === 'ON_DATE' && config.endDate) {
    summary += ` until ${config.endDate}`;
  } else if (config.endType === 'AFTER_COUNT' && config.maxOccurrences) {
    summary += `, ending after ${config.maxOccurrences} occurrences`;
  }

  return summary;
}

export function validateRecurrenceConfig(config: RecurrenceConfigUI): string | null {
  if (!config.frequency) return 'Please select a recurrence frequency';
  if (config.interval < 1) return 'Interval must be at least 1';
  if (config.frequency === 'WEEKLY' && (!config.weekdays || config.weekdays.length === 0)) {
    return 'Please select at least one day of the week';
  }
  if (config.frequency === 'MONTHLY' && (!config.dayOfMonth || config.dayOfMonth < 1 || config.dayOfMonth > 31)) {
    return 'Day of month must be between 1 and 31';
  }
  if (!config.scheduleStart) {
    return 'Schedule start date is required';
  }
  if (config.endType === 'ON_DATE') {
    if (!config.endDate) return 'Please specify an end date';
    if (new Date(config.endDate) < new Date(config.scheduleStart)) {
      return 'End date cannot be earlier than schedule start date';
    }
  }
  if (config.endType === 'AFTER_COUNT') {
    if (!config.maxOccurrences || config.maxOccurrences < 1) {
      return 'Occurrence count must be at least 1';
    }
  }
  return null;
}
