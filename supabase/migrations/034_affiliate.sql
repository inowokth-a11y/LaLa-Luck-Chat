-- 034_affiliate.sql — ระบบลิงก์แอฟฟิลิเอต (§12 ข้อ 5: จ่ายตามรายได้จริง ไม่ใช่จำนวนคนสมัคร)
--
-- โครง 2 ตาราง:
--   affiliate_links_e        ลิงก์ที่แอดมินสร้าง (code ใช้ใน URL ?ref=CODE + ชื่อผู้รับลิงก์)
--   affiliate_attributions_e ผูกผู้ใช้ ← ลิงก์ แบบ first-touch (1 ผู้ใช้ = 1 ลิงก์ ตลอดไป)
--
-- รายรับต่อลิงก์ไม่เก็บซ้ำที่นี่ — คำนวณจาก credit_ledger_e (action like 'topup:%') ของผู้ใช้
-- ที่ถูก attribute แล้ว join ตอนอ่าน (แหล่งความจริงเดียว ไม่มีตัวเลขสองชุดให้ drift)
--
-- 🔒 RLS: เปิดทั้งสองตารางแต่ "ไม่มี policy เลย" = client อ่าน/เขียนไม่ได้ทั้งหมด
--    (ข้อมูลพันธมิตร/การตลาดเป็นเรื่องของแอดมิน — อ่านผ่าน service role ในหน้า /admin เท่านั้น)

create table if not exists affiliate_links_e (
  id           uuid primary key default gen_random_uuid(),
  -- รหัสในลิงก์ ?ref=CODE — ตัวพิมพ์เล็ก/ตัวเลข/ขีดกลาง (ตรวจรูปแบบที่ชั้นแอป lib/affiliate/code.ts)
  code         text not null unique,
  -- ชื่อผู้รับลิงก์ไปทำการตลาด (คนหรือเพจ) — ให้แอดมินจำได้ว่าลิงก์ไหนของใคร
  partner_name text not null,
  note         text,
  created_by   text not null, -- อีเมลแอดมินผู้สร้าง (ตรวจย้อนหลัง)
  active       boolean not null default true,
  -- จำนวนครั้งที่มีคนเปิดลิงก์ (ศักยภาพการเข้าถึง) — bump ผ่าน RPC เท่านั้น
  visit_count  bigint not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists affiliate_attributions_e (
  -- primary key = auth_uid → ผู้ใช้หนึ่งคนผูกได้ลิงก์เดียว (first-touch ชนะ เขียนทับไม่ได้)
  auth_uid   uuid primary key references auth.users(id) on delete cascade,
  link_id    uuid not null references affiliate_links_e(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_aff_attr_link on affiliate_attributions_e (link_id);

alter table affiliate_links_e enable row level security;
alter table affiliate_attributions_e enable row level security;
-- ไม่มี policy โดยเจตนา — service role ข้าม RLS อยู่แล้ว client ต้องอ่านได้ 0 แถว

-- นับการเปิดลิงก์แบบ atomic — เฉพาะลิงก์ที่ active · service role เท่านั้น
create or replace function bump_affiliate_visit(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update affiliate_links_e
     set visit_count = visit_count + 1
   where code = p_code and active;
$$;

revoke all on function bump_affiliate_visit(text) from public, anon, authenticated;
grant execute on function bump_affiliate_visit(text) to service_role;

comment on table affiliate_links_e is
  'ลิงก์แอฟฟิลิเอตที่แอดมินสร้าง (?ref=code) · แอดมินอ่าน/เขียนผ่าน service role เท่านั้น (§12)';
comment on table affiliate_attributions_e is
  'ผูกผู้ใช้กับลิงก์แอฟฟิลิเอตแบบ first-touch — รายรับต่อลิงก์คำนวณจาก credit_ledger_e ตอนอ่าน';
