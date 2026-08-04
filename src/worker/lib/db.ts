import type { Conference, ConferenceEdition } from '../../shared/types';

export function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function mapConference(row: Record<string, unknown>): Conference {
  return { ...row, fields: parseJsonArray(row.fields), keywords: parseJsonArray(row.keywords) } as unknown as Conference;
}

export function mapEdition(row: Record<string, unknown>): ConferenceEdition {
  return { ...row, fields: parseJsonArray(row.fields) } as unknown as ConferenceEdition;
}

export async function firstOrNull<T>(statement: D1PreparedStatement): Promise<T | null> {
  return (await statement.first<T>()) ?? null;
}
