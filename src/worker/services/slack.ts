import type { Env } from '../index';
import { nowSql } from '../lib/api';
import { editionDisplayName } from '../../shared/edition';

interface NotificationOptions {
  type: string;
  editionId: number | null;
  deadlineId: number | null;
  scheduledDate: string;
  text: string;
}

const DEADLINE_LABELS: Record<string, string> = {
  Abstract: 'アブストラクト',
  'Full Paper': '論文投稿',
  'Short Paper': 'ショートペーパー',
  Poster: 'ポスター',
  Workshop: 'ワークショップ',
  'Camera-ready': '最終原稿',
  'Author Notification': '採否通知',
  Registration: '参加登録',
  Other: 'その他'
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function isSlackWebhookConfigured(value?: string): value is string {
  if (!value) return false;
  const webhookUrl = value.trim();
  if (!webhookUrl || /EXAMPLE|NOT-A-REAL/i.test(webhookUrl)) return false;

  try {
    const url = new URL(webhookUrl);
    const isSlackHost = url.hostname === 'hooks.slack.com' || url.hostname === 'hooks.slack-gov.com';
    return url.protocol === 'https:' && isSlackHost && /^\/services\/[^/]+\/[^/]+\/[^/]+$/.test(url.pathname);
  } catch {
    return false;
  }
}

export async function sendSlack(env: Env, options: NotificationOptions): Promise<'sent' | 'failed' | 'skipped'> {
  const existing = await env.DB.prepare(`SELECT status FROM notification_logs WHERE notification_type=? AND conference_edition_id IS ? AND deadline_id IS ? AND scheduled_date=?`)
    .bind(options.type, options.editionId, options.deadlineId, options.scheduledDate).first<{ status: string }>();
  if (existing?.status === 'sent') return 'skipped';

  const now = nowSql();
  if (!isSlackWebhookConfigured(env.SLACK_WEBHOOK_URL)) {
    await upsertLog(env.DB, options, 'skipped', null, 'Webhookが未設定です。', null);
    return 'skipped';
  }

  try {
    const response = await fetch(env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: options.text })
    });
    if (!response.ok) {
      await upsertLog(env.DB, options, 'failed', response.status, `Slack returned ${response.status}`, null);
      return 'failed';
    }
    await upsertLog(env.DB, options, 'sent', response.status, null, now);
    return 'sent';
  } catch (error) {
    await upsertLog(env.DB, options, 'failed', null, error instanceof Error ? error.message.slice(0, 500) : '送信エラー', null);
    return 'failed';
  }
}

async function upsertLog(db: D1Database, options: NotificationOptions, status: string, responseCode: number | null, errorMessage: string | null, sentAt: string | null) {
  await db.prepare(`INSERT INTO notification_logs(notification_type, conference_edition_id, deadline_id, scheduled_date, status, response_code, error_message, sent_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT
    DO UPDATE SET status=excluded.status, response_code=excluded.response_code, error_message=excluded.error_message, sent_at=excluded.sent_at`)
    .bind(options.type, options.editionId, options.deadlineId, options.scheduledDate, status, responseCode, errorMessage, sentAt).run();
}

export function editionMessage(edition: Record<string, unknown>, baseUrl: string): string {
  const place = [edition.city, edition.country].filter(Boolean).join(', ') || '未定';
  const dates = edition.start_date ? `${formatJapaneseDate(edition.start_date)}${edition.end_date ? `〜${formatJapaneseDate(edition.end_date)}` : ''}` : '未定';
  const fields = formatFields(edition.fields);
  const detail = slackLink(`${baseUrl}/editions/${edition.id}`, '開催回の詳細');
  const official = slackLink(edition.official_url || edition.conference_official_url, '公式サイト');
  return [
    '📌 *新しい開催回を登録しました*',
    `*${escapeSlackText(recordEditionName(edition))}*`,
    `開催日：${dates}`,
    `開催地：${escapeSlackText(place)}`,
    `開催形式：${escapeSlackText(edition.attendance_format || '未定')}`,
    `分野：${fields}`,
    [detail, official].filter(Boolean).join('  |  ')
  ].join('\n');
}

