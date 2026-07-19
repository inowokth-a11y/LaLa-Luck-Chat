-- ต่อยอดจาก longitudinal_snapshots_e ที่มีอยู่แล้ว (Platform E Handoff doc)
-- เพิ่มคอลัมน์ Friction Score (verify แล้วกับข้อมูลจริง n=79/64 unique, ดู CLAUDE.md §5)
ALTER TABLE longitudinal_snapshots_e
  ADD COLUMN IF NOT EXISTS friction_score FLOAT,
  ADD COLUMN IF NOT EXISTS friction_level TEXT, -- 'สอดคล้องดี' | 'ปานกลาง' | 'สูง'
  ADD COLUMN IF NOT EXISTS day_element TEXT,
  ADD COLUMN IF NOT EXISTS friction_calculated_at TIMESTAMPTZ DEFAULT now();
