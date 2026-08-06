PRAGMA defer_foreign_keys = on;
PRAGMA legacy_alter_table = on;

ALTER TABLE conference_editions RENAME TO conference_editions_legacy;

CREATE TABLE conference_editions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conference_id INTEGER NOT NULL REFERENCES conferences(id) ON DELETE RESTRICT,
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  edition_name TEXT CHECK (edition_name IS NULL OR length(edition_name) <= 120),
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
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

INSERT INTO conference_editions (
  id, conference_id, year, edition_name, official_url, country, city,
  attendance_format, start_date, end_date, timezone, information_status,
  is_cancelled, is_archived, notes, created_at, updated_at, archived_at, version
)
SELECT
  id, conference_id, year, NULL, official_url, country, city,
  attendance_format, start_date, end_date, timezone, information_status,
  is_cancelled, is_archived, notes, created_at, updated_at, archived_at, version
FROM conference_editions_legacy;

CREATE TABLE conference_deadlines_new (
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

INSERT INTO conference_deadlines_new SELECT * FROM conference_deadlines;

CREATE TABLE notification_logs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_type TEXT NOT NULL,
  conference_edition_id INTEGER REFERENCES conference_editions(id) ON DELETE SET NULL,
  deadline_id INTEGER REFERENCES conference_deadlines_new(id) ON DELETE SET NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','skipped')),
  response_code INTEGER,
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (notification_type, conference_edition_id, deadline_id, scheduled_date)
);

INSERT INTO notification_logs_new SELECT * FROM notification_logs;

DROP TABLE notification_logs;
DROP TABLE conference_deadlines;
DROP TABLE conference_editions_legacy;
ALTER TABLE conference_deadlines_new RENAME TO conference_deadlines;
ALTER TABLE notification_logs_new RENAME TO notification_logs;

CREATE INDEX idx_editions_active_year ON conference_editions(is_archived, year);
CREATE INDEX idx_editions_conference ON conference_editions(conference_id, year, start_date);
CREATE INDEX idx_editions_status ON conference_editions(information_status) WHERE is_archived = 0;
CREATE INDEX idx_editions_name ON conference_editions(conference_id, edition_name) WHERE edition_name IS NOT NULL;
CREATE INDEX idx_deadlines_edition ON conference_deadlines(conference_edition_id);
CREATE INDEX idx_deadlines_upcoming ON conference_deadlines(deadline_at, notification_enabled);
CREATE INDEX idx_notification_status ON notification_logs(status, scheduled_date);
CREATE UNIQUE INDEX idx_notification_dedupe ON notification_logs(
  notification_type,
  COALESCE(conference_edition_id, -1),
  COALESCE(deadline_id, -1),
  scheduled_date
);

CREATE TRIGGER conference_editions_information_status_insert
BEFORE INSERT ON conference_editions
WHEN NEW.information_status NOT IN ('公式', '未確認')
BEGIN
  SELECT RAISE(ABORT, 'information_status must be 公式 or 未確認');
END;

CREATE TRIGGER conference_deadlines_information_status_insert
BEFORE INSERT ON conference_deadlines
WHEN NEW.information_status NOT IN ('公式', '未確認')
BEGIN
  SELECT RAISE(ABORT, 'information_status must be 公式 or 未確認');
END;

CREATE TRIGGER conference_deadlines_information_status_update
BEFORE UPDATE OF information_status ON conference_deadlines
WHEN NEW.information_status NOT IN ('公式', '未確認')
BEGIN
  SELECT RAISE(ABORT, 'information_status must be 公式 or 未確認');
END;

CREATE TRIGGER conference_editions_information_status_update
BEFORE UPDATE OF information_status ON conference_editions
WHEN NEW.information_status NOT IN ('公式', '未確認')
BEGIN
  SELECT RAISE(ABORT, 'information_status must be 公式 or 未確認');
END;

PRAGMA legacy_alter_table = off;
PRAGMA foreign_key_check;
PRAGMA defer_foreign_keys = off;
PRAGMA optimize;