export function deadlineChangedMessage(row: Record<string, unknown>, oldDeadline: string, baseUrl: string): string {
  return [
    '⏰ *締切が変更されました*',
    `*${conferenceDeadlineTitle(row)}*`,
    `変更前：${formatDeadlineDate(oldDeadline, row)}`,
    `変更後：${formatDeadlineDate(row.deadline_at, row)}`,
    slackLink(`${baseUrl}/editions/${row.conference_edition_id}`, '開催回の詳細')
  ].join('\n');
}

export function reminderMessage(row: Record<string, unknown>, days: number, baseUrl: string): string {
  return [
    days === 1 ? '⏳ *締切は明日です*' : `⏳ *締切まであと${days}日*`,
    `*${conferenceDeadlineTitle(row)}*`,
    `締切：${formatDeadlineDate(row.deadline_at, row)}`,
    slackLink(`${baseUrl}/editions/${row.conference_edition_id}`, '開催回の詳細')
  ].join('\n');
}

export function weeklySummaryMessage(deadlines: Record<string, unknown>[], recent: Record<string, unknown>[], baseUrl: string): string {
  const sections = ['📅 *今週の学会予定*'];
  if (deadlines.length) {
    const lines = deadlines.map((row) => `• *${conferenceDeadlineTitle(row)}*\n  ${formatDeadlineDate(row.deadline_at, row)}`);
    sections.push(`*90日以内の締切*\n${lines.join('\n')}`);
  }
  if (recent.length) {
    const lines = recent.map((row) => `• ${slackLink(`${baseUrl}/editions/${row.edition_id || row.id}`, recordEditionName(row))}`);
    sections.push(`*最近追加された開催回*\n${lines.join('\n')}`);
  }
  sections.push(slackLink(baseUrl, '学会管理を開く'));
  return sections.join('\n\n');
}

export function slackTestMessage(baseUrl: string): string {
  return `✅ *Slack連携テストに成功しました*\n篠宮研究室 学会管理から通知を送信できています。\n${slackLink(baseUrl, '学会管理を開く')}`;
}

function conferenceDeadlineTitle(row: Record<string, unknown>): string {
  const base = DEADLINE_LABELS[String(row.deadline_type)] || String(row.deadline_type || '締切');
  const custom = String(row.title || '').trim();
  const label = custom && custom !== base ? `${base}（${custom}）` : base;
  return `${escapeSlackText(recordEditionName(row))} — ${escapeSlackText(label)}`;
}

function recordEditionName(row: Record<string, unknown>): string {
  return editionDisplayName({
    acronym: String(row.acronym || ''),
    year: Number(row.year),
    edition_name: row.edition_name ? String(row.edition_name) : null,
    start_date: row.start_date ? String(row.start_date) : null,
    conference_type: row.conference_type ? String(row.conference_type) : null
  });
}

function formatDeadlineDate(value: unknown, row: Record<string, unknown>): string {
  const date = formatJapaneseDate(value, row.has_time !== 0);
  const timezone = row.is_aoe ? 'AoE' : String(row.timezone || '').trim();
  return timezone ? `${date}（${escapeSlackText(timezone)}）` : date;
}

function formatJapaneseDate(value: unknown, includeTime = true): string {
  const text = String(value || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(text);
  if (!match) return escapeSlackText(text || '未定');
  const [, year, month, day, hour, minute] = match;
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay()];
  const time = includeTime && hour && minute ? ` ${hour}:${minute}` : '';
  return `${Number(year)}年${Number(month)}月${Number(day)}日（${weekday}）${time}`;
}

function formatFields(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(escapeSlackText).join('・') : '未設定';
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length ? parsed.map(escapeSlackText).join('・') : '未設定';
    } catch { /* plain text is handled below */ }
    return value.trim() ? escapeSlackText(value) : '未設定';
  }
  return '未設定';
}

function slackLink(value: unknown, label: unknown): string {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return escapeSlackText(label);
    return `<${url.toString().replaceAll('|', '%7C')}|${escapeSlackText(label)}>`;
  } catch {
    return escapeSlackText(label);
  }
}

function escapeSlackText(value: unknown): string {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
