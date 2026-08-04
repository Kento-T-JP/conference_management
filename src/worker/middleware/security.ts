import type { MiddlewareHandler } from 'hono';
import type { Env } from '../index';

const recent = new Map<string, { count: number; resetAt: number }>();

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
};

export const protectMutation: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(c.req.method)) return next();

  const origin = c.req.header('Origin');
  if (origin) {
    const allowed = new URL(c.env.APP_BASE_URL).origin;
    const requestOrigin = new URL(c.req.url).origin;
    if (origin !== allowed && origin !== requestOrigin) {
      return c.json({ error: { code: 'CSRF_ERROR', message: '不正な送信元からの操作を拒否しました。' } }, 403);
    }
  }

  // IPアドレスなど個人を識別し得る値は保持せず、変更API全体の短時間バーストだけを抑制する。
  const key = new URL(c.req.url).pathname;
  const now = Date.now();
  const entry = recent.get(key);
  if (!entry || entry.resetAt <= now) recent.set(key, { count: 1, resetAt: now + 60_000 });
  else {
    entry.count += 1;
    if (entry.count > 60) return c.json({ error: { code: 'RATE_LIMITED', message: '操作が多すぎます。1分後に再度お試しください。' } }, 429);
  }
  await next();
};
