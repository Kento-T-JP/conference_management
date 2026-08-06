import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/worker';
import { runWeeklySummary } from '../src/worker/cron/notifications';
import { deadlineChangedMessage, editionMessage, isSlackWebhookConfigured, reminderMessage, sendSlack, slackTestMessage, weeklySummaryMessage } from '../src/worker/services/slack';

interface StoredLog { status: string; responseCode: number | null; errorMessage: string | null; }

function fakeEnv(existing?: string) {
  const logs: StoredLog[] = [];
  const statement = {
    bind: (...values: unknown[]) => ({
      first: async () => existing ? { status: existing } : null,
      run: async () => { logs.push({ status: String(values[4]), responseCode: values[5] == null ? null : Number(values[5]), errorMessage: values[6] == null ? null : String(values[6]) }); return { success: true }; }
    })
  };
  const DB = { prepare: () => statement } as unknown as D1Database;
  const env: Env = { DB, APP_BASE_URL: 'https://example.com', SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T_TEST/B_TEST/TEST_TOKEN', ENVIRONMENT: 'test' };
  return { env, logs };
}

const options = { type: 'deadline_reminder_7', editionId: 1, deadlineId: 2, scheduledDate: '2027-01-01', text: 'test' };

describe('Slack通知', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('実際のSlack Webhook形式だけを設定済みと判定する', () => {
    expect(isSlackWebhookConfigured('https://hooks.slack.com/services/T_TEST/B_TEST/TEST_TOKEN')).toBe(true);
    expect(isSlackWebhookConfigured('https://hooks.slack.com/services/EXAMPLE/ONLY/NOT-A-REAL-WEBHOOK')).toBe(false);
    expect(isSlackWebhookConfigured('https://example.com/services/T/B/token')).toBe(false);
  });
  it('成功を記録する', async () => {
    const { env, logs } = fakeEnv();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok', { status: 200 })));
    expect(await sendSlack(env, options)).toBe('sent');
    expect(logs[0].status).toBe('sent');
  });
  it('Webhook失敗を記録し例外を投げない', async () => {
    const { env, logs } = fakeEnv();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad', { status: 500 })));
    expect(await sendSlack(env, options)).toBe('failed');
    expect(logs[0]).toMatchObject({ status: 'failed', responseCode: 500 });
  });
  it('送信済み通知を重複送信しない', async () => {
    const { env } = fakeEnv('sent');
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await sendSlack(env, options)).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('Webhook未設定時はスキップを記録する', async () => {
    const { env, logs } = fakeEnv(); delete env.SLACK_WEBHOOK_URL;
    expect(await sendSlack(env, options)).toBe('skipped');
    expect(logs[0].status).toBe('skipped');
  });
  it('サンプルのダミーWebhookは送信せず未設定として扱う', async () => {
    const { env, logs } = fakeEnv();
    env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/EXAMPLE/ONLY/NOT-A-REAL-WEBHOOK';
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await sendSlack(env, options)).toBe('skipped');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs[0].status).toBe('skipped');
  });
  it('週次まとめを無効にすると集計も送信も行わない', async () => {
    const batch = vi.fn();
    const DB = { prepare: () => ({ first: async () => ({ value: 'false' }) }), batch } as unknown as D1Database;
    await runWeeklySummary({ DB, APP_BASE_URL: 'https://example.com', ENVIRONMENT: 'test' }, new Date('2028-01-01T00:00:00Z'));
    expect(batch).not.toHaveBeenCalled();
  });
  it('開催回を日本語の日付と読みやすい分野で整形する', () => {
    const text = editionMessage({ id: 3, acronym: 'IEEE CVPR', year: 2027, start_date: '2027-06-15', end_date: '2027-06-19', city: 'Nashville', country: 'United States', attendance_format: '現地', fields: '["機械学習","コンピュータビジョン"]', official_url: 'https://cvpr.thecvf.com/' }, 'https://conference.example.com');
    expect(text).toContain('*IEEE CVPR 2027*');
    expect(text).toContain('開催日：2027年6月15日（火）〜2027年6月19日（土）');
    expect(text).toContain('分野：機械学習・コンピュータビジョン');
    expect(text).toContain('<https://conference.example.com/editions/3|開催回の詳細>');
    expect(text).not.toContain('["');
  });
  it('締切変更とリマインドを日本語表記にする', () => {
    const row = { acronym: 'IEEE CVPR', year: 2027, conference_edition_id: 3, deadline_type: 'Full Paper', deadline_at: '2026-11-14T23:59:59-12:00', has_time: 1, is_aoe: 1 };
    expect(deadlineChangedMessage(row, '2026-11-07T23:59:59-12:00', 'https://conference.example.com')).toContain('変更後：2026年11月14日（土） 23:59（AoE）');
    expect(reminderMessage(row, 7, 'https://conference.example.com')).toContain('⏳ *締切まであと7日*');
    expect(reminderMessage(row, 1, 'https://conference.example.com')).toContain('⏳ *締切は明日です*');
    expect(reminderMessage(row, 7, 'https://conference.example.com')).toContain('*IEEE CVPR 2027 — 論文投稿*');
  });
  it('同一年に複数ある研究会は開催回名を通知に含める', () => {
    const row = { acronym: 'MSS', year: 2026, edition_name: '11月研究会', conference_type: '研究会', conference_edition_id: 8, deadline_type: 'Other', title: '発表申込', deadline_at: '2026-09-04', has_time: 0, is_aoe: 0 };
    expect(reminderMessage(row, 7, 'https://conference.example.com')).toContain('*MSS 2026年11月研究会 — その他（発表申込）*');
  });
  it('採否通知は締切ではなく予定として通知する', () => {
    const row = { acronym: 'IEEE CVPR', year: 2027, conference_edition_id: 3, deadline_type: 'Author Notification', deadline_at: '2027-01-20', has_time: 0, is_aoe: 0 };
    const text = reminderMessage(row, 1, 'https://conference.example.com');
    expect(text).toContain('📣 *予定は明日です*');
    expect(text).toContain('予定日：');
    expect(text).not.toContain('締切：');
  });
  it('週次まとめとテスト通知をSlackリンク形式にする', () => {
    const weekly = weeklySummaryMessage(
      [{ acronym: 'IEEE CVPR', year: 2027, deadline_type: 'Full Paper', deadline_at: '2027-01-20', has_time: 0, is_aoe: 0 }],
      [{ id: 3, acronym: 'IEEE CVPR', year: 2027 }],
      'https://conference.example.com'
    );
    expect(weekly).toContain('*90日以内の締切*');
    expect(weekly).toContain('IEEE CVPR 2027 — 論文投稿');
    expect(weekly).toContain('<https://conference.example.com/editions/3|IEEE CVPR 2027>');
    expect(slackTestMessage('https://conference.example.com')).toContain('<https://conference.example.com/|学会管理を開く>');
  });
  it('ユーザー入力をSlackマークアップとして解釈させない', () => {
    const text = editionMessage({ id: 3, acronym: '<!channel>', year: 2027, fields: ['A&B'], official_url: 'javascript:alert(1)' }, 'https://conference.example.com');
    expect(text).toContain('&lt;!channel&gt;');
    expect(text).toContain('A&amp;B');
    expect(text).not.toContain('javascript:');
  });
});
