-- 029_vision_cache.sql — แคชผลจำแนกภาพ (vision) ตาม hash ของภาพ
--
-- หลักการเดียวกับ dream discovery cache (migration 018): จ่ายค่า AI ครั้งแรกครั้งเดียว
-- ภาพเดิมวิเคราะห์ซ้ำ = อ่านแคช ฿0 · 🔴 เก็บเฉพาะ "ผลจำแนก" — **ไม่เก็บตัวภาพ**
-- (นโยบาย ephemeral processing ที่ตกลงกับผู้ใช้ 30 ก.ค. 2569)

create table if not exists vision_analysis_cache_e (
  image_hash   text primary key, -- sha256 hex ของไฟล์ภาพ (หลังย่อฝั่ง client)
  result       jsonb not null,   -- VisionClassification ที่ validate แล้ว
  model        text not null,    -- โมเดลที่จำแนก (ไว้ล้างแคชถ้าเปลี่ยนโมเดล/prompt ใหญ่)
  hit_count    int not null default 0,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

-- RLS: ไม่มี policy เลย = client อ่าน/เขียนไม่ได้ — ใช้ผ่าน service role จาก route เท่านั้น
-- (แคชเป็นของกลางทุกผู้ใช้ ไม่ผูก auth_uid — hash ไม่ย้อนกลับเป็นภาพได้)
alter table vision_analysis_cache_e enable row level security;

-- นับ hit แบบ atomic (แพทเทิร์นเดียวกับ bump_dream_discovery_hit)
create or replace function bump_vision_cache_hit(p_hash text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update vision_analysis_cache_e
     set hit_count = hit_count + 1, last_used_at = now()
   where image_hash = p_hash;
end;
$$;

revoke all on function bump_vision_cache_hit(text) from public, anon, authenticated;
grant execute on function bump_vision_cache_hit(text) to service_role;

comment on table vision_analysis_cache_e is
  'แคชผลจำแนกภาพ (ลวดลาย/รูปทรง) ตาม sha256 — ไม่เก็บตัวภาพ · service role เท่านั้น (§15)';
