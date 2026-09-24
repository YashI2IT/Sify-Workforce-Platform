/**
 * Common Date Utilities
 * 
 * Shared UTC date functions to ensure zero timezone drift across
 * timesheet boundaries, time-entry validation, and report trends.
 */

export function getUtcMonday(d: any): Date {
  let year: number;
  let month: number;
  let dayOfMonth: number;

  const str = d?.toString ? d.toString() : String(d);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10) - 1;
    dayOfMonth = parseInt(match[3], 10);
  } else {
    const dt = new Date(d);
    year = dt.getUTCFullYear();
    month = dt.getUTCMonth();
    dayOfMonth = dt.getUTCDate();
  }

  const utcDate = new Date(Date.UTC(year, month, dayOfMonth));
  const dayOfWeek = utcDate.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  return new Date(Date.UTC(year, month, dayOfMonth + diff, 0, 0, 0, 0));
}

export function formatUtcMondayDateString(d: any): string {
  const monday = getUtcMonday(d);
  return monday.toISOString().split('T')[0];
}
