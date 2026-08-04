UPDATE conference_editions
SET information_status = '未確認', updated_at = CURRENT_TIMESTAMP
WHERE information_status NOT IN ('公式', '未確認');

UPDATE conference_deadlines
SET information_status = '未確認', updated_at = CURRENT_TIMESTAMP
WHERE information_status NOT IN ('公式', '未確認');

PRAGMA optimize;
