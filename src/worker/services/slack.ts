import type { Env } from '../index';
import { nowSql } from '../lib/api';

interface NotificationOptions {
  type: string;
  editionId: number | null;
  deadlineId: number | null;
  scheduledDate: string;
  text: string;
}

export async function sendSlack(env: Env, options: NotificationOptions): Promise<'sent' | 'failed' | 'skipped'> {
  const existing = await env.DB.prepare(`SELECT status FROM notification_logs WHERE notification_type=? AND conference_edition_id IS ? AND deadline_id IS ? AND scheduled_date=?`)
    .bind(options.type, options.editionId, options.deadlineId, options.scheduledDate).first<{ status: string }>();
  if (existing?.status === 'sent') return 'skipped';

  const now = nowSql();
  if (!env.SLACK_WEBHOOK_URL) {
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
  const dates = edition.start_date ? `${edition.start_date}${edition.end_date ? `〜${edition.end_date}` : ''}` : '未定';
  return `📌 新しい学会開催回: ${edition.acronym} ${edition.year}\n開催: ${dates} / ${place}\n分野: ${edition.fields || '未設定'}\n詳細: ${baseUrl}/editions/${edition.id}\n公式: ${edition.official_url || edition.conference_official_url}`;
}

export function deadlineChangedMessage(row: Record<string, unknown>, oldDeadline: string, baseUrl: string): string {
  return `⏰ 締切変更: ${row.acronym} ${row.year} / ${row.deadline_type}\n旧: ${oldDeadline}\n新: ${row.deadline_at}${row.is_aoe ? ' (AoE)' : ''}\n詳細: ${baseUrl}/editions/${row.conference_edition_id}`;
}
