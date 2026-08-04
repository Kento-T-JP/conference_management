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

  it('学会と関連情報を確認後に完全消去できる', async () => {
    const deleted: string[] = [];
    const db = {
      prepare(query: string) {
        return {
          query,
          bind() { return this; },
          async first() { return { id: 12, edition_count: 2, deadline_count: 5 }; }
        };
      },
      async batch(statements: Array<{ query: string }>) {
        deleted.push(...statements.map((statement) => statement.query));
        return statements.map(() => ({ success: true, meta: { changes: 1 } }));
      }
    } as unknown as D1Database;
    const env = { APP_BASE_URL: 'http://localhost:5173', ENVIRONMENT: 'test', DB: db } satisfies Env;
    const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
    const response = await worker.fetch(new Request('http://localhost/api/conferences/12', { method: 'DELETE' }), env, ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: 12, deleted_editions: 2, deleted_deadlines: 5 } });
    expect(deleted).toHaveLength(4);
    expect(deleted[0]).toContain('DELETE FROM notification_logs');
    expect(deleted[3]).toContain('DELETE FROM conferences');
  });
});
