INSERT INTO conferences (id, name, acronym, official_url, conference_type, frequency, fields, keywords, notes) VALUES
  (1, 'IEEE International Conference on Bioinformatics and Biomedicine', 'IEEE BIBM', 'https://example.com/bibm', '国際会議', '毎年', '["バイオインフォマティクス","医療情報"]', '["BIBM","biomedicine"]', '動作確認用のサンプルデータです。'),
  (2, 'IEEE International Conference on Industrial Engineering and Engineering Management', 'IEEE IEEM', 'https://example.com/ieem', '国際会議', '毎年', '["経営工学"]', '["IEEM","industrial engineering"]', '動作確認用のサンプルデータです。'),
  (3, 'IEEE International Conference on Collaboration and Internet Computing', 'IEEE CIC', 'https://example.com/cic', '国際会議', '毎年', '["情報科学","インターネット"]', '["CIC","collaboration"]', '動作確認用のサンプルデータです。'),
  (4, 'Intelligent Systems for Molecular Biology', 'ISMB', 'https://example.com/ismb', '国際会議', '毎年', '["バイオインフォマティクス"]', '["ISMB","molecular biology"]', '動作確認用のサンプルデータです。'),
  (5, 'Research in Computational Molecular Biology', 'RECOMB', 'https://example.com/recomb', '国際会議', '毎年', '["計算生物学"]', '["RECOMB","computational biology"]', '動作確認用のサンプルデータです。');

INSERT INTO conference_editions (id, conference_id, year, official_url, country, city, attendance_format, start_date, end_date, timezone, information_status, notes) VALUES
  (1, 1, 2027, 'https://example.com/bibm/2027', '日本', '東京', 'ハイブリッド', '2027-12-08', '2027-12-11', 'Asia/Tokyo', '未確認', 'サンプル日程です。'),
  (2, 2, 2027, 'https://example.com/ieem/2027', 'シンガポール', 'シンガポール', '現地', '2027-12-12', '2027-12-15', 'Asia/Singapore', '仮', 'サンプル日程です。'),
  (3, 4, 2027, 'https://example.com/ismb/2027', 'カナダ', 'モントリオール', '現地', '2027-07-18', '2027-07-22', 'America/Toronto', '予測', 'サンプル日程です。');

INSERT INTO conference_deadlines (conference_edition_id, deadline_type, title, deadline_at, has_time, timezone, is_aoe, information_status, notification_enabled) VALUES
  (1, 'Full Paper', NULL, '2027-07-31T23:59:59-12:00', 1, 'AoE', 1, '未確認', 1),
  (1, 'Author Notification', NULL, '2027-09-20', 0, 'Asia/Tokyo', 0, '未確認', 0),
  (2, 'Full Paper', NULL, '2027-06-15T23:59:00+08:00', 1, 'Asia/Singapore', 0, '仮', 1),
  (3, 'Abstract', NULL, '2027-01-20T23:59:59-12:00', 1, 'AoE', 1, '予測', 1),
  (3, 'Full Paper', NULL, '2027-01-27T23:59:59-12:00', 1, 'AoE', 1, '予測', 1);
