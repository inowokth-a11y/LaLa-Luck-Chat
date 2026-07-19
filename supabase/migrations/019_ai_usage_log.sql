-- บันทึกการเรียก AI ทุกครั้ง พร้อมต้นทุนจริง (ฐานของแดชบอร์ดและการตั้งราคา)
--
-- ⚠️ ทำไมไม่ใช้ `usage_logs` ที่มีอยู่: ตารางนั้นออกแบบมาเป็น **ยอดรวมรายวัน**
--    (user_id, platform, logic_type, usage_date, count) ไม่มีช่องเก็บต้นทุน/โมเดล/token
--    และเป็นของ Platform D — ไม่แตะ เก็บไว้ตามเดิม ตารางนี้เป็น **รายครั้ง** คนละหน้าที่
--
-- 🔴 เหตุผลที่ต้องมี: วัดจริงแล้วต้นทุนต่อคำทำนายต่างกัน 10 เท่า
--    (ฝันเจอในฐาน ฿0.69 vs ปลุก AI-1 ฿7.46) ขณะที่แผนขายเครดิตอยู่ที่ ฿3-5
--    → **กำไรทั้งธุรกิจขึ้นกับ cache hit rate ซึ่งไม่เคยถูกวัดเลย**

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ใครใช้ (NULL ได้ — ตอนนี้เว็บยังไม่มีระบบสมาชิก ทุกคนเป็นนิรนาม)
  user_id TEXT,
  -- 'web' | 'line' — ช่องทางที่เรียกเข้ามา
  channel TEXT NOT NULL DEFAULT 'web',
  -- Logic ที่เรียก (4=ฝัน, 21=เสี่ยงทาย ฯลฯ) ตรงกับ LOGIC_NAMES ใน lib/engine/router.ts
  logic_id INT,
  -- บทบาท AI: 'router' | 'ai1' | 'ai2'
  ai_role TEXT NOT NULL,

  provider TEXT NOT NULL,          -- claude | openai | gemini
  model TEXT NOT NULL,
  used_fallback BOOLEAN NOT NULL DEFAULT false,  -- true = ตัว primary ล่ม ต้องใช้สำรอง

  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  web_searches INT NOT NULL DEFAULT 0,

  -- ต้นทุนคำนวณ ณ เวลาที่เรียก (เก็บค่าไว้เลย ไม่คำนวณย้อนหลัง เพราะราคา/เรตเปลี่ยนได้)
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  cost_thb NUMERIC(10, 4) NOT NULL DEFAULT 0,

  -- ตัวชี้วัดที่กำหนดกำไรทั้งระบบ: true = ตอบได้จากแคช/ฐานข้อมูล ไม่ต้องจ่ายค่า AI-1
  cache_hit BOOLEAN,
  duration_ms INT,
  ok BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logic ON ai_usage_log (logic_id, created_at DESC);

COMMENT ON COLUMN ai_usage_log.cost_thb IS
  'ต้นทุนบาท ณ เวลาเรียก — เก็บค่าตายตัวเพราะราคาโมเดลและเรตแลกเปลี่ยนเปลี่ยนได้ภายหลัง';
COMMENT ON COLUMN ai_usage_log.cache_hit IS
  'true = ไม่ต้องเรียก AI-1 เพราะเจอในฐาน/แคช — ตัวเลขนี้กำหนดกำไรของทั้งระบบ';

-- 🔒 RLS: ข้อมูลต้นทุนธุรกิจ ห้ามให้ client อ่าน (service role ข้าม RLS อยู่แล้ว)
--    ไม่สร้าง policy ใดๆ = ปฏิเสธทุกคนที่ไม่ใช่ service role
--    ⚠️ บทเรียนจาก migration 010 (CLAUDE.md §7): หลังแก้ RLS ต้องทดสอบด้วย anon key จริง
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
