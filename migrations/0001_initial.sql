PRAGMA foreign_keys = ON;

CREATE TABLE conferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  acronym TEXT NOT NULL COLLATE NOCASE,
  official_url TEXT NOT NULL,
  conference_type TEXT NOT NULL CHECK (conference_type IN ('国際会議','国内学会','研究会','ワークショップ','シンポジウム','ジャーナル特集号','その他')),
  frequency TEXT NOT NULL CHECK (frequency IN ('毎年','隔年','不定期','単発','不明')),
  fields TEXT NOT NULL DEFAULT '[]',
  keywords TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE conference_editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE RESTRICT,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  official_url TEXT,
  country TEXT,
  city TEXT,
  attendance_format TEXT NOT NULL DEFAULT '未定' CHECK (attendance_format IN ('現地','オンライン','ハイブリッド','未定')),
  start_date TEXT,
  end_date TEXT,
  timezone TEXT,
  information_status TEXT NOT NULL DEFAULT '未確認' CHECK (information_status IN ('公式','仮','予測','未確認')),
  is_cancelled INTEGER NOT NULL DEFAULT 0 CHECK (is_cancelled IN (0,1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE (conference_id, year),
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE conference_deadlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conference_edition_id INTEGER NOT NULL REFERENCES conference_editions(id) ON DELETE CASCADE,
  deadline_type TEXT NOT NULL CHECK (deadline_type IN ('Abstract','Full Paper','Short Paper','Poster','Workshop','Camera-ready','Author Notification','Registration','Other')),
  title TEXT,
  deadline_at TEXT NOT NULL,
  has_time INTEGER NOT NULL DEFAULT 1 CHECK (has_time IN (0,1)),
  timezone TEXT,
  is_aoe INTEGER NOT NULL DEFAULT 0 CHECK (is_aoe IN (0,1)),
  information_status TEXT NOT NULL DEFAULT '未確認' CHECK (information_status IN ('公式','仮','予測','未確認')),
  previous_deadline_at TEXT,
  is_extended INTEGER NOT NULL DEFAULT 0 CHECK (is_extended IN (0,1)),
  notification_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notification_enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_type TEXT NOT NULL,
  conference_edition_id INTEGER REFERENCES conference_editions(id) ON DELETE SET NULL,
  deadline_id INTEGER REFERENCES conference_deadlines(id) ON DELETE SET NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','skipped')),
  response_code INTEGER,
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (notification_type, conference_edition_id, deadline_id, scheduled_date)
);

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conferences_active_type ON conferences(is_archived, conference_type);
CREATE INDEX idx_conferences_frequency ON conferences(frequency) WHERE is_archived = 0;
CREATE INDEX idx_editions_active_year ON conference_editions(is_archived, year);
CREATE INDEX idx_editions_conference ON conference_editions(conference_id, year);
CREATE INDEX idx_editions_status ON conference_editions(information_status) WHERE is_archived = 0;
CREATE INDEX idx_deadlines_edition ON conference_deadlines(conference_edition_id);
CREATE INDEX idx_deadlines_upcoming ON conference_deadlines(deadline_at, notification_enabled);
CREATE INDEX idx_notification_status ON notification_logs(status, scheduled_date);
CREATE UNIQUE INDEX idx_notification_dedupe ON notification_logs(
  notification_type,
  COALESCE(conference_edition_id, -1),
  COALESCE(deadline_id, -1),
  scheduled_date
);

INSERT INTO system_settings(key, value) VALUES
  ('reminder_days', '[14,7,1]'),
  ('weekly_enabled', 'true');

PRAGMA optimize;
