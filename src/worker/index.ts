import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { runDailyReminders, runWeeklySummary } from './cron/notifications';
import { protectMutation, securityHeaders } from './middleware/security';
import { conferenceRoutes } from './routes/conferences';
import { deadlineRoutes } from './routes/deadlines';
import { editionRoutes } from './routes/editions';
import { exportRoutes } from './routes/export';
import { opportunityRoutes } from './routes/opportunities';
import { settingsRoutes } from './routes/settings';

export interface Env {
  DB: D1Database;
  APP_BASE_URL: string;
  SLACK_WEBHOOK_URL?: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', securityHeaders);
app.use('/api/*', cors({ origin: (origin, c) => origin === new URL(c.env.APP_BASE_URL).origin ? origin : new URL(c.req.url).origin, allowMethods: ['GET', 'POST', 'PUT', 'DELETE'], allowHeaders: ['Content-Type'] }));
app.use('/api/*', protectMutation);
app.get('/api/health', (c) => c.json({ status: 'ok' }));
app.post('/api/conferences/:id/editions', (c) => {
  const url = new URL(c.req.url);
  url.pathname = `/api/editions/conference/${c.req.param('id')}`;
  return app.fetch(new Request(url, c.req.raw), c.env, c.executionCtx);
});
app.post('/api/editions/:id/deadlines', (c) => {
  const url = new URL(c.req.url);
  url.pathname = `/api/deadlines/edition/${c.req.param('id')}`;
  return app.fetch(new Request(url, c.req.raw), c.env, c.executionCtx);
});
app.route('/api/conferences', conferenceRoutes);
app.route('/api/editions', editionRoutes);
app.route('/api/deadlines', deadlineRoutes);
app.route('/api', opportunityRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/export', exportRoutes);

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDailyReminders(env, new Date(controller.scheduledTime)));
    if (controller.cron === '0 0 * * 1') ctx.waitUntil(runWeeklySummary(env, new Date(controller.scheduledTime)));
  }
};
