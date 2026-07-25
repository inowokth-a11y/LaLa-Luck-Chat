-- 022_chat_usage_e.sql — โควตาแชทผูกกับผู้ใช้ (แทน cookie) สำหรับผู้ล็อกอิน (CLAUDE.md §13)
--
-- เดิมโควตานับจาก cookie ต่อเบราว์เซอร์ → ล้าง cookie แล้วได้ใหม่ (กันคนเลี่ยงไม่ได้)
-- ตารางนี้นับต่อ auth_uid → ล้าง cookie ไม่รีเซ็ต · เป็นฐานของการขายเครดิตจริง
-- ผู้ที่ยังไม่ล็อกอิน → route ยังใช้ cookie เหมือนเดิม (ตารางนี้ใช้เฉพาะผู้ล็อกอิน)
--
-- bucket: 'plan' (แชทวิเคราะห์อิสระ §16) | 'logic:<id>' (FunctionChat ราย Logic §13)

create table if not exists chat_usage_e (
  auth_uid   uuid not null references auth.users(id) on delete cascade,
  bucket     text not null,
  used       int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (auth_uid, bucket)
);

-- RLS: ผู้ใช้เห็นยอดของตัวเองได้ · เขียนผ่าน service role (RPC) เท่านั้น — ปั่นตัวเลขเองไม่ได้
alter table chat_usage_e enable row level security;
drop policy if exists "own usage read" on chat_usage_e;
create policy "own usage read" on chat_usage_e
  for select using (auth.uid() = auth_uid);

-- เพิ่มยอดใช้ +1 แบบ atomic แล้วคืนยอดใหม่ (กัน race เมื่อยิงพร้อมกัน)
create or replace function bump_chat_usage(p_auth_uid uuid, p_bucket text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used int;
begin
  insert into chat_usage_e (auth_uid, bucket, used, updated_at)
  values (p_auth_uid, p_bucket, 1, now())
  on conflict (auth_uid, bucket) do update
    set used = chat_usage_e.used + 1, updated_at = now()
  returning used into v_used;
  return v_used;
end;
$$;

-- เรียกได้เฉพาะ service role (route /api/chat) — anon/authenticated ปั่นยอดเองไม่ได้
revoke all on function bump_chat_usage(uuid, text) from public, anon, authenticated;
grant execute on function bump_chat_usage(uuid, text) to service_role;

comment on table chat_usage_e is
  'โควตาแชทต่อผู้ใช้ (แทน cookie เมื่อล็อกอิน) · เขียนผ่าน bump_chat_usage (service role) เท่านั้น (§13)';
