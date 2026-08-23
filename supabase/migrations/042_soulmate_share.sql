-- 042: แชร์ภาพเนื้อคู่ (ผู้ใช้สั่ง 23 ส.ค. 2569) — เก็บชุดภาพถาวร + token หน้าแชร์ /sm/<token>
--
-- โครงเดียวกับ face_card_gen_e (041): bucket private "soulmate_images" (สร้างผ่าน storage API
-- ด้วย service role — ไม่มี storage policy = service role เท่านั้น เสิร์ฟผ่าน signed URL/server)
-- ต่างกันตรงนี้เก็บ "ชุด 3 ภาพ + คำบรรยายจาก engine" ต่อแถวเดียว (แชร์ทั้งชุดใน token เดียว)
--
-- 🔴 ไม่มีข้อมูลชีวมิติ — ภาพเป็นบุคคลสมมติจาก FLUX ล้วน (ไม่มีรูปอ้างอิงบุคคลจริง)
--    คำบรรยาย/ภาพต้องมีป้าย "ภาพจินตนาการจาก AI ไม่ใช่บุคคลจริง" ทุกจุดที่แสดง (นโยบายเดิม)

create table if not exists soulmate_gen_e (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid not null references auth.users(id) on delete cascade,
  share_token text not null unique,
  partner_gender text not null,
  partner_element text not null,
  -- ["<uid>/<id>-0.jpg", ...] path ใน bucket soulmate_images (ลำดับตรงกับ captions)
  image_paths jsonb not null,
  -- คำบรรยายลักษณะคู่จาก engine (ข.2/wuXing/ทิศ) ณ เวลาสร้าง — เก็บค่าตายตัว
  captions jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists soulmate_gen_e_uid_idx on soulmate_gen_e (auth_uid, created_at desc);

alter table soulmate_gen_e enable row level security;

drop policy if exists "soulmate_gen_own_read" on soulmate_gen_e;
create policy "soulmate_gen_own_read" on soulmate_gen_e
  for select using (auth.uid() = auth_uid);
