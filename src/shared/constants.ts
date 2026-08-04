export const CONFERENCE_TYPES = ['国際会議', '国内学会', '研究会', 'ワークショップ', 'シンポジウム', 'ジャーナル特集号', 'その他'] as const;
export const FREQUENCIES = ['毎年', '隔年', '不定期', '単発', '不明'] as const;
export const ATTENDANCE_FORMATS = ['現地', 'オンライン', 'ハイブリッド', '未定'] as const;
export const INFORMATION_STATUSES = ['公式', '仮', '予測', '未確認'] as const;
export const DEADLINE_TYPES = ['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop', 'Camera-ready', 'Author Notification', 'Registration', 'Other'] as const;

export const PRIMARY_DEADLINE_TYPES = ['Abstract', 'Full Paper', 'Short Paper', 'Poster', 'Workshop'] as const;

export type ConferenceType = (typeof CONFERENCE_TYPES)[number];
export type Frequency = (typeof FREQUENCIES)[number];
export type AttendanceFormat = (typeof ATTENDANCE_FORMATS)[number];
export type InformationStatus = (typeof INFORMATION_STATUSES)[number];
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
