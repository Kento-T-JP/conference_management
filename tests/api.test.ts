import { describe, expect, it } from 'vitest';
import worker, { type Env } from '../src/worker';

describe('API', () => {
  it('ヘルスチェックが統一JSONを返す', async () => {
    const env = { APP_BASE_URL: 'http://localhost:5173', ENVIRONMENT: 'test', DB: {} as D1Database } satisfies Env;
    const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
    const response = await worker.fetch(new Request('http://localhost/api/health'), env, ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });
});
