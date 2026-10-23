export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type RecurrenceEndType = 'NEVER' | 'ON_DATE' | 'AFTER_COUNT';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 1 day, every 2 weeks
  weekdays?: number[]; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  dayOfMonth?: number; // 1 to 31
  scheduleStart: string; // YYYY-MM-DD
  nextScheduledAt: string; // ISO 8601 string
  endType: RecurrenceEndType;
  endDate?: string | null; // YYYY-MM-DD or ISO
  maxOccurrences?: number | null; // e.g. 10
  occurrenceIndex: number; // 1-indexed (root task = 1)
  seriesId?: string; // root task ID
  timezone: string; // e.g. 'Asia/Kolkata'
  lastGeneratedAt?: string | null;
}
