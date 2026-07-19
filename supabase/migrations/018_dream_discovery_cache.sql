-- Logic 4: ทำให้ dream_pending_discoveries ใช้เป็น "แคชของ AI-1" ได้จริง (CLAUDE.md §10 งานที่ 1)
--
-- เดิม: ตารางนี้ตั้งใจให้ AI-1 เขียนผลลง แต่โค้ดจริงไม่เคยเขียนและไม่เคยอ่านกลับเลย
--       → ฝันคำเดิมซ้ำกี่ครั้งก็เรียก AI-1 (web search) ใหม่ทุกครั้ง = ฿10/ครั้ง
-- ใหม่: route /api/dream อ่านตารางนี้ก่อนเรียก AI-1 ถ้าเจอสัญลักษณ์ที่เคยค้นแล้วให้ใช้ซ้ำ
--
-- ⚠️ แถวในตารางนี้ยัง "รอมนุษย์รีวิว" (reviewed=false) การใช้ซ้ำเป็นแคชคือการใช้คำตอบ
--    เดิมของ AI-1 ซ้ำ ไม่ใช่การอนุมัติเข้าฐานความรู้ — การรวมเข้า dream_symbols ยังต้อง
--    ผ่านรีวิวเหมือนเดิม

-- 1) กันแถวซ้ำ: เดิมไม่มี unique constraint เลย เขียนซ้ำคำเดิมได้ไม่จำกัด
--    ลบแถวซ้ำโดยเก็บแถวที่เก่าที่สุดไว้ (แถวแรกที่ AI-1 ค้นได้)
DELETE FROM dream_pending_discoveries a
USING dream_pending_discoveries b
WHERE a.dream_object = b.dream_object
  AND (a.discovered_at, a.id) > (b.discovered_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dream_pending_object_unique
  ON dream_pending_discoveries (dream_object);

-- 2) ตัวชี้วัดว่าแคชได้ผลจริงแค่ไหน (ไม่ใช่ฟิลด์ตีความ — เป็น telemetry ล้วน)
ALTER TABLE dream_pending_discoveries
  ADD COLUMN IF NOT EXISTS hit_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

COMMENT ON COLUMN dream_pending_discoveries.hit_count IS
  'จำนวนครั้งที่ถูกใช้เป็นแคชแทนการเรียก AI-1 ใหม่ (ประหยัดต้นทุน ~฿10/ครั้ง)';

-- 2b) นับ hit แบบ atomic (อ่าน-บวก-เขียนฝั่งแอปจะแข่งกันเองเมื่อมีผู้ใช้พร้อมกัน)
CREATE OR REPLACE FUNCTION bump_dream_discovery_hit(p_dream_object TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE dream_pending_discoveries
     SET hit_count = hit_count + 1,
         last_used_at = now()
   WHERE dream_object = p_dream_object;
$$;

-- เรียกได้เฉพาะ service role (route /api/dream) — ผู้ใช้ทั่วไปไม่ควรปั่นตัวเลขนี้ได้
REVOKE ALL ON FUNCTION bump_dream_discovery_hit(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_dream_discovery_hit(TEXT) TO service_role;

-- 3) หาแถวด้วย substring ของข้อความฝัน — ใช้ trigram index ให้ยังเร็วเมื่อตารางโตขึ้น
--    (pg_trgm เปิดไว้แล้วใน migration 011)
CREATE INDEX IF NOT EXISTS idx_dream_pending_object_trgm
  ON dream_pending_discoveries USING GIN (dream_object gin_trgm_ops);
