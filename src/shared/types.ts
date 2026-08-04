import type { AttendanceFormat, ConferenceType, DeadlineType, Frequency, InformationStatus } from './constants';

export interface Conference {
  id: number;
  name: string;
  acronym: string;
  official_url: string;
  conference_type: ConferenceType;
  frequency: Frequency;
  fields: string[];
  keywords: string[];
  notes: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version: number;
  latest_year?: number | null;
  next_deadline?: string | null;
  next_edition_id?: number | null;
  information_status?: InformationStatus | null;
}

export interface ConferenceEdition {
  id: number;
  conference_id: number;
  year: number;
  official_url: string | null;
  country: string | null;
  city: string | null;
  attendance_format: AttendanceFormat;
  start_date: string | null;
  end_date: string | null;
  timezone: string | null;
  information_status: InformationStatus;
  is_cancelled: number;
  is_archived: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  version: number;
  conference_name?: string;
  acronym?: string;
  conference_official_url?: string;
  conference_type?: ConferenceType;
  fields?: string[];
  next_deadline?: string | null;
  next_deadline_type?: DeadlineType | null;
  deadlines?: ConferenceDeadline[];
}

export interface ConferenceDeadline {
  id: number;
  conference_edition_id: number;
  deadline_type: DeadlineType;
  title: string | null;
  deadline_at: string;
  has_time: number;
  timezone: string | null;
  is_aoe: number;
  information_status: InformationStatus;
  previous_deadline_at: string | null;
  is_extended: number;
  notification_enabled: number;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string> };
}

export interface DashboardData {
  deadlines: ConferenceEdition[];
  upcoming_editions: ConferenceEdition[];
  recently_updated: Conference[];
  missing_next_editions: Array<Conference & { expected_year: number }>;
  unconfirmed: ConferenceEdition[];
}
