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
