-- Influence Tracking (Platform E) — user_events_e / temporal_patterns_e / longitudinal_snapshots_e
--
-- ✅ ที่มา: คัดลอก DDL ตรงจากเอกสารทางการ
--    docs/source-materials/KRUTH_ELEMENT_E_Influence_Tracking_v1.docx §8 "SQL Migrations (Platform E เพิ่มเติม)"
--    (เอกสารตั้งชื่อไฟล์ไว้ว่า 013_influence_tracking_e.sql แต่เลข 013 ถูกใช้ไปแล้วกับ card storage
--     จึงใช้ 007b_ เพื่อให้เรียงก่อน 008 ที่ ALTER ตาราง longitudinal_snapshots_e)
--
-- ต่างจาก 000_users_from_platform_d.sql: ไฟล์นี้ "ไม่ได้อนุมาน" — ทุกคอลัมน์/ชนิด มาจากเอกสารต้นฉบับตรงๆ
-- ส่วนที่เพิ่มเองมีแค่: IF NOT EXISTS (idempotent) + DEFAULT gen_random_uuid() ให้ 2 ตารางหลัง
-- (เอกสารเขียน id UUID PRIMARY KEY เฉยๆ ไม่มี default — ใส่ให้ insert ได้สะดวก)
--
-- วัตถุประสงค์ (เอกสาร §7): บันทึกทุกสิ้นเดือน เพื่อตรวจ Element Imbalance trend + Remedy effectiveness
--   สัญญาณที่ใช้: pDCR_W > 7 เพิ่มขึ้น 3 เดือน / remedy_score < 0 ติดกัน 2 เดือน /
--   dream theme เดิม > 3 ครั้ง/เดือน ติดกัน 2 เดือน / ฤดูกาลตรงธาตุที่ขาด

CREATE TABLE IF NOT EXISTS user_events_e (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  logic_used INT,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  day_element TEXT,
  yam_period TEXT,
  season_element TEXT,
  personal_year INT,
  wellbeing_before INT,
  wellbeing_after INT,
  felt_score INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS temporal_patterns_e (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  day_of_week TEXT,
  day_element TEXT,
  yam_period TEXT,
  month INT,
  season_element TEXT,
  personal_year INT,
  avg_felt_score FLOAT,
  avg_wellbeing FLOAT,
  best_element_activity TEXT,
  best_food_element TEXT,
  element_sensitivity JSONB,
  auto_recommendation TEXT,
  sample_count INT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS longitudinal_snapshots_e (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  snapshot_month DATE NOT NULL,
  pdcr_fire FLOAT,
  pdcr_wind FLOAT,
  pdcr_water FLOAT,
  pdcr_earth FLOAT,
  remedy_scores JSONB,
  dream_element_top TEXT,
  who5_avg FLOAT,
  who5_trend TEXT,
  top_positive_element TEXT,
  top_activity TEXT,
  top_food TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_e_user ON user_events_e(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_longitudinal_e_user_month ON longitudinal_snapshots_e(user_id, snapshot_month);
