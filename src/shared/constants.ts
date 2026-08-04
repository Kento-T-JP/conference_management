export const CONFERENCE_TYPES = ['国際会議', '国内学会', '研究会', 'ワークショップ', 'シンポジウム', 'ジャーナル特集号', 'その他'] as const;
export const FREQUENCIES = ['毎年', '隔年', '不定期', '単発', '不明'] as const;
export const ATTENDANCE_FORMATS = ['現地', 'オンライン', 'ハイブリッド', '未定'] as const;
export const INFORMATION_STATUSES = ['公式', '仮', '予測', '未確認'] as const;
export const DEADLINE_TYPES = ['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop', 'Camera-ready', 'Author Notification', 'Registration', 'Other'] as const;

export const PRIMARY_DEADLINE_TYPES = ['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop'] as const;

export const CALENDAR_EVENT_GROUPS = [
  { id: 'submission', label: '投稿締切', deadlineTypes: ['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop', 'Other'] },
  { id: 'notification', label: '採否通知', deadlineTypes: ['Author Notification'] },
  { id: 'camera_ready', label: '最終稿', deadlineTypes: ['Camera-ready'] },
  { id: 'registration', label: '参加登録', deadlineTypes: ['Registration'] },
  { id: 'conference', label: '開催期間', deadlineTypes: [] }
] as const;

export type ConferenceType = (typeof CONFERENCE_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type AttendanceFormat = (typeof ATTENDANCE_FORMATS)[number];
export type InformationStatus = (typeof INFORMATION_STATUSES)[number];
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
export type CalendarEventGroup = (typeof CALENDAR_EVENT_GROUPS)[number]['id'];

export function calendarGroupForDeadline(type: string): CalendarEventGroup {
  return CALENDAR_EVENT_GROUPS.find((group) => (group.deadlineTypes as readonly string[]).includes(type))?.id ?? 'submission';
}
