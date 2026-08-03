-- 035_wellbeing_kwi.sql — แบบประเมินสุขภาวะ "LaLa Wellbeing Check" (สไลซ์ C — 2 ส.ค. 2569)
--
-- เก็บผลการทำแบบประเมิน KWI 25 ข้อ (lib/engine/wellbeing.ts — จาก Satiya_KWI_KB ของผู้ใช้)
-- 🔴 การตัดสินใจของผู้ใช้ (ครบแล้ว ห้ามถามซ้ำ — CLAUDE.md §15 สไลซ์ C):
--   · retention = ลบพร้อมบัญชีเท่านั้น → FK auth.users ON DELETE CASCADE (แบบเดียวกับความจำแม่หมอ 032)
--   · ฟรีไม่จำกัด (ต้นทุน ฿0 ทั้งเส้น — pure engine ไม่มี AI)
-- ⚠️ ข้อมูลอ่อนไหว (สภาพจิตใจ) — RLS: own-row SELECT เท่านั้น **ไม่มี policy เขียน**
--   (เขียนผ่าน service role ใน /api/wellbeing หลังตรวจ consent เท่านั้น)

create table if not exists kwi_responses_e (
  id              bigint generated always as identity primary key,
  auth_uid        uuid not null references auth.users(id) on delete cascade,
  -- คำตอบดิบ: { "V1": 3, ... } (index ตัวเลือก 0-based ต่อข้อ) — เก็บไว้ให้คำนวณซ้ำได้ถ้าสูตรปรับ
  responses       jsonb not null,
  -- คะแนนรายมิติ 1.0-5.0 (คำนวณจาก scoreKwi ณ เวลาบันทึก)
  vitality        numeric not null,
  meaning         numeric not null,
  connection      numeric not null,
  mastery         numeric not null,
  resilience      numeric not null,
  kwi_total       numeric not null,
  -- pattern id: P001-P006
  pattern         text not null,
  -- รุ่น consent เฉพาะแบบประเมิน ที่ผู้ใช้ติ๊กตอนเริ่มทำ
  consent_version text not null,
  taken_at        timestamptz not null default now()
);

create index if not exists idx_kwi_responses_uid on kwi_responses_e (auth_uid, taken_at desc);

alter table kwi_responses_e enable row level security;

-- อ่านได้เฉพาะแถวตัวเอง · ไม่มี policy insert/update/delete (service role ข้าม RLS อยู่แล้ว)
drop policy if exists "own kwi read" on kwi_responses_e;
create policy "own kwi read" on kwi_responses_e
  for select using (auth.uid() = auth_uid);
