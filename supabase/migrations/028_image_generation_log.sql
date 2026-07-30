-- 028_image_generation_log.sql — เก็บ metadata ทุกครั้งที่ระบบ gen ภาพ (โลโก้/ฉลาก)
--
-- เหตุผล (ตกลงกับผู้ใช้ 30 ก.ค. 2569): เดิมเก็บแต่ *ภาพ* ลง Storage — ส่วนผสมที่ใช้สร้าง
-- (ธาตุแบรนด์/ลวดลาย/คะแนนองค์ประกอบ/prompt) หายไปกับ response → วิเคราะห์ย้อนหลังต้องเดา
-- ตารางนี้ทำให้ "ฉลากที่สร้างจากระบบเรา" วิเคราะห์ธาตุย้อนหลังได้ ฟรี แม่น 100% โดยไม่ต้องใช้ AI อ่านภาพ

create table if not exists image_generation_log_e (
  id            bigint generated always as identity primary key,
  auth_uid      uuid not null references auth.users(id) on delete cascade,
  -- logo_preview | logo_vector | label_artwork (key เดียวกับ ACTION_RATES ฝั่งเครดิต)
  kind          text not null,
  image_url     text,
  -- true = อยู่ Storage ถาวรแล้ว · false = URL fal ชั่วคราว (อาจหมดอายุ)
  stored        boolean not null default false,
  prompt        text,
  brand_name    text,
  brand_element text,
  motif         text,
  motif_element text,
  orientation   text,
  -- ผล scoreLabelComposition (ฉลาก) หรือ harmony wuXingScore (โลโก้) ณ เวลาสร้าง
  composition   jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_image_gen_log_uid on image_generation_log_e (auth_uid, created_at desc);

-- RLS: ผู้ใช้อ่านของตัวเอง · ไม่มี policy เขียน (เขียนผ่าน service role จาก route เท่านั้น)
alter table image_generation_log_e enable row level security;

drop policy if exists "own generation read" on image_generation_log_e;
create policy "own generation read" on image_generation_log_e
  for select using (auth.uid() = auth_uid);

comment on table image_generation_log_e is
  'metadata การ gen ภาพ (โลโก้/ฉลาก) — ให้วิเคราะห์ธาตุย้อนหลังได้โดยไม่ต้องใช้ AI อ่านภาพ (§12)';
