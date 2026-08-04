export const JAPAN_TIME_ZONE = 'Asia/Tokyo';

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

/** Converts an ISO-like local wall time plus an IANA zone into an absolute instant. */
export function zonedLocalDateTimeToDate(value: string, timeZone: string): Date | null {
  const match = value.match(LOCAL_DATE_TIME);
  if (!match || !isValidTimeZone(timeZone)) return null;
  const [, year, month, day, hour, minute, second = '00'] = match;
  const desired = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  let instant = desired - offsetAt(new Date(desired), timeZone);
  instant = desired - offsetAt(new Date(instant), timeZone);
  const result = new Date(instant);
  return wallParts(result, timeZone) === `${year}-${month}-${day}T${hour}:${minute}:${second}` ? result : null;
}

export function zonedLocalDateTimeToIso(value: string, timeZone: string): string | null {
  return zonedLocalDateTimeToDate(value, timeZone)?.toISOString() ?? null;
}

export function dateKeyInTimeZone(value: string | Date, timeZone = JAPAN_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(typeof value === 'string' ? new Date(value) : value);
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`;
}

function offsetAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(instant);
  const representedAsUtc = Date.UTC(
    Number(part(parts, 'year')),
    Number(part(parts, 'month')) - 1,
    Number(part(parts, 'day')),
    Number(part(parts, 'hour')),
    Number(part(parts, 'minute')),
    Number(part(parts, 'second'))
  );
  return representedAsUtc - instant.getTime();
}

function wallParts(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(instant);
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}T${part(parts, 'hour')}:${part(parts, 'minute')}:${part(parts, 'second')}`;
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? '';
}
