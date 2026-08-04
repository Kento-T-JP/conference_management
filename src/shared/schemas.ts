import { z } from 'zod';
import { ATTENDANCE_FORMATS, CONFERENCE_TYPES, DEADLINE_TYPES, FREQUENCIES, INFORMATION_STATUSES } from './constants';

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const url = z.url('正しいURLを入力してください。').max(2048);
const safeText = (max: number) => z.string().trim().max(max).refine((value) => !/<\/?(?:script|iframe|object|embed)[\s>]/i.test(value), 'HTMLやscriptタグは入力できません。');
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const conferenceSchema = z.object({
  name: safeText(200).min(1, '正式名称は必須です。'),
  acronym: safeText(40).min(1, '略称は必須です。'),
  official_url: url,
  conference_type: z.enum(CONFERENCE_TYPES),
  frequency: z.enum(FREQUENCIES),
  fields: z.array(safeText(50)).max(20).default([]),
  keywords: z.array(safeText(50)).max(30).default([]),
  notes: optionalText(1000),
  version: z.number().int().positive().optional()
});

export const editionSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  official_url: url.nullable().optional(),
  country: optionalText(100),
  city: optionalText(100),
  attendance_format: z.enum(ATTENDANCE_FORMATS).default('未定'),
  start_date: z.string().regex(isoDate, '日付形式が正しくありません。').nullable().optional(),
  end_date: z.string().regex(isoDate, '日付形式が正しくありません。').nullable().optional(),
  timezone: optionalText(80),
  information_status: z.enum(INFORMATION_STATUSES).default('未確認'),
  is_cancelled: z.boolean().default(false),
  notes: optionalText(1000),
  version: z.number().int().positive().optional()
}).superRefine((data, ctx) => {
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({ code: 'custom', path: ['end_date'], message: '開催終了日は開始日以降にしてください。' });
  }
});

export const deadlineSchema = z.object({
  deadline_type: z.enum(DEADLINE_TYPES),
  title: optionalText(120),
  deadline_at: z.iso.datetime({ local: true }).or(z.string().regex(isoDate)),
  has_time: z.boolean().default(true),
  timezone: optionalText(80),
  is_aoe: z.boolean().default(false),
  information_status: z.enum(INFORMATION_STATUSES).default('未確認'),
  notification_enabled: z.boolean().default(true),
  version: z.number().int().positive().optional()
});

export const deadlineBatchSchema = z.object({
  deadlines: z.array(deadlineSchema).min(1, '締切を1件以上入力してください。').max(20, '一度に登録できる締切は20件までです。')
});

export type ConferenceInput = z.infer<typeof conferenceSchema>;
export type EditionInput = z.infer<typeof editionSchema>;
export type DeadlineInput = z.infer<typeof deadlineSchema>;
