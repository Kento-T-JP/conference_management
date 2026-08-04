import { Hono } from 'hono';
import { CALENDAR_EVENT_GROUPS, calendarGroupForDeadline } from '../../shared/constants';
import type { Env } from '../index';
import { errorResponse } from '../lib/api';
import { mapConference, mapEdition } from '../lib/db';

export const opportunityRoutes = new Hono<{ Bindings: Env }>();

opportunityRoutes.get('/dashboard/opportunities', async (c) => {
  try {
    const [deadlines, upcoming, recent, recurring, unconfirmed] = await c.env.DB.batch([
      c.env.DB.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.fields, c.conference_type,
        d.id deadline_id, d.deadline_type next_deadline_type, d.deadline_at next_deadline, d.is_aoe, d.has_time, d.information_status deadline_status
        FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id
        WHERE c.is_archived=0 AND e.is_archived=0 AND d.deadline_at >= datetime('now') AND d.deadline_at < datetime('now','+90 days')
        ORDER BY d.deadline_at LIMIT 100`),
      c.env.DB.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.fields, c.conference_type FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.is_archived=0 AND c.is_archived=0 AND e.end_date >= date('now') ORDER BY e.start_date LIMIT 10`),
      c.env.DB.prepare(`SELECT c.* FROM conferences c WHERE c.is_archived=0 ORDER BY c.updated_at DESC LIMIT 8`),
      c.env.DB.prepare(`SELECT c.*, MAX(e.year) last_year FROM conferences c JOIN conference_editions e ON e.conference_id=c.id AND e.is_archived=0 WHERE c.is_archived=0 AND c.frequency IN ('毎年','隔年') GROUP BY c.id`),
      c.env.DB.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.fields, c.conference_type FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.is_archived=0 AND c.is_archived=0 AND e.information_status IN ('予測','未確認') ORDER BY e.year, c.acronym LIMIT 20`)
    ]);
    const missing = (recurring.results as Record<string, unknown>[]).flatMap((row) => {
      const expected = Number(row.last_year) + (row.frequency === '隔年' ? 2 : 1);
      return expected <= new Date().getUTCFullYear() + 2 ? [{ ...mapConference(row), expected_year: expected }] : [];
    });
    if (missing.length) {
      const ids = missing.map((item) => item.id);
      const existing = await c.env.DB.prepare(`SELECT conference_id, year FROM conference_editions WHERE conference_id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ conference_id: number; year: number }>();
      const keys = new Set(existing.results.map((row) => `${row.conference_id}:${row.year}`));
      for (let i = missing.length - 1; i >= 0; i -= 1) if (keys.has(`${missing[i].id}:${missing[i].expected_year}`)) missing.splice(i, 1);
    }
    return c.json({ data: {
      deadlines: deadlines.results.map((row) => mapEdition(row as Record<string, unknown>)),
      upcoming_editions: upcoming.results.map((row) => mapEdition(row as Record<string, unknown>)),
      recently_updated: recent.results.map((row) => mapConference(row as Record<string, unknown>)),
      missing_next_editions: missing,
      unconfirmed: unconfirmed.results.map((row) => mapEdition(row as Record<string, unknown>))
    } });
  } catch (error) { return errorResponse(c, error); }
});

opportunityRoutes.get('/calendar/events', async (c) => {
  try {
    const start = c.req.query('start') ?? new Date().toISOString().slice(0, 10);
    const end = c.req.query('end') ?? `${new Date().getUTCFullYear() + 1}-12-31`;
    const statuses = (c.req.query('information_status') ?? '').split(',').filter(Boolean);
    const requestedGroups = (c.req.query('event_categories') ?? CALENDAR_EVENT_GROUPS.map((group) => group.id).join(',')).split(',');
    const eventGroups = requestedGroups.filter((value) => CALENDAR_EVENT_GROUPS.some((group) => group.id === value));
    const fields = (c.req.query('fields') ?? '').split(',').filter(Boolean);
    const conferenceTypes = (c.req.query('conference_types') ?? '').split(',').filter(Boolean);
    const statusSql = statuses.length ? ` AND d.information_status IN (${statuses.map(() => '?').join(',')})` : '';
    const deadlineTypes = CALENDAR_EVENT_GROUPS.filter((group) => eventGroups.includes(group.id)).flatMap((group) => [...group.deadlineTypes]);
    const typeSql = deadlineTypes.length ? ` AND d.deadline_type IN (${deadlineTypes.map(() => '?').join(',')})` : ' AND 1=0';
    const fieldSql = fields.length ? ` AND (${fields.map(() => 'c.fields LIKE ?').join(' OR ')})` : '';
    const conferenceTypeSql = conferenceTypes.length ? ` AND c.conference_type IN (${conferenceTypes.map(() => '?').join(',')})` : '';
    const deadlines = await c.env.DB.prepare(`SELECT d.id, d.deadline_type, d.title, d.deadline_at, d.has_time, d.is_aoe, d.information_status, e.id edition_id, e.year, c.acronym
      FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id
      WHERE e.is_archived=0 AND c.is_archived=0 AND date(d.deadline_at) >= date(?) AND date(d.deadline_at) < date(?)${statusSql}${typeSql}${fieldSql}${conferenceTypeSql}`)
      .bind(start, end, ...statuses, ...deadlineTypes, ...fields.map((field) => `%${field}%`), ...conferenceTypes).all<Record<string, unknown>>();
    const includeConference = eventGroups.includes('conference');
    const editions = includeConference ? await c.env.DB.prepare(`SELECT e.id, e.start_date, e.end_date, e.information_status, e.year, c.acronym FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.is_archived=0 AND c.is_archived=0 AND e.start_date IS NOT NULL AND e.start_date < date(?) AND COALESCE(e.end_date,e.start_date) >= date(?)${statuses.length ? ` AND e.information_status IN (${statuses.map(() => '?').join(',')})` : ''}${fieldSql}${conferenceTypeSql}`)
      .bind(end, start, ...statuses, ...fields.map((field) => `%${field}%`), ...conferenceTypes).all<Record<string, unknown>>() : { results: [] };
    const events = [
      ...deadlines.results.map((row) => { const group = calendarGroupForDeadline(String(row.deadline_type)); return { id: `deadline-${row.id}`, title: `[${shortGroup(group)}] ${row.acronym}`, start: row.deadline_at, allDay: !row.has_time, url: `/editions/${row.edition_id}`, extendedProps: { kind: group, deadlineType: row.deadline_type, status: row.information_status, aoe: Boolean(row.is_aoe) } }; }),
      ...editions.results.map((row) => ({ id: `edition-${row.id}`, title: `[開催] ${row.acronym} ${row.year}`, start: row.start_date, end: addDay(String(row.end_date ?? row.start_date)), allDay: true, url: `/editions/${row.id}`, extendedProps: { kind: 'conference', status: row.information_status } }))
    ];
    return c.json({ data: events });
  } catch (error) { return errorResponse(c, error); }
});

function shortGroup(group: string) {
  return ({ submission: '投稿', notification: '採否', camera_ready: '最終稿', registration: '登録' } as Record<string, string>)[group] ?? group;
}

function addDay(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
