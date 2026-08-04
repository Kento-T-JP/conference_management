import { Hono } from 'hono';
import { editionSchema } from '../../shared/schemas';
import type { Env } from '../index';
import { ApiError, errorResponse, nowSql, parseId, validationDetails } from '../lib/api';
import { mapEdition } from '../lib/db';
import { editionMessage, sendSlack } from '../services/slack';

export const editionRoutes = new Hono<{ Bindings: Env }>();

editionRoutes.get('/', async (c) => {
  try {
    const clauses = ['e.is_archived = ?'];
    const values: unknown[] = [c.req.query('archived') === 'true' ? 1 : 0];
    const year = c.req.query('year');
    const format = c.req.query('attendance_format');
    const status = c.req.query('information_status');
    if (year) { clauses.push('e.year=?'); values.push(Number(year)); }
    if (format) { clauses.push('e.attendance_format=?'); values.push(format); }
    if (status) { clauses.push('e.information_status=?'); values.push(status); }
    if (c.req.query('include_past') !== 'true') clauses.push(`(e.end_date IS NULL OR e.end_date >= date('now') OR EXISTS (SELECT 1 FROM conference_deadlines x WHERE x.conference_edition_id=e.id AND x.deadline_at >= datetime('now')))`);
    const order = c.req.query('sort') === 'start_date' ? 'COALESCE(e.start_date,\'9999-12-31\')' : 'COALESCE(next_deadline,\'9999-12-31\')';
    const sql = `SELECT e.*, c.name conference_name, c.acronym, c.official_url conference_official_url, c.conference_type, c.fields,
      (SELECT MIN(d.deadline_at) FROM conference_deadlines d WHERE d.conference_edition_id=e.id AND d.deadline_at >= datetime('now')) next_deadline,
      (SELECT d.deadline_type FROM conference_deadlines d WHERE d.conference_edition_id=e.id AND d.deadline_at >= datetime('now') ORDER BY d.deadline_at LIMIT 1) next_deadline_type
      FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE ${clauses.join(' AND ')} ORDER BY ${order}, c.acronym`;
    const result = await c.env.DB.prepare(sql).bind(...values).all<Record<string, unknown>>();
    return c.json({ data: result.results.map(mapEdition) });
  } catch (error) { return errorResponse(c, error); }
});

