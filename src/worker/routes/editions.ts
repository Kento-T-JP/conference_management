import { Hono } from 'hono';
import { editionSchema } from '../../shared/schemas';
import type { Env } from '../index';
import { ApiError, errorResponse, nowSql, parseId, validationDetails } from '../lib/api';
import { mapEdition } from '../lib/db';
import { editionMessage, sendSlack } from '../services/slack';
import { ACTIONABLE_DEADLINE_TYPES } from '../../shared/constants';

export const editionRoutes = new Hono<{ Bindings: Env }>();
const ACTIONABLE_TYPE_SQL = ACTIONABLE_DEADLINE_TYPES.map((type) => `'${type.replaceAll("'", "''")}'`).join(',');

editionRoutes.get('/', async (c) => {
  try {
    const clauses = ['e.is_archived = ?'];
    const values: unknown[] = [c.req.query('archived') === 'true' ? 1 : 0];
    const year = c.req.query('year');
    const format = c.req.query('attendance_format');
    const status = c.req.query('information_status');
    const query = (c.req.query('q') ?? '').trim();
    if (query) { clauses.push('(c.name LIKE ? OR c.acronym LIKE ? OR e.edition_name LIKE ?)'); values.push(`%${query}%`, `%${query}%`, `%${query}%`); }
    if (year) { clauses.push('e.year=?'); values.push(Number(year)); }
    if (format) { clauses.push('e.attendance_format=?'); values.push(format); }
    if (status) { clauses.push('e.information_status=?'); values.push(status); }
    if (c.req.query('include_past') !== 'true') clauses.push(`(COALESCE(e.end_date,e.start_date,printf('%04d-12-31',e.year)) >= date('now') OR EXISTS (SELECT 1 FROM conference_deadlines x WHERE x.conference_edition_id=e.id AND x.deadline_type IN (${ACTIONABLE_TYPE_SQL}) AND x.deadline_at >= datetime('now')))`);
    const order = c.req.query('sort') === 'start_date' ? 'COALESCE(e.start_date,\'9999-12-31\')' : 'COALESCE(next_deadline,\'9999-12-31\')';
    const sql = `SELECT e.*, c.name conference_name, c.acronym, c.official_url conference_official_url, c.conference_type, c.fields,
      (SELECT MIN(d.deadline_at) FROM conference_deadlines d WHERE d.conference_edition_id=e.id AND d.deadline_type IN (${ACTIONABLE_TYPE_SQL}) AND d.deadline_at >= datetime('now')) next_deadline,
      (SELECT d.deadline_type FROM conference_deadlines d WHERE d.conference_edition_id=e.id AND d.deadline_type IN (${ACTIONABLE_TYPE_SQL}) AND d.deadline_at >= datetime('now') ORDER BY d.deadline_at LIMIT 1) next_deadline_type
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
    const conference = await c.env.DB.prepare('SELECT id FROM conferences WHERE id=? AND is_archived=0').bind(conferenceId).first<{ id: number }>();
    if (!conference) throw new ApiError(404, 'NOT_FOUND', '学会が見つかりません。');
    await validateEditionIdentity(c.env.DB, conferenceId, d);
    const now = nowSql();
    const result = await c.env.DB.prepare(`INSERT INTO conference_editions(conference_id, year, edition_name, official_url, country, city, attendance_format, start_date, end_date, timezone, information_status, is_cancelled, notes, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(conferenceId, d.year, d.edition_name ?? null, d.official_url ?? null, d.country ?? null, d.city ?? null, d.attendance_format, d.start_date ?? null, d.end_date ?? null, d.timezone ?? null, d.information_status, d.is_cancelled ? 1 : 0, d.notes ?? null, now, now).run();
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
    await validateEditionIdentity(c.env.DB, current.conference_id, d, id);
    await c.env.DB.prepare(`UPDATE conference_editions SET year=?, edition_name=?, official_url=?, country=?, city=?, attendance_format=?, start_date=?, end_date=?, timezone=?, information_status=?, is_cancelled=?, notes=?, updated_at=?, version=version+1 WHERE id=?`)
      .bind(d.year, d.edition_name ?? null, d.official_url ?? null, d.country ?? null, d.city ?? null, d.attendance_format, d.start_date ?? null, d.end_date ?? null, d.timezone ?? null, d.information_status, d.is_cancelled ? 1 : 0, d.notes ?? null, nowSql(), id).run();
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

async function joinedEdition(db: D1Database, id: number) {
  return db.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.official_url conference_official_url, c.conference_type, c.fields FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.id=?`).bind(id).first<Record<string, unknown>>();
}

type EditionIdentityInput = {
  year: number;
  edition_name?: string | null;
  start_date?: string | null;
  official_url?: string | null;
};

async function validateEditionIdentity(db: D1Database, conferenceId: number, edition: EditionIdentityInput, excludeId?: number) {
  const result = await db.prepare(`SELECT id, edition_name, start_date, official_url
    FROM conference_editions WHERE conference_id=? AND year=? AND is_archived=0${excludeId ? ' AND id<>?' : ''}`)
    .bind(conferenceId, edition.year, ...(excludeId ? [excludeId] : [])).all<{ id: number; edition_name: string | null; start_date: string | null; official_url: string | null }>();
  if (!result.results.length) return;

  const name = edition.edition_name?.trim().toLocaleLowerCase() || null;
  const url = edition.official_url?.trim().replace(/\/$/, '').toLocaleLowerCase() || null;
  const duplicate = result.results.find((candidate) =>
    (edition.start_date && candidate.start_date === edition.start_date)
    || (name && candidate.edition_name?.trim().toLocaleLowerCase() === name)
    || (url && candidate.official_url?.trim().replace(/\/$/, '').toLocaleLowerCase() === url)
  );
  if (duplicate) throw new ApiError(409, 'DUPLICATE_EDITION', '同じ開催回と思われる情報が既に登録されています。既存の開催回を編集してください。');
  if (!edition.edition_name?.trim() && !edition.start_date) {
    throw new ApiError(400, 'VALIDATION_ERROR', '同じ年に複数登録する場合は、開催回名または開催開始日を入力してください。', {
      edition_name: '開催回を見分けるため、開催回名または開催開始日を入力してください。',
      start_date: '開催回名を入力しない場合は、開催開始日を入力してください。'
    });
  }
}
