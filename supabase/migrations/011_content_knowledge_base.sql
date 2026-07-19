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
