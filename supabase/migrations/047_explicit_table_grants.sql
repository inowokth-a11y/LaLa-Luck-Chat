-- 047 — ประกาศสิทธิ์ระดับตาราง (GRANT) ให้ชัดในไฟล์ migration (20 ต.ค. 2569 ผู้ใช้อนุมัติ)
--
-- ที่มา: Supabase แจ้งว่าตั้งแต่ 30 ต.ค. 2569 ตารางใหม่ใน schema public จะไม่ได้สิทธิ์ Data API อัตโนมัติ
-- (anon / authenticated / service_role) — ไม่มีสิทธิ์ = supabase-js/PostgREST ตอบ "permission denied"
-- รวมถึง service_role ด้วย (BYPASSRLS ข้ามได้แค่ RLS ไม่ข้ามสิทธิ์ตาราง)
--
-- migration 000-046 ไม่มีไฟล์ไหนสั่ง GRANT ตารางเลย — พึ่งค่าอัตโนมัติมาตลอด ฐานข้อมูล prod ปัจจุบัน
-- ไม่กระทบ แต่ถ้าวันหนึ่งต้องสร้างฐานใหม่จาก migration (โปรเจกต์ใหม่ · branch · db reset) ทุกตารางจะไร้สิทธิ์
-- ไฟล์นี้จึง "ประกาศซ้ำ" สิทธิ์ที่ prod มีอยู่จริง ณ 20 ต.ค. 2569 (อ่านจาก role_table_grants แล้ว:
-- ทั้ง 45 ตารางให้ 7 สิทธิ์ครบทั้ง 3 role · sequence 8 ตัวให้ USAGE/SELECT/UPDATE ครบทั้ง 3 role)
--
-- 🔴 รันบน prod = ไม่เปลี่ยนพฤติกรรม (สิทธิ์เท่าเดิมเป๊ะ) · ระบุสิทธิ์เป็นรายตัวแทน ALL โดยเจตนา
--    (Postgres 17 เพิ่มสิทธิ์ MAINTAIN ซึ่ง ALL จะให้เกินของเดิม)
-- 🔴 GRANT ไม่ได้เปิดข้อมูล — RLS ที่เปิดครบทุกตารางยังเป็นด่านคุมแถว (ตารางที่ไม่มี policy = client อ่าน 0 แถว)
-- 🔴 จงใจไม่ตั้ง ALTER DEFAULT PRIVILEGES — ไม่ย้อนการเปลี่ยนแปลงของ Supabase ตารางใหม่ต้องประกาศเองในไฟล์
--    ที่สร้างตาราง (กติกาล็อกด้วย tests/migration-grants.test.ts ตั้งแต่ 048 ขึ้นไป)

grant select, insert, update, delete, truncate, references, trigger
  on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select, update
  on all sequences in schema public
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
