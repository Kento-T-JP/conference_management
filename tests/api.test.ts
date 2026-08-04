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

  it('年度別開催情報と関連締切を完全消去できる', async () => {
    const deleted: string[] = [];
    const db = {
      prepare(query: string) {
        return {
          query,
          bind() { return this; },
          async first() { return { id: 31, conference_id: 12, year: 2028, deadline_count: 3 }; }
        };
      },
      async batch(statements: Array<{ query: string }>) {
        deleted.push(...statements.map((statement) => statement.query));
        return statements.map(() => ({ success: true, meta: { changes: 1 } }));
      }
    } as unknown as D1Database;
    const env = { APP_BASE_URL: 'http://localhost:5173', ENVIRONMENT: 'test', DB: db } satisfies Env;
    const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
    const response = await worker.fetch(new Request('http://localhost/api/editions/31', { method: 'DELETE' }), env, ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { id: 31, conference_id: 12, year: 2028, deleted_deadlines: 3 } });
    expect(deleted).toHaveLength(3);
    expect(deleted[0]).toContain('DELETE FROM notification_logs');
    expect(deleted[2]).toContain('DELETE FROM conference_editions');
  });

  it('次年度の開催回が存在する場合は複製しない', async () => {
    const db = {
      prepare(query: string) {
        return {
          bind() { return this; },
          async first() {
            if (query.includes('SELECT * FROM conference_editions')) return { id: 31, conference_id: 12, year: 2028 };
            if (query.includes('SELECT id FROM conference_editions')) return { id: 32 };
            return null;
          }
        };
      }
    } as unknown as D1Database;
    const env = { APP_BASE_URL: 'http://localhost:5173', ENVIRONMENT: 'test', DB: db } satisfies Env;
    const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
    const response = await worker.fetch(new Request('http://localhost/api/editions/31/duplicate-next-year', { method: 'POST' }), env, ctx);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: { code: 'DUPLICATE_EDITION', message: '次年度の開催回は既に存在します。' } });
  });
});
