import { Hono } from 'hono';
import { deadlineBatchSchema, deadlineSchema } from '../../shared/schemas';
import type { Env } from '../index';
import { ApiError, errorResponse, nowSql, parseId, validationDetails } from '../lib/api';
import { deadlineChangedMessage, sendSlack } from '../services/slack';

export const deadlineRoutes = new Hono<{ Bindings: Env }>();

deadlineRoutes.post('/edition/:editionId/batch', async (c) => {
  try {
    const editionId = parseId(c.req.param('editionId'));
    const parsed = deadlineBatchSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const edition = await c.env.DB.prepare('SELECT end_date FROM conference_editions WHERE id=? AND is_archived=0').bind(editionId).first<{ end_date: string | null }>();
    if (!edition) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
    const now = nowSql();
    const statements = parsed.data.deadlines.map((deadline) => c.env.DB.prepare(`INSERT INTO conference_deadlines(conference_edition_id, deadline_type, title, deadline_at, has_time, timezone, is_aoe, information_status, notification_enabled, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(editionId, deadline.deadline_type, deadline.title ?? null, deadline.deadline_at, deadline.has_time ? 1 : 0, deadline.timezone ?? null, deadline.is_aoe ? 1 : 0, deadline.information_status, deadline.notification_enabled ? 1 : 0, now, now));
    const results = await c.env.DB.batch(statements);
    const ids = results.map((result) => result.meta.last_row_id).filter((value): value is number => typeof value === 'number');
    const rows = ids.length ? await c.env.DB.prepare(`SELECT * FROM conference_deadlines WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY deadline_at`).bind(...ids).all() : { results: [] };
    const warnings = parsed.data.deadlines.flatMap((deadline, index) => edition.end_date && deadline.deadline_at.slice(0, 10) > edition.end_date ? [{ index, message: '締切が開催終了日より後です。' }] : []);
    return c.json({ data: rows.results, warnings }, 201);
  } catch (error) { return errorResponse(c, error); }
});

deadlineRoutes.post('/edition/:editionId', async (c) => {
  try {
    const editionId = parseId(c.req.param('editionId'));
    const parsed = deadlineSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const d = parsed.data;
    const edition = await c.env.DB.prepare('SELECT end_date FROM conference_editions WHERE id=? AND is_archived=0').bind(editionId).first<{ end_date: string | null }>();
    if (!edition) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
    const warning = edition.end_date && d.deadline_at.slice(0, 10) > edition.end_date ? '締切が開催終了日より後です。' : undefined;
    const now = nowSql();
    const result = await c.env.DB.prepare(`INSERT INTO conference_deadlines(conference_edition_id, deadline_type, title, deadline_at, has_time, timezone, is_aoe, information_status, notification_enabled, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(editionId, d.deadline_type, d.title ?? null, d.deadline_at, d.has_time ? 1 : 0, d.timezone ?? null, d.is_aoe ? 1 : 0, d.information_status, d.notification_enabled ? 1 : 0, now, now).run();
    const row = await c.env.DB.prepare('SELECT * FROM conference_deadlines WHERE id=?').bind(result.meta.last_row_id).first();
    return c.json({ data: row, warnings: warning ? { deadline_at: warning } : undefined }, 201);
  } catch (error) { return errorResponse(c, error); }
});

deadlineRoutes.put('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const parsed = deadlineSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const d = parsed.data;
    const current = await c.env.DB.prepare('SELECT * FROM conference_deadlines WHERE id=?').bind(id).first<Record<string, unknown>>();
    if (!current) throw new ApiError(404, 'NOT_FOUND', '締切が見つかりません。');
    if (d.version && d.version !== current.version) throw new ApiError(409, 'UPDATE_CONFLICT', '別の更新が反映されています。画面を再読み込みしてください。');
    const changed = d.deadline_at !== current.deadline_at;
    await c.env.DB.prepare(`UPDATE conference_deadlines SET deadline_type=?, title=?, deadline_at=?, has_time=?, timezone=?, is_aoe=?, information_status=?, previous_deadline_at=?, is_extended=?, notification_enabled=?, updated_at=?, version=version+1 WHERE id=?`)
      .bind(d.deadline_type, d.title ?? null, d.deadline_at, d.has_time ? 1 : 0, d.timezone ?? null, d.is_aoe ? 1 : 0, d.information_status, changed ? current.deadline_at : current.previous_deadline_at, changed ? 1 : current.is_extended, d.notification_enabled ? 1 : 0, nowSql(), id).run();
    const row = await c.env.DB.prepare(`SELECT d.*, e.year, c.acronym FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id WHERE d.id=?`).bind(id).first<Record<string, unknown>>();
    if (changed && row) c.executionCtx.waitUntil(sendSlack(c.env, { type: 'deadline_changed', editionId: Number(row.conference_edition_id), deadlineId: id, scheduledDate: nowSql().slice(0, 10), text: deadlineChangedMessage(row, String(current.deadline_at), c.env.APP_BASE_URL) }));
    return c.json({ data: row });
  } catch (error) { return errorResponse(c, error); }
});

deadlineRoutes.delete('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const result = await c.env.DB.prepare('DELETE FROM conference_deadlines WHERE id=?').bind(id).run();
    if (!result.meta.changes) throw new ApiError(404, 'NOT_FOUND', '締切が見つかりません。');
    return c.body(null, 204);
  } catch (error) { return errorResponse(c, error); }
});
