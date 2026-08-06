import { describe, expect, it } from 'vitest';
import { conferenceSchema, deadlineBatchSchema, deadlineSchema, editionSchema } from '../src/shared/schemas';

describe('入力バリデーション', () => {
  it('正常な学会を受け付ける', () => expect(conferenceSchema.safeParse({ name: 'Example Conference', acronym: 'EC', official_url: 'https://example.com', conference_type: '国際会議', frequency: '毎年' }).success).toBe(true));
  it('不正URLとscriptタグを拒否する', () => {
    expect(conferenceSchema.safeParse({ name: '<script>alert(1)</script>', acronym: 'EC', official_url: 'invalid', conference_type: '国際会議', frequency: '毎年' }).success).toBe(false);
  });
  it('開催終了日が開始日より前なら拒否する', () => expect(editionSchema.safeParse({ year: 2027, start_date: '2027-10-10', end_date: '2027-10-09' }).success).toBe(false));
  it('開催回名は任意で120文字まで受け付ける', () => {
    expect(editionSchema.safeParse({ year: 2027, edition_name: '11月研究会' }).success).toBe(true);
    expect(editionSchema.safeParse({ year: 2027, edition_name: 'a'.repeat(121) }).success).toBe(false);
  });
  it('情報状態は公式または未確認だけを受け付ける', () => {
    expect(editionSchema.safeParse({ year: 2027, information_status: '公式' }).success).toBe(true);
    expect(editionSchema.safeParse({ year: 2027, information_status: '仮' }).success).toBe(false);
    expect(deadlineSchema.safeParse({ deadline_type: 'Full Paper', deadline_at: '2027-01-01', information_status: '予測' }).success).toBe(false);
  });
  it('不正なenum値を拒否する', () => expect(deadlineSchema.safeParse({ deadline_type: 'Unknown', deadline_at: '2027-01-01' }).success).toBe(false));
  it('その他の予定には表示名を必須とする', () => {
    expect(deadlineSchema.safeParse({ deadline_type: 'Other', deadline_at: '2027-01-01' }).success).toBe(false);
    expect(deadlineSchema.safeParse({ deadline_type: 'Other', title: '発表申込締切', deadline_at: '2027-01-01' }).success).toBe(true);
  });
  it('AoE締切を受け付ける', () => expect(deadlineSchema.safeParse({ deadline_type: 'Full Paper', deadline_at: '2027-01-01', is_aoe: true, timezone: 'AoE' }).success).toBe(true));
  it('時刻付き締切には正しいタイムゾーンを要求する', () => {
    expect(deadlineSchema.safeParse({ deadline_type: 'Full Paper', deadline_at: '2027-01-01T23:59', has_time: true }).success).toBe(false);
    expect(deadlineSchema.safeParse({ deadline_type: 'Full Paper', deadline_at: '2027-01-01T23:59', has_time: true, timezone: 'Asia/Tokyo' }).success).toBe(true);
  });
  it('複数の締切をまとめて受け付ける', () => expect(deadlineBatchSchema.safeParse({ deadlines: [
    { deadline_type: 'Full Paper', deadline_at: '2027-01-01' },
    { deadline_type: 'Author Notification', deadline_at: '2027-02-01' }
  ] }).success).toBe(true));
  it('空の締切一括登録を拒否する', () => expect(deadlineBatchSchema.safeParse({ deadlines: [] }).success).toBe(false));
});
