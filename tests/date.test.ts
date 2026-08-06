import { describe, expect, it } from 'vitest';
import { daysUntil, deadlineInstant, deadlineLabel, shiftIsoDateToYear, shouldSendReminder } from '../src/shared/date';
import { dateKeyInTimeZone, isValidTimeZone, zonedLocalDateTimeToIso } from '../src/shared/timezone';

describe('締切計算', () => {
  const now = new Date('2027-01-01T00:00:00Z');
  it('AoEをその日のUTC-12の終端として扱う', () => {
    expect(deadlineInstant('2027-01-02', true).toISOString()).toBe('2027-01-03T11:59:59.000Z');
  });
  it('時刻不明の締切を日本時間の日末として扱う', () => {
    expect(deadlineInstant('2027-01-02', false, false).toISOString()).toBe('2027-01-02T14:59:59.000Z');
  });
  it('時刻付き締切を登録元タイムゾーンから変換する', () => {
    expect(deadlineInstant('2027-01-02T23:59', false, true, 'Asia/Tokyo').toISOString()).toBe('2027-01-02T14:59:00.000Z');
  });
  it('表示ラベルを生成する', () => {
    expect(deadlineLabel('2027-01-01T12:00:00Z', now)).toBe('明日');
    expect(deadlineLabel('2026-12-30T12:00:00Z', now)).toBe('締切済み');
  });
  it('14日前、7日前、前日の通知対象を判定する', () => {
    expect(shouldSendReminder('2027-01-08T00:00:00Z', now, [14, 7, 1])).toBe(7);
    expect(shouldSendReminder('2027-01-09T00:00:00Z', now, [14, 7, 1])).toBeNull();
  });
  it('締切までの日数を時間差から切り上げる', () => expect(daysUntil('2027-01-02T00:00:01Z', now)).toBe(2));
});

describe('タイムゾーン変換', () => {
  it('米国東部時刻を夏時間込みでUTCへ変換する', () => {
    expect(zonedLocalDateTimeToIso('2026-09-15T23:59', 'America/New_York')).toBe('2026-09-16T03:59:00.000Z');
  });
  it('日本時間の23時59分を同じ日の締切として扱う', () => {
    const instant = zonedLocalDateTimeToIso('2026-09-15T23:59', 'Asia/Tokyo');
    expect(instant).toBe('2026-09-15T14:59:00.000Z');
    expect(dateKeyInTimeZone(instant!)).toBe('2026-09-15');
  });
  it('変換後の日本の日付を返す', () => {
    expect(dateKeyInTimeZone('2026-09-16T03:59:00.000Z')).toBe('2026-09-16');
  });
  it('IANAタイムゾーンを検証する', () => {
    expect(isValidTimeZone('Asia/Tokyo')).toBe(true);
    expect(isValidTimeZone('UTC+9')).toBe(false);
  });
});

describe('次年度への日付複製', () => {
  it('月日と時刻を保ったまま年だけを更新する', () => {
    expect(shiftIsoDateToYear('2028-11-15T23:59:00', 2029)).toBe('2029-11-15T23:59:00');
  });
  it('うるう日の翌年は2月末日に補正する', () => {
    expect(shiftIsoDateToYear('2028-02-29', 2029)).toBe('2029-02-28');
  });
});
