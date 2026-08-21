-- 041: face-card เฟส 1 — ภาพผู้ใช้ในบทบาทการ์ด (ภาพ OG เฉพาะบุคคล)
--
-- การตัดสินใจผู้ใช้ (เคาะแล้วในคิว §15): flux-pulid + สไตล์คิวบิสม์ (CARD_ART_STYLE จาก
-- ไฟล์ prompt ต้นฉบับ) · ฟรี 1 ครั้ง/บัญชีถาวร · เจนซ้ำ 40 เครดิต · เก็บผลงานถาวร
--
-- 🔴 ชีวมิติ (PDPA): ตารางนี้เก็บ **เฉพาะภาพผลงานที่เจนแล้ว** (งานศิลปะสไตล์คิวบิสม์)
--    รูปถ่ายใบหน้าต้นฉบับใช้ประมวลผลชั่วขณะเท่านั้น **ไม่จัดเก็บ** (นโยบายใน
--    lib/face-card/consent.ts — consent_version บันทึกเวอร์ชันที่ผู้ใช้ยอมรับ ณ ตอนเจน)
--
-- Storage bucket "face_cards" (private) สร้างผ่าน storage API ด้วย service role
-- (scripts ตอน deploy — SQL ตรงเข้า storage.buckets ทำไม่ได้บนบาง instance ตามบทเรียน 013)
-- bucket ไม่มี storage policy เลย = อ่าน/เขียนได้เฉพาะ service role (ภาพเสิร์ฟผ่าน signed URL)

create table if not exists face_card_gen_e (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid not null references auth.users(id) on delete cascade,
  card_id text not null,
  -- path ใน bucket face_cards เช่น "<auth_uid>/<id>.jpg"
  image_path text not null,
  -- token สาธารณะของหน้าแชร์ /s/<token> — สุ่มยาวพอเดาไม่ได้ (base64url 22 ตัว)
  share_token text not null unique,
  consent_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists face_card_gen_e_uid_idx on face_card_gen_e (auth_uid, created_at desc);

alter table face_card_gen_e enable row level security;

-- own-row read เท่านั้น — insert/delete ผ่าน service role (route เป็นคนคุมสิทธิ์/เครดิต)
drop policy if exists "face_card_own_read" on face_card_gen_e;
create policy "face_card_own_read" on face_card_gen_e
  for select using (auth.uid() = auth_uid);
