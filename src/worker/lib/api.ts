import type { Context } from 'hono';
import type { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409 | 429 | 500,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, string>
  ) {
    super(message);
  }
}

export function validationDetails(error: ZodError): Record<string, string> {
  return Object.fromEntries(error.issues.map((issue) => [issue.path.join('.') || 'input', issue.message]));
}

export function errorResponse(c: Context, error: unknown) {
  if (error instanceof ApiError) {
    return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
  }
  console.error('Unhandled API error', error instanceof Error ? error.message : 'unknown');
  return c.json({ error: { code: 'INTERNAL_ERROR', message: '処理に失敗しました。時間をおいて再度お試しください。' } }, 500);
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(404, 'NOT_FOUND', '対象のデータが見つかりません。');
  return id;
}

export function nowSql(): string {
  return new Date().toISOString();
}
