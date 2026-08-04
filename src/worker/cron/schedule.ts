export const DAILY_CRON = '0 0 * * *';
export const WEEKLY_CRON = '0 0 * * MON';

export type ScheduledJob = 'daily-reminders' | 'weekly-summary';

export function getScheduledJob(cron: string): ScheduledJob | null {
  if (cron === DAILY_CRON) return 'daily-reminders';
  if (cron === WEEKLY_CRON) return 'weekly-summary';
  return null;
}
