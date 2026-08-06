import { zonedLocalDateTimeToDate } from './timezone';

const DAY_MS = 86_400_000;

export function deadlineInstant(deadlineAt: string, isAoe = false, hasTime = true, timeZone?: string | null): Date {
  if (isAoe) {
    const date = deadlineAt.slice(0, 10);
    return new Date(`${date}T23:59:59-12:00`);
  }
  if (!hasTime && /^\d{4}-\d{2}-\d{2}$/.test(deadlineAt)) {
    return new Date(`${deadlineAt}T23:59:59+09:00`);
  }
  if (timeZone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(deadlineAt)) {
    const zoned = zonedLocalDateTimeToDate(deadlineAt, timeZone);
    if (zoned) return zoned;
  }
  return new Date(deadlineAt);
}

export function daysUntil(deadlineAt: string, now = new Date(), isAoe = false, hasTime = true, timeZone?: string | null): number {
  return Math.ceil((deadlineInstant(deadlineAt, isAoe, hasTime, timeZone).getTime() - now.getTime()) / DAY_MS);
}

export function deadlineLabel(deadlineAt: string, now = new Date(), isAoe = false, hasTime = true, timeZone?: string | null): string {
  const days = daysUntil(deadlineAt, now, isAoe, hasTime, timeZone);
  if (days < 0) return '締切済み';
  if (days === 0) return '本日';
  if (days === 1) return '明日';
  return `あと${days}日`;
}

export function shouldSendReminder(deadlineAt: string, now: Date, days: readonly number[], isAoe = false, hasTime = true, timeZone?: string | null): number | null {
  const remaining = daysUntil(deadlineAt, now, isAoe, hasTime, timeZone);
  return days.includes(remaining) ? remaining : null;
}

export function shiftIsoDateToYear(value: string, year: number): string {
  const match = value.match(/^\d{4}-(\d{2})-(\d{2})(.*)$/);
  if (!match) return value;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${match[1]}-${String(Math.min(day, lastDay)).padStart(2, '0')}${match[3]}`;
}
