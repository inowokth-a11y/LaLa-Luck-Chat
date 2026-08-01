-- 032_user_memory.sql — ความจำแม่หมอ (เฟส 3 — 1 ส.ค. 2569)
--
-- โครง 2 ชั้น:
--   user_history_e = เหตุการณ์ดิบ (คำถาม/คำทำนายแบบย่อ) — append-only, ผู้ใช้อ่านของตัวเองได้
--   user_memory_e  = สรุปสะสม (rolling summary โดย AI) + ตัวนับเหตุการณ์ใหม่ตั้งแต่สรุปล่าสุด
-- ตอนแม่หมอตอบ: inject summary + เหตุการณ์ล่าสุดไม่กี่รายการ (คุมขนาด ประหยัด context window)
-- ครบ N เหตุการณ์ → Haiku สรุปใหม่เบื้องหลัง (fire-and-forget ~฿0.05-0.1/ครั้ง)
--
-- 🔴 ข้อมูลอ่อนไหว (ความฝัน/เรื่องที่ถาม) — RLS own-read เท่านั้น เขียนผ่าน service role
--    ⚠️ นโยบาย retention ยังไม่กำหนด (ต้องใส่ใน privacy policy ก่อน launch จริง)

create table if not exists user_history_e (
  id         bigint generated always as identity primary key,
  auth_uid   uuid not null references auth.users(id) on delete cascade,
  -- ชนิดเหตุการณ์: chat | dream | oracle (ตรงกับ lib/memory)
  kind       text not null,
  -- เนื้อหาแบบย่อ (คำถาม/คำตอบตัดสั้น + ข้อเท็จจริงสำคัญ เช่น การ์ด/ธาตุ) — ไม่เก็บ reply เต็ม
  content    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_history_uid on user_history_e (auth_uid, created_at desc);

create table if not exists user_memory_e (
  auth_uid             uuid primary key references auth.users(id) on delete cascade,
  -- สรุปสะสมโดย AI (ข้อเท็จจริงจากประวัติ — ไม่ใช่คำทำนายใหม่)
  summary              text,
  summary_updated_at   timestamptz,
  -- เหตุการณ์ใหม่ตั้งแต่สรุปล่าสุด — ครบเกณฑ์แล้วค่อยสรุปใหม่ (ประหยัดค่า AI)
  events_since_summary int not null default 0,
  updated_at           timestamptz not null default now()
);

alter table user_history_e enable row level security;
alter table user_memory_e enable row level security;

drop policy if exists "own history read" on user_history_e;
create policy "own history read" on user_history_e
  for select using (auth.uid() = auth_uid);

drop policy if exists "own memory read" on user_memory_e;
create policy "own memory read" on user_memory_e
  for select using (auth.uid() = auth_uid);

-- บันทึกเหตุการณ์ + เพิ่มตัวนับ atomic ในทรานแซกชันเดียว — คืนตัวนับใหม่
-- (caller ใช้ตัดสินว่าถึงเวลาสรุปหรือยัง โดยไม่ต้อง query ซ้ำ)
create or replace function log_user_history(p_auth_uid uuid, p_kind text, p_content jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into user_history_e (auth_uid, kind, content) values (p_auth_uid, p_kind, p_content);
  insert into user_memory_e (auth_uid, events_since_summary, updated_at)
  values (p_auth_uid, 1, now())
  on conflict (auth_uid) do update
    set events_since_summary = user_memory_e.events_since_summary + 1, updated_at = now()
  returning events_since_summary into v_count;
  return v_count;
end;
$$;

revoke all on function log_user_history(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function log_user_history(uuid, text, jsonb) to service_role;

comment on table user_history_e is
  'ประวัติการทำนาย/แชทแบบย่อ ต่อผู้ใช้ (เฟส 3 ความจำแม่หมอ) — own-read เท่านั้น · เขียนผ่าน RPC';
comment on table user_memory_e is
  'สรุปสะสม (rolling summary) โดย AI — inject เข้า prompt เพื่อให้แม่หมอจำข้ามเซสชัน (§15 เฟส 3)';
