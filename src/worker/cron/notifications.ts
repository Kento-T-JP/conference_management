import { daysUntil } from '../../shared/date';
import type { Env } from '../index';
import { reminderMessage, sendSlack, weeklySummaryMessage } from '../services/slack';

interface ReminderRow extends Record<string, unknown> {
  id: number;
  conference_edition_id: number;
  deadline_at: string;
  deadline_type: string;
  has_time: number;
  is_aoe: number;
  timezone: string | null;
  year: number;
  acronym: string;
}

export async function runDailyReminders(env: Env, now = new Date()): Promise<void> {
  const setting = await env.DB.prepare("SELECT value FROM system_settings WHERE key='reminder_days'").first<{ value: string }>();
  const reminderDays: number[] = setting ? JSON.parse(setting.value) : [14, 7, 1];
  const rows = await env.DB.prepare(`SELECT d.*, e.year, c.acronym FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id WHERE d.notification_enabled=1 AND e.is_archived=0 AND c.is_archived=0 AND d.deadline_at >= datetime('now','-1 day') AND d.deadline_at <= datetime('now','+15 days')`).all<ReminderRow>();
  for (const row of rows.results) {
    const days = daysUntil(row.deadline_at, now, Boolean(row.is_aoe), Boolean(row.has_time), row.timezone);
    if (!reminderDays.includes(days)) continue;
    await sendSlack(env, { type: `deadline_reminder_${days}`, editionId: row.conference_edition_id, deadlineId: row.id, scheduledDate: now.toISOString().slice(0, 10), text: reminderMessage(row, days, env.APP_BASE_URL) });
  }
}

export async function runWeeklySummary(env: Env, now = new Date()): Promise<void> {
  const enabled = await env.DB.prepare("SELECT value FROM system_settings WHERE key='weekly_enabled'").first<{ value: string }>();
  if (enabled?.value === 'false') return;
  const [deadlines, recent] = await env.DB.batch([
    env.DB.prepare(`SELECT d.deadline_at, d.deadline_type, d.title, d.has_time, d.timezone, d.is_aoe, e.id edition_id, e.year, c.acronym FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id WHERE d.notification_enabled=1 AND e.is_archived=0 AND c.is_archived=0 AND d.deadline_at >= datetime('now') AND d.deadline_at < datetime('now','+90 days') ORDER BY d.deadline_at LIMIT 20`),
    env.DB.prepare(`SELECT e.id, e.year, c.acronym FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.created_at >= datetime('now','-7 days') ORDER BY e.created_at DESC LIMIT 10`)
  ]);
  if (!deadlines.results.length && !recent.results.length) return;
  await sendSlack(env, { type: 'weekly_summary', editionId: null, deadlineId: null, scheduledDate: now.toISOString().slice(0, 10), text: weeklySummaryMessage(deadlines.results as Record<string, unknown>[], recent.results as Record<string, unknown>[], env.APP_BASE_URL) });
}