editionRoutes.post('/conference/:conferenceId', async (c) => {
  try {
    const conferenceId = parseId(c.req.param('conferenceId'));
    const parsed = editionSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const d = parsed.data;
    const conference = await c.env.DB.prepare('SELECT id FROM conferences WHERE id=? AND is_archived=0').bind(conferenceId).first();
    if (!conference) throw new ApiError(404, 'NOT_FOUND', '学会が見つかりません。');
    const duplicate = await c.env.DB.prepare('SELECT id FROM conference_editions WHERE conference_id=? AND year=?').bind(conferenceId, d.year).first();
    if (duplicate) throw new ApiError(409, 'DUPLICATE_EDITION', 'この学会の同じ開催年は既に登録されています。');
    const now = nowSql();
    const result = await c.env.DB.prepare(`INSERT INTO conference_editions(conference_id, year, official_url, country, city, attendance_format, start_date, end_date, timezone, information_status, is_cancelled, notes, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(conferenceId, d.year, d.official_url ?? null, d.country ?? null, d.city ?? null, d.attendance_format, d.start_date ?? null, d.end_date ?? null, d.timezone ?? null, d.information_status, d.is_cancelled ? 1 : 0, d.notes ?? null, now, now).run();
    const id = Number(result.meta.last_row_id);
    const row = await joinedEdition(c.env.DB, id);
    c.executionCtx.waitUntil(sendSlack(c.env, { type: 'new_edition', editionId: id, deadlineId: null, scheduledDate: now.slice(0, 10), text: editionMessage(row!, c.env.APP_BASE_URL) }));
    return c.json({ data: mapEdition(row!) }, 201);
  } catch (error) { return errorResponse(c, error); }
});

editionRoutes.get('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const row = await joinedEdition(c.env.DB, id);
    if (!row) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
    const deadlines = await c.env.DB.prepare('SELECT * FROM conference_deadlines WHERE conference_edition_id=? ORDER BY deadline_at').bind(id).all();
    return c.json({ data: { ...mapEdition(row), deadlines: deadlines.results } });
  } catch (error) { return errorResponse(c, error); }
});

editionRoutes.put('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const parsed = editionSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const d = parsed.data;
    const current = await c.env.DB.prepare('SELECT conference_id, version FROM conference_editions WHERE id=?').bind(id).first<{ conference_id: number; version: number }>();
    if (!current) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
    if (d.version && d.version !== current.version) throw new ApiError(409, 'UPDATE_CONFLICT', '別の更新が反映されています。画面を再読み込みしてください。');
    const duplicate = await c.env.DB.prepare('SELECT id FROM conference_editions WHERE conference_id=? AND year=? AND id<>?').bind(current.conference_id, d.year, id).first();
    if (duplicate) throw new ApiError(409, 'DUPLICATE_EDITION', 'この学会の同じ開催年は既に登録されています。');
    await c.env.DB.prepare(`UPDATE conference_editions SET year=?, official_url=?, country=?, city=?, attendance_format=?, start_date=?, end_date=?, timezone=?, information_status=?, is_cancelled=?, notes=?, updated_at=?, version=version+1 WHERE id=?`)
      .bind(d.year, d.official_url ?? null, d.country ?? null, d.city ?? null, d.attendance_format, d.start_date ?? null, d.end_date ?? null, d.timezone ?? null, d.information_status, d.is_cancelled ? 1 : 0, d.notes ?? null, nowSql(), id).run();
    return c.json({ data: mapEdition((await joinedEdition(c.env.DB, id))!) });
  } catch (error) { return errorResponse(c, error); }
});

editionRoutes.delete('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const current = await c.env.DB.prepare(`SELECT e.id, e.conference_id, e.year,
      (SELECT COUNT(*) FROM conference_deadlines d WHERE d.conference_edition_id=e.id) deadline_count
      FROM conference_editions e WHERE e.id=?`).bind(id).first<{ id: number; conference_id: number; year: number; deadline_count: number }>();
    if (!current) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
    await c.env.DB.batch([
      c.env.DB.prepare(`DELETE FROM notification_logs WHERE conference_edition_id=? OR deadline_id IN (SELECT id FROM conference_deadlines WHERE conference_edition_id=?)`).bind(id, id),
      c.env.DB.prepare('DELETE FROM conference_deadlines WHERE conference_edition_id=?').bind(id),
      c.env.DB.prepare('DELETE FROM conference_editions WHERE id=?').bind(id)
    ]);
    return c.json({ data: { id, conference_id: current.conference_id, year: current.year, deleted_deadlines: current.deadline_count } });
  } catch (error) { return errorResponse(c, error); }
});

for (const action of ['archive', 'restore'] as const) {
  editionRoutes.post(`/:id/${action}`, async (c) => {
    try {
      const id = parseId(c.req.param('id'));
      const archived = action === 'archive';
      const result = await c.env.DB.prepare('UPDATE conference_editions SET is_archived=?, archived_at=?, updated_at=?, version=version+1 WHERE id=?')
        .bind(archived ? 1 : 0, archived ? nowSql() : null, nowSql(), id).run();
      if (!result.meta.changes) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
      return c.json({ data: { id, is_archived: archived } });
    } catch (error) { return errorResponse(c, error); }
  });
}

editionRoutes.post('/:id/duplicate-next-year', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const source = await c.env.DB.prepare('SELECT * FROM conference_editions WHERE id=?').bind(id).first<Record<string, unknown>>();
    if (!source) throw new ApiError(404, 'NOT_FOUND', '開催回が見つかりません。');
    const nextYear = Number(source.year) + 1;
    const duplicate = await c.env.DB.prepare('SELECT id FROM conference_editions WHERE conference_id=? AND year=?').bind(source.conference_id, nextYear).first();
    if (duplicate) throw new ApiError(409, 'DUPLICATE_EDITION', '次年度の開催回は既に存在します。');
    const now = nowSql();
    const insert = await c.env.DB.prepare(`INSERT INTO conference_editions(conference_id, year, country, city, attendance_format, timezone, information_status, notes, created_at, updated_at) VALUES(?,?,?,?,?,?,'未確認',?,?,?)`)
      .bind(source.conference_id, nextYear, source.country, source.city, source.attendance_format, source.timezone, source.notes, now, now).run();
    const newId = Number(insert.meta.last_row_id);
    const deadlines = await c.env.DB.prepare('SELECT deadline_type, title, timezone, is_aoe, notification_enabled FROM conference_deadlines WHERE conference_edition_id=? ORDER BY deadline_at').bind(id).all<Record<string, unknown>>();
    for (const deadline of deadlines.results) {
      await c.env.DB.prepare(`INSERT INTO conference_deadlines(conference_edition_id, deadline_type, title, deadline_at, has_time, timezone, is_aoe, information_status, notification_enabled, created_at, updated_at) VALUES(?,?,?,? ,0,?,?,'未確認',?,?,?)`)
        .bind(newId, deadline.deadline_type, deadline.title, `${nextYear}-01-01`, deadline.timezone, deadline.is_aoe, deadline.notification_enabled, now, now).run();
    }
    return c.json({ data: { ...mapEdition((await joinedEdition(c.env.DB, newId))!), deadlines_copied: deadlines.results.length } }, 201);
  } catch (error) { return errorResponse(c, error); }
});

async function joinedEdition(db: D1Database, id: number) {
  return db.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.official_url conference_official_url, c.conference_type, c.fields FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.id=?`).bind(id).first<Record<string, unknown>>();
}
