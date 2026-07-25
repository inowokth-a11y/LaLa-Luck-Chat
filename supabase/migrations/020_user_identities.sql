-- 020_user_identities.sql — ระบบสมาชิกฝั่ง Platform E (CLAUDE.md §12)
--
-- 🔒 ตารางสะพานเชื่อม Supabase Auth (auth.users UUID) ↔ ตัวตนฝั่ง E
--    **ไม่แก้ตาราง `users` ของ Platform D เลย** (ห้ามตาม §12) — users.id เป็น TEXT 'DEM-XXXX'
--    ส่วน auth.users.id เป็น UUID คนละระบบกัน จึงต้องมีตารางเชื่อมแยก
--
-- ผู้ใช้เว็บใหม่: มีแค่แถวใน auth.users + user_identities (platform_d_user_id = NULL)
-- ผู้ใช้ที่ login ด้วย LINE: ถ้า line_user_id ตรงกับแถวใน users ของ D → เชื่อมอัตโนมัติ
--    (ทำใน /auth/callback ด้วย service role — ดู app/auth/callback/route.ts)

create table if not exists user_identities (
  auth_uid          uuid primary key references auth.users(id) on delete cascade,
  -- เชื่อมกับ Platform D เมื่อรู้ตัว (เช่น LINE userId ตรงกับแถวเดิม) — NULL = ผู้ใช้เว็บล้วน
  platform_d_user_id text references users(id),
  email             text,
  display_name      text,
  avatar_url        text,
  -- LINE userId (sub) — ใช้เชื่อมบัญชีเว็บ ↔ LINE OA และ backfill platform_d_user_id
  line_user_id      text,
  -- google | facebook | line | email (จาก app_metadata.provider)
  provider          text,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz not null default now()
);

create index if not exists idx_user_identities_line on user_identities(line_user_id);
create index if not exists idx_user_identities_d   on user_identities(platform_d_user_id);

-- RLS: ผู้ใช้เห็นได้แค่แถวของตัวเอง · เขียนทั้งหมดผ่าน service role (callback) เท่านั้น
-- (ตรงกับหลัก §7: การเขียนจำกัดที่ service role — ผู้ใช้ทั่วไป INSERT/UPDATE เองไม่ได้)
alter table user_identities enable row level security;

drop policy if exists "own identity read" on user_identities;
create policy "own identity read" on user_identities
  for select using (auth.uid() = auth_uid);

comment on table user_identities is
  'สะพาน auth.users(UUID) ↔ ตัวตน E · ห้ามแก้ตาราง users ของ D · เขียนผ่าน service role เท่านั้น (§12)';
