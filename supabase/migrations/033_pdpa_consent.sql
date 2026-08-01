-- 033_pdpa_consent.sql — หลักฐานการยินยอม PDPA (1 ส.ค. 2569)
-- ตามหลัก PDPA ต้องพิสูจน์ได้ว่า "ยินยอมเมื่อไหร่ กับข้อความรุ่นไหน" — เก็บคู่กับโปรไฟล์
-- (ผู้เยี่ยมชม/anonymous ก็มีโปรไฟล์ จึงบันทึก consent ได้เหมือนสมาชิกเต็ม)

alter table user_profiles_e add column if not exists pdpa_version text;
alter table user_profiles_e add column if not exists pdpa_accepted_at timestamptz;

comment on column user_profiles_e.pdpa_version is
  'เวอร์ชันนโยบายความเป็นส่วนตัวที่ผู้ใช้ยินยอม (ตรงกับ PDPA_VERSION ใน lib/consent.ts)';
comment on column user_profiles_e.pdpa_accepted_at is 'เวลาที่กดยินยอม';
