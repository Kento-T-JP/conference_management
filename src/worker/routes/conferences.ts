import { Hono } from 'hono';
import { conferenceSchema } from '../../shared/schemas';
import type { Env } from '../index';
import { ApiError, errorResponse, nowSql, parseId, validationDetails } from '../lib/api';
import { mapConference } from '../lib/db';

export const conferenceRoutes = new Hono<{ Bindings: Env }>();

conferenceRoutes.get('/', async (c) => {
  try {
    const query = (c.req.query('q') ?? '').trim();
    const type = c.req.query('conference_type');
    const frequency = c.req.query('frequency');
    const field = c.req.query('field');
    const archived = c.req.query('archived') === 'true';
    const clauses = ['c.is_archived = ?'];
    const values: unknown[] = [archived ? 1 : 0];
    if (query) {
      clauses.push('(c.name LIKE ? OR c.acronym LIKE ? OR c.keywords LIKE ? OR c.fields LIKE ?)');
      values.push(...Array(4).fill(`%${query}%`));
    }
    if (type) { clauses.push('c.conference_type = ?'); values.push(type); }
    if (frequency) { clauses.push('c.frequency = ?'); values.push(frequency); }
    if (field) { clauses.push('c.fields LIKE ?'); values.push(`%${field}%`); }
    const sql = `SELECT c.*,
      (SELECT MAX(year) FROM conference_editions e WHERE e.conference_id=c.id AND e.is_archived=0) latest_year,
      (SELECT MIN(d.deadline_at) FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id WHERE e.conference_id=c.id AND e.is_archived=0 AND d.deadline_at >= datetime('now')) next_deadline,
      (SELECT e.id FROM conference_editions e LEFT JOIN conference_deadlines d ON d.conference_edition_id=e.id WHERE e.conference_id=c.id AND e.is_archived=0 ORDER BY CASE WHEN d.deadline_at >= datetime('now') THEN 0 ELSE 1 END, d.deadline_at LIMIT 1) next_edition_id
      FROM conferences c WHERE ${clauses.join(' AND ')} ORDER BY c.updated_at DESC, c.acronym`;
    const result = await c.env.DB.prepare(sql).bind(...values).all<Record<string, unknown>>();
    return c.json({ data: result.results.map(mapConference) });
  } catch (error) { return errorResponse(c, error); }
});

conferenceRoutes.post('/', async (c) => {
  try {
    const parsed = conferenceSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const data = parsed.data;
    const duplicates = await c.env.DB.prepare(`SELECT id, name, acronym, official_url FROM conferences WHERE is_archived=0 AND (lower(acronym)=lower(?) OR lower(official_url)=lower(?) OR lower(name) LIKE lower(?)) LIMIT 5`)
      .bind(data.acronym, data.official_url, `%${data.name}%`).all();
    const now = nowSql();
    const result = await c.env.DB.prepare(`INSERT INTO conferences(name, acronym, official_url, conference_type, frequency, fields, keywords, notes, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(data.name, data.acronym, data.official_url, data.conference_type, data.frequency, JSON.stringify(data.fields), JSON.stringify(data.keywords), data.notes ?? null, now, now).run();
    const created = await c.env.DB.prepare('SELECT * FROM conferences WHERE id=?').bind(result.meta.last_row_id).first<Record<string, unknown>>();
    return c.json({ data: mapConference(created!), warnings: duplicates.results.length ? { duplicates: duplicates.results } : undefined }, 201);
  } catch (error) { return errorResponse(c, error); }
});

conferenceRoutes.get('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const row = await c.env.DB.prepare('SELECT * FROM conferences WHERE id=?').bind(id).first<Record<string, unknown>>();
    if (!row) throw new ApiError(404, 'NOT_FOUND', '学会が見つかりません。');
    const editions = await c.env.DB.prepare(`SELECT e.*, (SELECT MIN(deadline_at) FROM conference_deadlines d WHERE d.conference_edition_id=e.id AND d.deadline_at >= datetime('now')) next_deadline FROM conference_editions e WHERE conference_id=? ORDER BY year DESC`).bind(id).all();
    return c.json({ data: { ...mapConference(row), editions: editions.results } });
  } catch (error) { return errorResponse(c, error); }
});

conferenceRoutes.put('/:id', async (c) => {
  try {
    const id = parseId(c.req.param('id'));
    const parsed = conferenceSchema.safeParse(await c.req.json());
    if (!parsed.success) throw new ApiError(400, 'VALIDATION_ERROR', '入力内容を確認してください。', validationDetails(parsed.error));
    const d = parsed.data;
    const current = await c.env.DB.prepare('SELECT version FROM conferences WHERE id=?').bind(id).first<{ version: number }>();
    if (!current) throw new ApiError(404, 'NOT_FOUND', '学会が見つかりません。');
    if (d.version && d.version !== current.version) throw new ApiError(409, 'UPDATE_CONFLICT', '別の更新が反映されています。画面を再読み込みしてください。');
    await c.env.DB.prepare(`UPDATE conferences SET name=?, acronym=?, official_url=?, conference_type=?, frequency=?, fields=?, keywords=?, notes=?, updated_at=?, version=version+1 WHERE id=?`)
      .bind(d.name, d.acronym, d.official_url, d.conference_type, d.frequency, JSON.stringify(d.fields), JSON.stringify(d.keywords), d.notes ?? null, nowSql(), id).run();
    const row = await c.env.DB.prepare('SELECT * FROM conferences WHERE id=?').bind(id).first<Record<string, unknown>>();
    return c.json({ data: mapConference(row!) });
  } catch (error) { return errorResponse(c, error); }
});

for (const action of ['archive', 'restore'] as const) {
  conferenceRoutes.post(`/:id/${action}`, async (c) => {
    try {
      const id = parseId(c.req.param('id'));
      const archived = action === 'archive';
      const result = await c.env.DB.prepare('UPDATE conferences SET is_archived=?, archived_at=?, updated_at=?, version=version+1 WHERE id=?')
        .bind(archived ? 1 : 0, archived ? nowSql() : null, nowSql(), id).run();
      if (!result.meta.changes) throw new ApiError(404, 'NOT_FOUND', '学会が見つかりません。');
      return c.json({ data: { id, is_archived: archived } });
    } catch (error) { return errorResponse(c, error); }
  });
}
