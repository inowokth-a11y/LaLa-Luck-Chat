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
