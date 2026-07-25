-- 021_user_profiles_e.sql — โปรไฟล์ข้อมูลพื้นฐานของสมาชิก (เก็บครั้งเดียว ใช้หลาย Logic)
--
-- 🔒 ผูกกับ auth.users(UUID) ตรงๆ · **ไม่แตะตาราง `users` ของ Platform D** (§12)
--    ข้อมูลนี้คือ input ตั้งต้นของการคำนวณ (ชื่อ/วันเกิด/เวลา/จังหวัด) — ใช้ prefill/คำนวณ
--    ให้ทุกฟีเจอร์โดยไม่ต้องกรอกซ้ำ (Logic 1 profile, Logic 8-11 fortune ฯลฯ)
--
-- ต่างจาก user_identities ตรงที่ **ผู้ใช้เขียนแถวของตัวเองได้** (RLS with check auth.uid())
-- เพราะเป็นข้อมูลที่ผู้ใช้กรอกเอง ไม่ใช่ข้อมูล auth ที่ระบบเซ็ต

create table if not exists user_profiles_e (
  auth_uid       uuid primary key references auth.users(id) on delete cascade,
  first_name     text,
  last_name      text,
  birth_date     text,   -- 'YYYY-MM-DD' ค.ศ. (จาก <input type=date> จึงไม่ปน พ.ศ.)
  birth_time     text,   -- 'HH:MM' หรือ NULL (ไม่ทราบเวลาเกิด)
  birth_province text,   -- key จาก lib/provinces เช่น 'bangkok'
  gender         text,   -- optional (ยังไม่เก็บในฟอร์มตอนนี้ เผื่ออนาคต)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table user_profiles_e enable row level security;

-- ผู้ใช้อ่าน/เขียน "แถวของตัวเอง" เท่านั้น (auth.uid() = auth_uid ทั้ง using และ with check)
drop policy if exists "own profile read"   on user_profiles_e;
drop policy if exists "own profile insert" on user_profiles_e;
drop policy if exists "own profile update" on user_profiles_e;

create policy "own profile read"   on user_profiles_e for select using (auth.uid() = auth_uid);
create policy "own profile insert" on user_profiles_e for insert with check (auth.uid() = auth_uid);
create policy "own profile update" on user_profiles_e for update
  using (auth.uid() = auth_uid) with check (auth.uid() = auth_uid);

comment on table user_profiles_e is
  'ข้อมูลพื้นฐานผู้ใช้ E (ชื่อ/วันเกิด/เวลา/จังหวัด) เก็บครั้งเดียวใช้หลาย Logic · ผูก auth.uid · ไม่แตะ users ของ D';
