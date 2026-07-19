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
