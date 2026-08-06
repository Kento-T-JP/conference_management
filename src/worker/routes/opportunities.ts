import { Hono } from 'hono';
import { ACTIONABLE_DEADLINE_TYPES, CALENDAR_EVENT_GROUPS, calendarGroupForDeadline } from '../../shared/constants';
import { dateKeyInTimeZone, JAPAN_TIME_ZONE, zonedLocalDateTimeToIso } from '../../shared/timezone';
import type { Env } from '../index';
import { errorResponse } from '../lib/api';
import { mapEdition } from '../lib/db';
import { editionDisplayName } from '../../shared/edition';

export const opportunityRoutes = new Hono<{ Bindings: Env }>();

opportunityRoutes.get('/dashboard/opportunities', async (c) => {
  try {
    const [deadlines, upcoming] = await c.env.DB.batch([
      c.env.DB.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.fields, c.conference_type,
        d.id deadline_id, d.deadline_type next_deadline_type, d.deadline_at next_deadline, d.is_aoe, d.has_time, d.information_status deadline_status
        FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id
        WHERE c.is_archived=0 AND e.is_archived=0 AND d.deadline_type IN (${ACTIONABLE_DEADLINE_TYPES.map(() => '?').join(',')})
          AND d.deadline_at >= datetime('now') AND d.deadline_at < datetime('now','+90 days')
        ORDER BY d.deadline_at LIMIT 100`).bind(...ACTIONABLE_DEADLINE_TYPES),
      c.env.DB.prepare(`SELECT e.*, c.name conference_name, c.acronym, c.fields, c.conference_type FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.is_archived=0 AND c.is_archived=0 AND e.start_date IS NOT NULL AND COALESCE(e.end_date,e.start_date) >= date('now') ORDER BY e.start_date LIMIT 10`)
    ]);
    return c.json({ data: {
      deadlines: deadlines.results.map((row) => mapEdition(row as Record<string, unknown>)),
      upcoming_editions: upcoming.results.map((row) => mapEdition(row as Record<string, unknown>))
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
    const deadlines = await c.env.DB.prepare(`SELECT d.id, d.deadline_type, d.title, d.deadline_at, d.has_time, d.timezone, d.is_aoe, d.information_status, e.id edition_id, e.year, e.edition_name, e.start_date, c.id conference_id, c.acronym, c.name conference_name, c.conference_type
      FROM conference_deadlines d JOIN conference_editions e ON e.id=d.conference_edition_id JOIN conferences c ON c.id=e.conference_id
      WHERE e.is_archived=0 AND c.is_archived=0 AND date(d.deadline_at) >= date(?,'-1 day') AND date(d.deadline_at) < date(?,'+1 day')${statusSql}${typeSql}${fieldSql}${conferenceTypeSql}`)
      .bind(start, end, ...statuses, ...deadlineTypes, ...fields.map((field) => `%${field}%`), ...conferenceTypes).all<Record<string, unknown>>();
    const includeConference = eventGroups.includes('conference');
    const editions = includeConference ? await c.env.DB.prepare(`SELECT e.id, e.start_date, e.end_date, e.information_status, e.year, e.edition_name, c.id conference_id, c.acronym, c.name conference_name, c.conference_type FROM conference_editions e JOIN conferences c ON c.id=e.conference_id WHERE e.is_archived=0 AND c.is_archived=0 AND e.start_date IS NOT NULL AND e.start_date < date(?) AND COALESCE(e.end_date,e.start_date) >= date(?)${statuses.length ? ` AND e.information_status IN (${statuses.map(() => '?').join(',')})` : ''}${fieldSql}${conferenceTypeSql}`)
      .bind(end, start, ...statuses, ...fields.map((field) => `%${field}%`), ...conferenceTypes).all<Record<string, unknown>>() : { results: [] };
    const deadlineEvents = deadlines.results.flatMap((row) => {
      const group = calendarGroupForDeadline(String(row.deadline_type));
      const allDay = !row.has_time;
      const sourceTimezone = String(row.timezone || JAPAN_TIME_ZONE);
      const storedStart = String(row.deadline_at);
      const convertedStart = allDay ? storedStart.slice(0, 10) : zonedLocalDateTimeToIso(storedStart, sourceTimezone);
      const startValue = convertedStart ?? storedStart;
      const japanDate = allDay ? startValue.slice(0, 10) : dateKeyInTimeZone(startValue, JAPAN_TIME_ZONE);
      if (japanDate < start || japanDate >= end) return [];
      return [{ id: `deadline-${row.id}`, title: `[${shortGroup(group)}] ${recordEditionName(row)}`, start: startValue, allDay, url: `/editions/${row.edition_id}`, extendedProps: { kind: group, deadlineType: row.deadline_type, status: row.information_status, aoe: Boolean(row.is_aoe), editionId: row.edition_id, conferenceName: row.conference_name, sourceTimezone } }];
    });
    const events = [
      ...deadlineEvents,
      ...editions.results.map((row) => ({ id: `edition-${row.id}`, title: `[開催] ${recordEditionName(row)}`, start: row.start_date, end: addDay(String(row.end_date ?? row.start_date)), allDay: true, url: `/editions/${row.id}`, extendedProps: { kind: 'conference', status: row.information_status, editionId: row.id, conferenceName: row.conference_name } }))
    ];
    return c.json({ data: events });
  } catch (error) { return errorResponse(c, error); }
});

function shortGroup(group: string) {
  return ({ submission: '投稿', notification: '採否', camera_ready: '最終稿', registration: '登録' } as Record<string, string>)[group] ?? group;
}

function recordEditionName(row: Record<string, unknown>): string {
  return editionDisplayName({ acronym: String(row.acronym || ''), year: Number(row.year), edition_name: row.edition_name ? String(row.edition_name) : null, start_date: row.start_date ? String(row.start_date) : null, conference_type: row.conference_type ? String(row.conference_type) : null });
}

function addDay(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}
