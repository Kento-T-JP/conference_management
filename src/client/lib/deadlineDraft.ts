export type DeadlineDraft = {
  deadline_type: string;
  title: string;
  date: string;
  time: string;
  timezone: string;
  is_aoe: boolean;
  information_status: string;
  notification_enabled: boolean;
  version?: number;
};

const labels: Record<string, string> = {
  Abstract: '要旨',
  'Full Paper': '論文',
  'Short Paper': '短報',
  Poster: 'ポスター',
  Workshop: 'ワークショップ',
  'Camera-ready': '最終稿',
  'Author Notification': '採否通知',
  Registration: '参加登録',
  Other: 'その他'
};

export function deadlineName(type: string) { return labels[type] ?? type; }

export function deadlineLabel(type: string) { return `${deadlineName(type)}${type === 'Other' ? '' : `（${type}）`}`; }

export function createDeadlineDraft(deadlineType = 'Full Paper'): DeadlineDraft {
  return { deadline_type: deadlineType, title: '', date: '', time: '', timezone: '', is_aoe: false, information_status: '未確認', notification_enabled: true };
}

export function deadlineToDraft(deadline: ConferenceDeadline): DeadlineDraft {
  return {
    deadline_type: deadline.deadline_type,
    title: deadline.title ?? '',
    date: deadline.deadline_at.slice(0, 10),
    time: deadline.has_time ? deadline.deadline_at.slice(11, 16) : '',
    timezone: deadline.is_aoe ? 'AoE' : deadline.timezone ?? '',
    is_aoe: Boolean(deadline.is_aoe),
    information_status: deadline.information_status,
    notification_enabled: Boolean(deadline.notification_enabled),
    version: deadline.version
  };
}

export function deadlinePayload(draft: DeadlineDraft) {
  return {
    deadline_type: draft.deadline_type,
    title: draft.title || null,
    deadline_at: draft.time && !draft.is_aoe ? `${draft.date}T${draft.time}` : draft.date,
    has_time: Boolean(draft.time) && !draft.is_aoe,
    timezone: draft.is_aoe ? 'AoE' : draft.timezone || null,
    is_aoe: draft.is_aoe,
    information_status: draft.information_status,
    notification_enabled: draft.notification_enabled,
    version: draft.version
  };
}
import type { ConferenceDeadline } from '../../shared/types';
