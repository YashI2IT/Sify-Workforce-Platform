import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { db } from '../prisma/db.js';
import { TimesheetSubmissionsService } from './timesheet-submissions.service.js';
import { getUtcMonday } from '../common/date.utils.js';

@Injectable()
export class TimesheetReminderScheduler {
  constructor(private readonly submissionsService: TimesheetSubmissionsService) {}

  /**
   * Runs every Monday at 09:00 UTC — reminds employees who have unsubmitted
   * time entries from the PREVIOUS week.
   */
  @Cron('0 9 * * MON', { name: 'weekly-timesheet-reminder', timeZone: 'UTC' })
  async sendWeeklyReminders() {
    // Previous week's Monday
    const now = new Date();
    const lastMonday = getUtcMonday(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastSunday.getUTCDate() + 6);

    const weekStart = lastMonday.toISOString().split('T')[0];
    const weekEnd = lastSunday.toISOString().split('T')[0];

    console.log(`[TimesheetReminder] Sending reminders for week ${weekStart} – ${weekEnd}`);

    try {
      await this.submissionsService.sendWeeklyReminders(weekStart, weekEnd);
    } catch (err) {
      console.error('[TimesheetReminder] Failed to send reminders:', err);
    }
  }
}
