import { daysUntil } from '../../shared/date';
import type { Env } from '../index';
import { sendSlack } from '../services/slack';

interface ReminderRow extends Record<string, unknown> {
  id: number;
  conference_edition_id: number;
  deadline_at: string;
  deadline_type: string;
  has_time: number;
  is_aoe: number;
  year: number;
  acronym: string;
}

export async function runDailyReminders(env: Env, now = new Date()): Promise<void> {
  const setting = await env.DB.prepare("SELECT value FROM system_settings WHERE key='reminder_days'").first<{ value: string }>();
  const reminderDays: number[] = setting ? JSON.parse(setting.value) : [14, 7, 1];
  const rows = await env.DB.prepare(`SELECT d.*, e.year, c.acronym FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id WHERE d.notification_enabled=1 AND e.is_archived=0 AND c.is_archived=0 AND d.deadline_at >= datetime('now','-1 day') AND d.deadline_at <= datetime('now','+15 days')`).all<ReminderRow>();
  for (const row of rows.results) {
    const days = daysUntil(row.deadline_at, now, Boolean(row.is_aoe), Boolean(row.has_time));
    if (!reminderDays.includes(days)) continue;
    const label = days === 1 ? '前日' : `${days}日前`;
    await sendSlack(env, { type: `deadline_reminder_${days}`, editionId: row.conference_edition_id, deadlineId: row.id, scheduledDate: now.toISOString().slice(0, 10), text: `⏳ 締切${label}: ${row.acronym} ${row.year}\n${row.deadline_type}: ${row.deadline_at}${row.is_aoe ? ' (AoE)' : ''}\n詳細: ${env.APP_BASE_URL}/editions/${row.conference_edition_id}` });
  }
}

export async function runWeeklySummary(env: Env, now = new Date()): Promise<void> {
  const enabled = await env.DB.prepare("SELECT value FROM system_settings WHERE key='weekly_enabled'").first<{ value: string }>();
  if (enabled?.value === 'false') return;
  const [deadlines, recent] = await env.DB.batch([
    env.DB.prepare(`SELECT d.deadline_at, d.deadline_type, d.is_aoe, e.id edition_id, e.year, c.acronym FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id WHERE d.notification_enabled=1 AND e.is_archived=0 AND c.is_archived=0 AND d.deadline_at >= datetime('now') AND d.deadline_at < datetime('now','+90 days') ORDER BY d.deadline_at LIMIT 20`),
    env.DB.prepare(`SELECT e.id, e.year, c.acronym FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.created_at >= datetime('now','-7 days') ORDER BY e.created_at DESC LIMIT 10`)
  ]);
  if (!deadlines.results.length && !recent.results.length) return;
  const deadlineLines = (deadlines.results as Record<string, unknown>[]).map((row) => `• ${row.acronym} ${row.year} ${row.deadline_type}: ${String(row.deadline_at).slice(0, 16)}${row.is_aoe ? ' AoE' : ''}`);
  const recentLines = (recent.results as Record<string, unknown>[]).map((row) => `• ${row.acronym} ${row.year}`);
  const sections = ['📅 今週の学会まとめ'];
  if (deadlineLines.length) sections.push(`今後90日以内の締切\n${deadlineLines.join('\n')}`);
  if (recentLines.length) sections.push(`最近追加\n${recentLines.join('\n')}`);
  sections.push(`一覧: ${env.APP_BASE_URL}`);
  await sendSlack(env, { type: 'weekly_summary', editionId: null, deadlineId: null, scheduledDate: now.toISOString().slice(0, 10), text: sections.join('\n\n') });
}
