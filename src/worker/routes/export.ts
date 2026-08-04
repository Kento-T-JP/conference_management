import { Hono } from 'hono';
import type { Env } from '../index';
import { errorResponse } from '../lib/api';

export const exportRoutes = new Hono<{ Bindings: Env }>();

const exports = {
  'conferences.csv': 'SELECT * FROM conferences ORDER BY id',
  'editions.csv': 'SELECT * FROM conference_editions ORDER BY id',
  'deadlines.csv': 'SELECT * FROM conference_deadlines ORDER BY id'
};

for (const [path, sql] of Object.entries(exports)) {
  exportRoutes.get(`/${path}`, async (c) => {
    try {
      const result = await c.env.DB.prepare(sql).all<Record<string, unknown>>();
      const csv = toCsv(result.results);
      c.header('Content-Type', 'text/csv; charset=utf-8');
      c.header('Content-Disposition', `attachment; filename="${path}"`);
      return c.body(`\uFEFF${csv}`);
    } catch (error) { return errorResponse(c, error); }
  });
}

exportRoutes.get('/all.json', async (c) => {
  try {
    const [conferences, editions, deadlines, settings] = await c.env.DB.batch([
      c.env.DB.prepare('SELECT * FROM conferences ORDER BY id'),
      c.env.DB.prepare('SELECT * FROM conference_editions ORDER BY id'),
      c.env.DB.prepare('SELECT * FROM conference_deadlines ORDER BY id'),
      c.env.DB.prepare('SELECT * FROM system_settings ORDER BY key')
    ]);
    c.header('Content-Disposition', 'attachment; filename="conference-management-backup.json"');
    return c.json({ exported_at: new Date().toISOString(), schema_version: 1, conferences: conferences.results, conference_editions: editions.results, conference_deadlines: deadlines.results, system_settings: settings.results });
  } catch (error) { return errorResponse(c, error); }
});

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.join(','), ...rows.map((row) => columns.map((key) => escape(row[key])).join(','))].join('\r\n');
}
