-- 046: ตามหาแมวหาย — calibration loop (8 ก.ย. 2569 เฟส 1)
-- เก็บ "อินพุต + แผนที่ระบบทำนาย" ต่อเคส และ "เจอที่ไหนจริง" ที่ผู้ใช้รายงาน → วัด hit-rate ของ
-- top-3 ช่อง แยกตามชั้น แล้วปรับน้ำหนักจากของจริง (ถ้าชั้นตำราไม่ต่างจากสุ่ม ลดน้ำหนักตามจริง —
-- ซื่อสัตย์กับหลัก "คำนวณจริง") + ได้สถิติแมวหายบริบทไทยที่งานวิจัยเดิมไม่มี
--
-- ไม่มีข้อมูลส่วนตัวนอกจาก auth_uid (nullable — anon ใช้ได้ ฟรี ฿0) · inputs = enum/ทิศ/จำนวนวัน

create table if not exists lost_cat_cases_e (
  id         uuid primary key default gen_random_uuid(),
  auth_uid   uuid references auth.users(id) on delete set null,
  inputs     jsonb not null,
  predicted  jsonb not null,   -- top cells {dir, ring, score} + topDirs
  created_at timestamptz not null default now()
);
create index if not exists idx_lost_cat_cases_created on lost_cat_cases_e (created_at desc);

create table if not exists lost_cat_outcomes_e (
  id         bigint generated always as identity primary key,
  case_id    uuid not null references lost_cat_cases_e(id) on delete cascade,
  found      boolean not null,
  direction  text,     -- ทิศที่เจอ (8 ทิศ) — null เมื่อไม่พบ/ไม่ทราบ
  ring       text,     -- r0..r3
  place      text,     -- ตัวเลือกเดียวกับสถิติ Huang (own_yard/neighbor_yard/vegetation/under_house/neighbor_house/other)
  days       int,      -- วันที่ใช้จนเจอ
  created_at timestamptz not null default now()
);
create index if not exists idx_lost_cat_outcomes_case on lost_cat_outcomes_e (case_id);

-- 🔒 RLS เปิด ไม่มี policy = client แตะไม่ได้ · เขียน/อ่านผ่าน /api/lost-cat (service role) + แดชบอร์ดแอดมิน
alter table lost_cat_cases_e enable row level security;
alter table lost_cat_outcomes_e enable row level security;

comment on table lost_cat_cases_e is 'เคสแมวหาย: อินพุต+แผนที่ระบบทำนาย — เพื่อ calibration (service role เท่านั้น)';
comment on table lost_cat_outcomes_e is 'ผลจริงที่ผู้ใช้รายงาน (เจอที่ไหน) — วัด hit-rate ปรับน้ำหนัก';
