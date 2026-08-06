export const CONFERENCE_TYPES = ['国際会議', '国内学会', '研究会', 'ワークショップ', 'シンポジウム', 'ジャーナル特集号', 'その他'] as const;
export const FREQUENCIES = ['毎年', '隔年', '不定期', '単発', '不明'] as const;
export const ATTENDANCE_FORMATS = ['現地', 'オンライン', 'ハイブリッド', '未定'] as const;
export const INFORMATION_STATUSES = ['公式', '未確認'] as const;
export const DEADLINE_TYPES = ['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop', 'Camera-ready', 'Author Notification', 'Registration', 'Other'] as const;

export type ConferenceType = (typeof CONFERENCE_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type AttendanceFormat = (typeof ATTENDANCE_FORMATS)[number];
export type InformationStatus = (typeof INFORMATION_STATUSES)[number];
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
export type CalendarEventGroup = 'submission' | 'notification' | 'camera_ready' | 'registration' | 'conference';

type DeadlineTypeDefinition = {
  label: string;
  category: Exclude<CalendarEventGroup, 'conference'>;
  actionable: boolean;
};

export const DEADLINE_TYPE_DEFINITIONS = {
  Abstract: { label: '要旨', category: 'submission', actionable: true },
  'Full Paper': { label: '論文投稿', category: 'submission', actionable: true },
  'Short Paper': { label: '短報', category: 'submission', actionable: true },
  Poster: { label: 'ポスター', category: 'submission', actionable: true },
  Workshop: { label: 'ワークショップ', category: 'submission', actionable: true },
  'Camera-ready': { label: '最終稿', category: 'camera_ready', actionable: true },
  'Author Notification': { label: '採否通知', category: 'notification', actionable: false },
  Registration: { label: '参加登録', category: 'registration', actionable: true },
  Other: { label: 'その他', category: 'submission', actionable: true }
} as const satisfies Record<DeadlineType, DeadlineTypeDefinition>;

export const ACTIONABLE_DEADLINE_TYPES = DEADLINE_TYPES.filter((type) => DEADLINE_TYPE_DEFINITIONS[type].actionable);

export const CALENDAR_EVENT_GROUPS = [
  { id: 'submission', label: '投稿締切', deadlineTypes: DEADLINE_TYPES.filter((type) => DEADLINE_TYPE_DEFINITIONS[type].category === 'submission') },
  { id: 'notification', label: '採否通知', deadlineTypes: DEADLINE_TYPES.filter((type) => DEADLINE_TYPE_DEFINITIONS[type].category === 'notification') },
  { id: 'camera_ready', label: '最終稿', deadlineTypes: DEADLINE_TYPES.filter((type) => DEADLINE_TYPE_DEFINITIONS[type].category === 'camera_ready') },
  { id: 'registration', label: '参加登録', deadlineTypes: DEADLINE_TYPES.filter((type) => DEADLINE_TYPE_DEFINITIONS[type].category === 'registration') },
  { id: 'conference', label: '開催期間', deadlineTypes: [] }
] as const;

export function calendarGroupForDeadline(type: string): CalendarEventGroup {
  return isDeadlineType(type) ? DEADLINE_TYPE_DEFINITIONS[type].category : 'submission';
}

export function deadlineTypeLabel(type: string): string {
  return isDeadlineType(type) ? DEADLINE_TYPE_DEFINITIONS[type].label : type;
}

export function isActionableDeadlineType(type: string): boolean {
  return isDeadlineType(type) && DEADLINE_TYPE_DEFINITIONS[type].actionable;
}

function isDeadlineType(type: string): type is DeadlineType {
  return Object.prototype.hasOwnProperty.call(DEADLINE_TYPE_DEFINITIONS, type);
}
