import { describe, expect, it } from 'vitest';
import { calendarGroupForDeadline, deadlineTypeLabel, isActionableDeadlineType } from '../src/shared/constants';

describe('カレンダー分類', () => {
  it.each(['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop', 'Other'])('%sを投稿締切にまとめる', (type) => {
    expect(calendarGroupForDeadline(type)).toBe('submission');
  });

  it('用途の異なる日程を個別の分類にする', () => {
    expect(calendarGroupForDeadline('Author Notification')).toBe('notification');
    expect(calendarGroupForDeadline('Camera-ready')).toBe('camera_ready');
    expect(calendarGroupForDeadline('Registration')).toBe('registration');
  });

  it('操作が必要な締切と採否通知を区別する', () => {
    expect(isActionableDeadlineType('Full Paper')).toBe(true);
    expect(isActionableDeadlineType('Registration')).toBe(true);
    expect(isActionableDeadlineType('Author Notification')).toBe(false);
    expect(deadlineTypeLabel('Author Notification')).toBe('採否通知');
  });
});
