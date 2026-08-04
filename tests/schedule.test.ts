import { describe, expect, it } from 'vitest';
import { DAILY_CRON, getScheduledJob, WEEKLY_CRON } from '../src/worker/cron/schedule';

describe('scheduled job routing', () => {
  it('routes the daily trigger only to daily reminders', () => {
    expect(getScheduledJob(DAILY_CRON)).toBe('daily-reminders');
  });

  it('routes the weekly trigger only to the weekly summary', () => {
    expect(getScheduledJob(WEEKLY_CRON)).toBe('weekly-summary');
  });

  it('ignores an unknown trigger instead of sending notifications', () => {
    expect(getScheduledJob('30 0 * * *')).toBeNull();
  });
});
