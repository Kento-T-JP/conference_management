import { Hono } from 'hono';
import { z } from 'zod';
import type { SlackSettingsData } from '../../shared/types';
import type { Env } from '../index';
import { ApiError, errorResponse, nowSql } from '../lib/api';
import { sendSlack } from '../services/slack';

const notificationSettingsSchema = z.object({
  reminder_days: z.array(z.number().int().min(1).max(90)).max(8),
  weekly_enabled: z.boolean()
});

export const settingsRoutes = new Hono<{ Bindings: Env }>();

settingsRoutes.get('/slack', async (c) => {
  try {
    const [settings, lastDelivery] = await c.env.DB.batch([
      c.env.DB.prepare("SELECT key, value FROM system_settings WHERE key IN ('reminder_days','weekly_enabled')"),
      c.env.DB.prepare('SELECT notification_type, status, response_code, error_message, sent_at, created_at FROM notification_logs ORDER BY created_at DESC, id DESC LIMIT 1')
    ]);
    const values = new Map((settings.results as Array<{ key: string; value: string }>).map((row) => [row.key, row.value]));
    const last = lastDelivery.results[0] as SlackSettingsData['last_delivery'] | undefined;
    return c.json({ data: {
      configured: Boolean(c.env.SLACK_WEBHOOK_URL?.trim()),
      reminder_days: parseReminderDays(values.get('reminder_days')),
      weekly_enabled: values.get('weekly_enabled') !== 'false',
      last_delivery: last ?? null
    } satisfies SlackSettingsData });
  } catch (error) { return errorResponse(c, error); }
});

settingsRoutes.put('/notifications', async (c) => {
  try {
    const parsed = notificationSettingsSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '通知設定を確認してください。');
    const reminderDays = [...new Set(parsed.data.reminder_days)].sort((a, b) => b - a);
    const now = nowSql();
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT INTO system_settings(key,value,updated_at) VALUES('reminder_days',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).bind(JSON.stringify(reminderDays), now),
      c.env.DB.prepare(`INSERT INTO system_settings(key,value,updated_at) VALUES('weekly_enabled',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`).bind(String(parsed.data.weekly_enabled), now)
    ]);
    return c.json({ data: { reminder_days: reminderDays, weekly_enabled: parsed.data.weekly_enabled } });
  } catch (error) { return errorResponse(c, error); }
});

settingsRoutes.post('/slack/test', async (c) => {
  try {
    if (!c.env.SLACK_WEBHOOK_URL?.trim()) throw new ApiError(409, 'SLACK_NOT_CONFIGURED', 'Slack Incoming Webhookが設定されていません。');
    const now = nowSql();
    const status = await sendSlack(c.env, {
      type: 'slack_test',
      editionId: null,
      deadlineId: null,
      scheduledDate: now,
      text: `✅ 篠宮研究室 学会管理からのテスト通知です。\nSlack連携は正常に動作しています。\n${c.env.APP_BASE_URL}`
    });
    if (status !== 'sent') throw new ApiError(500, 'SLACK_TEST_FAILED', 'テスト通知を送信できませんでした。設定を確認してください。');
    return c.json({ data: { status: 'sent', sent_at: now } });
  } catch (error) { return errorResponse(c, error); }
});

function parseReminderDays(value?: string): number[] {
  if (!value) return [14, 7, 1];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((day): day is number => Number.isInteger(day) && day >= 1 && day <= 90) : [14, 7, 1];
  } catch { return [14, 7, 1]; }
}
