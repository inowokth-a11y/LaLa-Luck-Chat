-- ========================================================================
-- KRUTH ELEMENT — รวม migration ทั้งหมด (bundle สำหรับ paste ใน Supabase SQL Editor)
-- สร้างอัตโนมัติจาก supabase/migrations/*.sql — ห้ามแก้ไฟล์นี้ตรงๆ (แก้ที่ไฟล์ต้นทาง)
-- ⚠️ รันไฟล์นี้ 'หลัง' สร้าง bucket master_energy_cards (public) แล้วเท่านั้น (migration 013 ตั้ง policy)
-- ========================================================================

-- ==================== 000_users_from_platform_d.sql ====================

-- ตาราง users (ฐานร่วม Platform D ↔ E) — ต้องรันก่อน 002-008/010 ที่มี FK REFERENCES users(id)
--
-- ⚠️ ที่มาของ schema นี้ (โปร่งใสตามหลัก CLAUDE.md — บอกเสมอว่าอะไร verify แล้ว/อะไรอนุมาน):
--   ✅ ชื่อคอลัมน์  = ของจริง จาก export ตาราง users ของ Platform D (41 คอลัมน์)
--   ✅ id เป็น TEXT = ยืนยันจาก FK ทั้งสองแพลตฟอร์ม (REFERENCES users(id) เป็น TEXT ทุกจุด)
--                     และรูปแบบ dvjId จริง (เช่น 'DEM-XXXX...')
--   ✅ occupation/special_skills/interests = จาก migration 034 ของ Platform D
--   ✅ line_user_id UNIQUE = จาก migration 031 ของ Platform D
--   ⚠️ ชนิดข้อมูล (type) = อนุมานจากค่าจริง 90 แถว ไม่ใช่จาก DDL ต้นฉบับ
--      (ไฟล์ 001 ของ Platform D ที่สร้างตารางนี้ "หายไป" — ชุด migration ของ D เริ่มที่ 002)
--      จุดที่ยังไม่ชัด: screen_width/screen_height (ข้อมูลว่างทั้ง 90 แถว เลยเดาเป็น INTEGER),
--      dob เก็บเป็น TEXT ตามข้อมูลจริง (ไม่ใช่ DATE)
--   ถ้าภายหลังได้ DDL ต้นฉบับจาก Platform D ควรเทียบและปรับให้ตรง
--
-- 🔒 ไฟล์นี้สร้าง "โครงตารางเปล่า" เท่านั้น ไม่มีการคัดลอกข้อมูลผู้ใช้จาก Platform D
--    (ตามกฎ data/sensitive/README.md — ห้ามข้อมูลหลุดข้าม D ↔ E)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- dvjId เช่น 'DEM-XXXXXXXX'

  -- ข้อมูลบุคคลพื้นฐาน
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  dob TEXT,                            -- เก็บเป็น TEXT ตามข้อมูลจริงของ D
  age INTEGER,
  birth_province TEXT,
  day_of_week TEXT,

  -- ธาตุ/โหราศาสตร์ (ใช้ร่วมกับ Platform E)
  thai_element TEXT,
  chinese_element TEXT,
  zodiac_sign TEXT,
  zodiac_element TEXT,
  zodiac_animal TEXT,
  indian_dosha TEXT,

  -- เปอร์เซ็นต์ธาตุจากชื่อ (Handoff §4.3)
  name_fire_pct INTEGER,
  name_earth_pct INTEGER,
  name_wind_pct INTEGER,
  name_water_pct INTEGER,

  -- เลขศาสตร์
  num_name INTEGER,
  num_surname INTEGER,
  num_birth INTEGER,
  num_fullname INTEGER,
  num_life INTEGER,                    -- เลขกำลังชีวิต

  -- ข้อมูลโปรไฟล์เพิ่มเติม (Platform D migration 034)
  occupation TEXT,
  special_skills TEXT,
  interests TEXT,

  -- ช่องทาง/แหล่งที่มา
  line_user_id TEXT UNIQUE,            -- Platform D migration 031
  referrer_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- เทเลเมทรีอุปกรณ์
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  ip_country TEXT,

  -- สถานะ/ความยินยอม
  pdpa_consent BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  is_super_admin BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

COMMENT ON TABLE users IS
  'ฐานผู้ใช้ร่วม Platform D (KRUTH MIND) ↔ E (KRUTH ELEMENT). schema ประกอบจาก export จริงของ D + migration 031/034 — type อนุมานจากข้อมูล ไม่ใช่ DDL ต้นฉบับ (ไฟล์ 001 ของ D หายไป). ⚠️ ฟิลด์คลินิกของ D อยู่ในตาราง results/category_flags ห้ามนำเข้ามาฝั่ง E (ดู CLAUDE.md §7)';

-- ==================== 001_chat_sessions.sql ====================

-- Chat Memory (Platform D + E ร่วมกัน)
-- อ้างอิง: KRUTH Platform Implementation Handbook §3.3
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'D' | 'E'
  line_user_id TEXT NOT NULL,
  dvj_id TEXT, -- เชื่อมกับ DEMM profile
  context JSONB DEFAULT '[]', -- 10 messages ล่าสุด (Rolling Window)
  summary TEXT DEFAULT '', -- Auto-summary ทุก 20 messages / 7 วัน
  state JSONB DEFAULT '{}', -- assessment progress, logic state
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_line_user ON chat_sessions(line_user_id);

-- ==================== 002_organizations.sql ====================

-- Organization system (Platform D)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code TEXT UNIQUE NOT NULL,
  admin_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  dvj_id TEXT REFERENCES users(id),
  line_user_id TEXT,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 003_subscriptions.sql ====================

-- Payment / Subscription (Omise)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  platform TEXT, -- 'D' | 'E'
  tier TEXT, -- 'free' | 'premium' | 'lifetime' | 'team' | 'org'
  status TEXT, -- 'active' | 'cancelled' | 'expired'
  omise_customer_id TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  platform TEXT,
  logic_type TEXT,
  usage_date DATE DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1
);

-- ==================== 004_surveys_notifications.sql ====================

-- Survey system + notification preferences
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  survey_type TEXT, -- 'monthly_wellbeing' | 'quarterly_ocean' | 'feedback'
  platform TEXT,
  responses JSONB,
  triggered_by TEXT, -- 'scheduled' | 'event' | 'user_request'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- เพิ่มใน users table ที่มีอยู่แล้ว (สมมติว่ามี id, full_name, dob, day_of_week,
-- thai_element, chinese_element, name_*_pct, num_life อยู่แล้วจาก Platform D setup)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications JSONB DEFAULT '{
  "daily_horoscope": false,
  "weekly_summary": false,
  "monthly_prediction": false,
  "birthday_message": true,
  "survey_reminder": true,
  "flag_alert": true
}'::jsonb;

-- ==================== 005_entity_relationship_graphs.sql ====================

-- Logic 20: Multi-Entity Compatibility Graph
CREATE TABLE IF NOT EXISTS entity_relationship_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL, -- 'person' | 'house' | 'car' | 'company' | 'colleague'
  entity_name TEXT,
  entity_element TEXT, -- Wood/Fire/Earth/Metal/Water (English keys, ดู kruth_element_engine)
  shared_context BOOLEAN DEFAULT false, -- same_house / same_workplace amplifier
  wu_xing_raw_score INT,
  wu_xing_final_score INT,
  productive_clash BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_graphs_user ON entity_relationship_graphs(user_id);

-- ==================== 006_org_naming_sessions.sql ====================

-- Logic 19: Naming & Branding Generator
CREATE TABLE IF NOT EXISTS org_naming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  industry_type TEXT,
  founder_element TEXT,
  aggregate_element TEXT,
  candidate_names JSONB, -- [{name, name_element, score}, ...]
  recommended_element TEXT,
  logo_style_tags JSONB, -- ["โค้งอินทรีย์","เขียว"] เป็นต้น
  logo_prompts JSONB, -- ข้อความ prompt เท่านั้น (ไม่มี image-gen tool ในระบบนี้)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 007_oracle_binding_sessions.sql ====================

-- Logic 21: Contextual Oracle Binding
-- ⚠️ Stateless โดยออกแบบ — ตารางนี้ไม่ถูกเขียนอัตโนมัติทุกครั้งที่มีการเสี่ยงทาย
-- เตรียมไว้เฉพาะฟีเจอร์ "บันทึกผลย้อนหลัง" แบบ opt-in ในอนาคตเท่านั้น
CREATE TABLE IF NOT EXISTS oracle_binding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  oracle_digits TEXT, -- '00'-'99'
  user_question TEXT,
  bound_layers JSONB, -- [{type, element, source}, ...]
  archetype_card_id TEXT,
  relations JSONB, -- ผล wu_xing_score ต่อเลเยอร์
  opted_in_to_save BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 007b_influence_tracking_e.sql ====================

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

-- ==================== 008_longitudinal_snapshots_friction.sql ====================

-- ต่อยอดจาก longitudinal_snapshots_e ที่มีอยู่แล้ว (Platform E Handoff doc)
-- เพิ่มคอลัมน์ Friction Score (verify แล้วกับข้อมูลจริง n=79/64 unique, ดู CLAUDE.md §5)
ALTER TABLE longitudinal_snapshots_e
  ADD COLUMN IF NOT EXISTS friction_score FLOAT,
  ADD COLUMN IF NOT EXISTS friction_level TEXT, -- 'สอดคล้องดี' | 'ปานกลาง' | 'สูง'
  ADD COLUMN IF NOT EXISTS day_element TEXT,
  ADD COLUMN IF NOT EXISTS friction_calculated_at TIMESTAMPTZ DEFAULT now();

-- ==================== 009_dream_pending_discoveries.sql ====================

-- Logic 4: AI-1 enrichment pipeline — คำที่ไม่พบในฐาน 457+50 ต้องผ่านการรีวิวก่อนรวมจริง
CREATE TABLE IF NOT EXISTS dream_pending_discoveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  dream_object TEXT NOT NULL,
  chinese_char TEXT,
  kangxi_strokes INT,
  element TEXT, -- ตัดสินเชิงความหมาย ห้ามคำนวณจากนับขีด (ดู CLAUDE.md §5)
  meaning_keyword TEXT,
  source TEXT DEFAULT 'ai_discovered',
  reviewed BOOLEAN DEFAULT false,
  reviewed_by TEXT,
  discovered_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 010_rls_policies.sql ====================

-- ⚠️ ยังไม่ครบ — เป็นจุดเริ่มต้นเท่านั้น ต้องออกแบบ policy ให้ครบทุกตารางก่อน production
-- หลักการที่ตกลงกันไว้: clinical fields ใน results table ห้ามหลุดข้าม Platform D ↔ E
-- (pre_clinical_intake, doctor_name, license_id, clinical_opinion,
--  medication_recommendations, caregiver_guidelines)

ALTER TABLE entity_relationship_graphs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own entity graphs"
  ON entity_relationship_graphs FOR ALL
  USING (auth.uid()::text = user_id);

ALTER TABLE oracle_binding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own oracle sessions"
  ON oracle_binding_sessions FOR ALL
  USING (auth.uid()::text = user_id);

ALTER TABLE org_naming_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own naming sessions"
  ON org_naming_sessions FOR ALL
  USING (auth.uid()::text = user_id);

-- TODO: results table RLS ต้องแยก column-level ไม่ใช่แค่ row-level เพราะ clinical
-- fields ต้องซ่อนจาก Platform E โดยสิ้นเชิงแม้เป็นแถวของ user เดียวกัน — พิจารณาใช้
-- VIEW แยกสำหรับ Platform E ที่ SELECT เฉพาะ non-clinical columns แทนการเปิด RLS
-- ตรงๆ บนตารางที่มีข้อมูลอ่อนไหวปนอยู่

-- ==================== 011_content_knowledge_base.sql ====================

-- ฐานความรู้หลัก 3 ตาราง: การ์ด 00-99, สัญลักษณ์ฝัน, ธีมจิตวิทยาความฝัน
-- ย้ายจาก data/*.json เข้า Supabase เพื่อให้ query ฝั่ง server ได้ + แก้ไขได้โดยไม่ redeploy
-- + เปิดทาง Full-Text Search แก้ปัญหา "substring over-match" ที่ตั้งธงไว้ใน CLAUDE.md §5

-- ⚠️ Extension ต้องมาก่อนเสมอ: idx_dream_symbols_object ใช้ gin_trgm_ops (pg_trgm),
-- dream_symbols/dream_psychology_themes ใช้ gen_random_uuid() (pgcrypto) — ถ้าประกาศทีหลัง
-- migration จะ fail ตอนสร้าง index/ตาราง
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS master_energy_cards (
  energy_id TEXT PRIMARY KEY, -- '00'-'99'
  energy_name TEXT NOT NULL,
  core_essence TEXT,
  archetype_figure TEXT, -- บุคคลในตำนาน/ประวัติศาสตร์ที่คล้ายคลึง
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dream_symbols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  dream_object TEXT NOT NULL, -- อาจมีหลายคำคั่นด้วย '/' เช่น "พ่อ / บิดา"
  chinese_char TEXT,
  kangxi_strokes INT,
  element TEXT NOT NULL, -- ตัดสินเชิงความหมาย ไม่ใช่จากนับขีด (ดู CLAUDE.md §5)
  meaning_keyword TEXT,
  source TEXT DEFAULT 'original_457', -- 'original_457' | 'ai_discovered' (จาก dream_pending_discoveries ที่ผ่านรีวิวแล้ว)
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(dream_object,'') || ' ' || coalesce(meaning_keyword,''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dream_symbols_search ON dream_symbols USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_dream_symbols_object ON dream_symbols USING GIN(dream_object gin_trgm_ops);

CREATE TABLE IF NOT EXISTS dream_psychology_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_theme TEXT NOT NULL, -- อาจมีหลายคำคั่นด้วย '/'
  psychological_meaning TEXT,
  subconscious_trigger TEXT,
  advice_psych TEXT,
  element_connection TEXT,
  element_remedy TEXT,
  personalized_note TEXT, -- คำแนะนำที่ปรับตาม Big Five (พบตอน seed จริง ไม่ได้อยู่ในสเปกเดิม)
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(dream_theme,''))
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dream_themes_search ON dream_psychology_themes USING GIN(search_vector);

-- ==================== 012_ubakong_and_personal_year.sql ====================

-- Logic 3 (Ubakong daytime table) + Logic 1 (Personal Year Guidance)
-- ทั้งสองตารางมาจากไฟล์จริงที่ผู้ใช้อัปโหลด (Ubakong_Time_Chart.xlsx,
-- Personal_Year_Guidance.xlsx) ไม่ใช่ข้อมูลที่สร้างขึ้นเอง

CREATE TABLE IF NOT EXISTS ubakong_time_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week TEXT NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  yam_name TEXT NOT NULL,
  meaning TEXT,
  prediction_status TEXT, -- 'ดี' | 'ดีมาก' | 'ร้าย'
  score INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ubakong_day_time ON ubakong_time_chart(day_of_week, time_start, time_end);
-- ⚠️ ครอบคลุมแค่ยามกลางวัน (06:01-18:00, 5 ยาม/วัน = 35 แถว) ยามกลางคืนยังไม่มีข้อมูล

CREATE TABLE IF NOT EXISTS personal_year_guidance (
  personal_year_number INT PRIMARY KEY, -- 1-9, 11, 22, 33
  theme TEXT,
  prediction_overview TEXT,
  caution TEXT,
  opportunity TEXT,
  action_advice TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 013_card_storage_bucket.sql ====================

-- แก้ปัญหา image_url ตายทั้งชุดพร้อมกัน (เกิดขึ้นจริงแล้วครั้งหนึ่ง — Supabase link
-- ที่ hardcode ไว้ในทุก seed/artifact ก่อนหน้านี้ใช้งานไม่ได้แล้ว)
--
-- แนวทางใหม่: เก็บแค่ "มีรูปหรือไม่" ในตาราง ไม่เก็บ URL เต็ม — คำนวณ URL จาก
-- NEXT_PUBLIC_SUPABASE_URL (env var) + bucket path ที่แอปรู้เองเสมอ
-- เปลี่ยน Supabase project ใหม่ในอนาคต = แก้ env var ตัวเดียว ไม่ต้อง regenerate
-- seed 100 แถวใหม่อีก

-- 1. สร้าง storage bucket สำหรับการ์ด (รันใน Supabase Dashboard > Storage หรือผ่าน
--    Management API — SQL ตรงๆ ทำไม่ได้ ต้องใช้ CLI/Dashboard)
--    ชื่อ bucket: "master_energy_cards" (ยืนยันแล้วจากของจริงที่ผู้ใช้อัปโหลด)
--    Public: true (อ่านได้จากทุกที่ ไม่ต้อง auth)
--    ชื่อไฟล์จริงที่อัปโหลดแล้ว: {energy_id}-removebg-preview.png เช่น
--    00-removebg-preview.png ... 99-removebg-preview.png (ยืนยันครบ 100 ไฟล์, เลขตรงกับ
--    energy_id ตรงๆ ไม่มีเลื่อน)

-- 2. Storage policy: อ่านสาธารณะ, เขียนได้เฉพาะ service role
--    (รันหลังสร้าง bucket "master_energy_cards" แล้วเท่านั้น — ผู้ใช้สร้างและอัปโหลดครบ 100 ไฟล์แล้วจริง)
CREATE POLICY "Public read access for card images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'master_energy_cards');

CREATE POLICY "Service role can upload card images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'master_energy_cards' AND auth.role() = 'service_role');

-- 3. ปรับตาราง master_energy_cards: เลิกเก็บ image_url เต็ม เก็บแค่สถานะว่ามีรูปไหม
ALTER TABLE master_energy_cards DROP COLUMN IF EXISTS image_url;
ALTER TABLE master_energy_cards ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT true;

-- หมายเหตุสำหรับโค้ดฝั่งแอป (Next.js):
-- const cardImageUrl = (energyId: string) =>
--   `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/master_energy_cards/${energyId}-removebg-preview.png`;

-- ==================== 014_wellness_and_dream_recurring.sql ====================

-- Wellness Activity Engine (internal+external practice pairs per element)
-- + Dream Recurring counter (เก็บแค่ความถี่ ห้ามเก็บการตีความ — ดู CLAUDE.md)

CREATE TABLE IF NOT EXISTS wellness_activities (
  element TEXT PRIMARY KEY, -- 'Fire' | 'Water' | 'Earth' | 'Wood' | 'Metal'
  internal_name TEXT NOT NULL,
  internal_tradition TEXT,
  internal_how_to TEXT,
  internal_research TEXT,
  external_name TEXT NOT NULL,
  external_category TEXT, -- 'movement' | 'art' | 'music' | 'nature' ฯลฯ
  external_how_to TEXT,
  external_research TEXT,
  combo_routine TEXT,
  best_time TEXT,
  time_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ⚠️ ตารางนี้เก็บ "ความถี่" เท่านั้น ห้ามเพิ่มคอลัมน์ตีความ/วินิจฉัยใดๆ เด็ดขาด
-- (หลักการที่ตกลงกันไว้ตลอดเซสชัน — ไม่สร้างโปรไฟล์สุขภาพจิตสะสมต่อคน)
CREATE TABLE IF NOT EXISTS dream_occurrence_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  theme TEXT NOT NULL,
  year_month TEXT NOT NULL, -- 'YYYY-MM'
  count INT NOT NULL DEFAULT 1,
  UNIQUE(user_id, theme, year_month)
);
CREATE INDEX IF NOT EXISTS idx_dream_log_user_theme ON dream_occurrence_log(user_id, theme);

-- RLS: ผู้ใช้เห็นแค่ log ของตัวเอง, wellness_activities อ่านสาธารณะ
ALTER TABLE dream_occurrence_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own dream occurrence log"
  ON dream_occurrence_log FOR ALL
  USING (auth.uid()::text = user_id);

-- ==================== 015_kala_yoke.sql ====================

-- Logic 3 ส่วนขยาย: กาลโยค (ธงชัย/อธิบดี/อุบาทว์/โลกาวินาศ) — ระดับปี/วัน
-- สูตร verify แล้วกับตัวอย่างเฉลยจริงจากวิกิพีเดีย (จ.ศ. 1369) ตรงเป๊ะยกเว้น
-- 1 จุดที่ต้นฉบับพิมพ์ผิดเอง (ดู kala_yoke_engine.py comment)
--
-- ไม่ seed เป็นข้อมูลตายตัว เพราะคำนวณจากสูตรได้ตรงๆ ทุกปี (ต่างจาก Ubakong ที่
-- เป็นตารางค่าคงที่) — เก็บผลลัพธ์ที่คำนวณแล้วไว้ cache ต่อปีแทน เพื่อไม่ต้อง
-- คำนวณซ้ำทุกครั้งที่ query

CREATE TABLE IF NOT EXISTS kala_yoke_by_year (
  chulasakarat_year INT PRIMARY KEY,
  thongchai_day TEXT NOT NULL,   -- ธงชัย (ดี) — วันในสัปดาห์
  athibodee_day TEXT NOT NULL,   -- อธิบดี (ดี)
  ubat_day TEXT NOT NULL,        -- อุบาทว์ (ร้าย)
  lokawinat_day TEXT NOT NULL,   -- โลกาวินาศ (ร้าย)
  computed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE kala_yoke_by_year IS
  'Cache ผลคำนวณกาลโยครายปี — คำนวณจริงด้วย kala_yoke_engine.calculate_kala_yoke(), ตารางนี้แค่เก็บผลลัพธ์ไม่ให้คำนวณซ้ำ ไม่ใช่แหล่งข้อมูลต้นทาง';

-- ==================== 016_card_figure_bios.sql ====================

-- เพิ่มประวัติ/เรื่องราวสั้นของบุคคลต้นแบบ (archetype_figure) ทั้ง 100 ใบ
-- ที่มา: figure_bios.py — ค้นคว้า+เขียนโดย Claude ในเซสชันนี้ ไม่ใช่ข้อมูลจากไฟล์ต้นฉบับ
-- (ตรวจสอบแล้วว่าไฟล์ต้นฉบับ Master_Energy_00_99 ไม่มีคอลัมน์ประวัติเลย)
--
-- ⚠️ สถานะการยืนยัน: มีแค่ 2/100 ที่ผ่านการค้นเว็บยืนยันจริงในเซสชันนี้ (เทพีไพเธีย,
-- เจ้าชายมิชกิน) ที่เหลือ 98 เขียนจากความรู้ทั่วไปที่เชื่อถือได้แต่ยังไม่ผ่านการค้นเว็บ
-- เจาะจง — ดูคอลัมน์ figure_bio_verified ต่อแถว

ALTER TABLE master_energy_cards
  ADD COLUMN IF NOT EXISTS figure_bio TEXT,
  ADD COLUMN IF NOT EXISTS figure_category TEXT, -- 'historical'|'religious'|'mythological'|'legendary'|'fictional'|'role_title'
  ADD COLUMN IF NOT EXISTS figure_bio_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN master_energy_cards.figure_category IS
  'historical=บุคคลจริง, religious=ศาสดา, mythological=เทพปกรณัม, legendary=กึ่งตำนาน, fictional=ตัวละครวรรณกรรม, role_title=ตำแหน่งไม่ใช่บุคคลเดียว — ใช้กำหนดโทนการนำเสนอ AI ให้ถูกต้อง (เช่น role_title ต้องบอกผู้ใช้ว่าไม่ใช่บุคคลเดียว)';

-- ==================== 017_public_read_knowledge_base.sql ====================

-- เปิดสิทธิ์ "อ่านสาธารณะ" ให้ตารางฐานความรู้ (content) ตามที่ตกลงไว้ใน CLAUDE.md §7:
--   "ตารางฐานความรู้ (การ์ด/สัญลักษณ์ฝัน/ธีม) เป็นข้อมูลสาธารณะที่ทุก user อ่านได้หมด
--    แต่การเขียน (INSERT/UPDATE) ควรจำกัดเฉพาะ service role หรือ admin เท่านั้น"
--
-- ที่มาของปัญหา: migration 010 เปิด RLS ให้ทุกตาราง แต่สร้าง policy เฉพาะตารางข้อมูลผู้ใช้
-- ทำให้ฐานความรู้ถูกล็อกไปด้วย → client ที่ใช้ anon key อ่านได้ 0 แถว (เงียบๆ ไม่ error)
-- ตรวจพบตอน verify ฐานข้อมูลจริงหลังรัน migration
--
-- หมายเหตุความปลอดภัย: policy นี้ให้แค่ SELECT — INSERT/UPDATE/DELETE ยังถูกปฏิเสธ
-- โดยปริยาย (ไม่มี policy) ฝั่ง service role ข้าม RLS อยู่แล้วจึงเขียนได้ตามปกติ
-- ตารางข้อมูลผู้ใช้ (users, subscriptions, chat_sessions, *_e ฯลฯ) ไม่แตะ — ยังล็อกตามเดิม

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'master_energy_cards',
    'dream_symbols',
    'dream_psychology_themes',
    'ubakong_time_chart',
    'personal_year_guidance',
    'wellness_activities',
    'kala_yoke_by_year'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'public read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (true)', 'public read ' || t, t);
  END LOOP;
END $$;
