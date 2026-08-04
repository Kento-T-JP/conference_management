CREATE TRIGGER conference_editions_information_status_insert
BEFORE INSERT ON conference_editions
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
