import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/worker';
import { sendSlack } from '../src/worker/services/slack';

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
  const env: Env = { DB, APP_BASE_URL: 'https://example.com', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/example', ENVIRONMENT: 'test' };
  return { env, logs };
}

const options = { type: 'deadline_reminder_7', editionId: 1, deadlineId: 2, scheduledDate: '2027-01-01', text: 'test' };

describe('Slack通知', () => {
  afterEach(() => vi.unstubAllGlobals());
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
});
