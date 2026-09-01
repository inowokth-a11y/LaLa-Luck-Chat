-- 043: กลุ่มผู้ทดลองใช้ (tester whitelist) — ใช้งานไม่หักเครดิต จัดการด้วยอีเมลผ่าน /admin
-- (มติผู้ใช้ 31 ส.ค. 2569 — แทนการเพิ่ม uid ใน env UNLIMITED_CREDIT_UIDS ที่ต้อง redeploy)
--
-- เช็คสิทธิ์ผ่าน RPC is_tester_account (SECURITY DEFINER join auth.users ฝั่ง DB) —
-- เพิ่มอีเมลได้ก่อนที่คนนั้นจะสมัคร พอสมัครแล้วสิทธิ์ติดทันทีโดยไม่ต้องผูก uid เอง

create table if not exists tester_whitelist_e (
  email text primary key check (email = lower(email)),
  note text,
  active boolean not null default true,
  added_by text,
  created_at timestamptz not null default now()
);

-- RLS เปิดแต่ไม่มี policy = client แตะไม่ได้ทั้งอ่าน/เขียน (service role เท่านั้น —
-- แพทเทิร์นเดียวกับตาราง affiliate: ข้อมูลจัดการภายในของแอดมิน)
alter table tester_whitelist_e enable row level security;

create or replace function is_tester_account(p_auth_uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from tester_whitelist_e t
    join auth.users u on lower(u.email) = t.email
    where u.id = p_auth_uid and t.active
  );
$$;

revoke all on function is_tester_account(uuid) from public;
revoke all on function is_tester_account(uuid) from anon;
revoke all on function is_tester_account(uuid) from authenticated;
grant execute on function is_tester_account(uuid) to service_role;

-- บทเรียน 3 ส.ค. 2569: แตะ function แล้ว PostgREST แคช schema เก่า (PGRST202 เงียบ) — reload เสมอ
notify pgrst, 'reload schema';
