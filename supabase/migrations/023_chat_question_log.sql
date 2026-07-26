-- 023_chat_question_log.sql — เก็บประวัติคำถามในแชทวิเคราะห์อิสระ (§16) เพื่อรู้ว่าควรสร้าง engine อะไรต่อ
--
-- เก็บทั้งคำถามที่ **ตอบได้** (answered) และ **ตอบไม่ได้** (unclear = ไม่มี engine รองรับ) —
--   คำถาม unclear คือ "ความต้องการที่เรายังไม่มี" → ใช้จัดลำดับความสำคัญฟีเจอร์ถัดไป
--
-- 🔒 ความเป็นส่วนตัว: คำถามเป็น free-text (อาจมีข้อมูลส่วนตัว) → **ไม่มี RLS policy = client อ่านไม่ได้**
--    เข้าถึงได้เฉพาะ service role (แดชบอร์ดแอดมิน) · ไม่เก็บคำถามที่โดน Safety Gate/นโยบายเลขเด็ด
--    (ถูกดักก่อนถึงจุด log อยู่แล้ว)

create table if not exists chat_question_log (
  id          bigint generated always as identity primary key,
  question    text not null,
  -- answered | needs_input | unclear
  status      text not null,
  -- ฟังก์ชัน engine ที่ถูกเรียก (ว่างถ้า unclear/needs_input)
  fns         text[] not null default '{}',
  channel     text not null default 'web',
  user_id     text,          -- auth_uid ถ้าล็อกอิน (nullable)
  created_at  timestamptz not null default now()
);

create index if not exists idx_question_log_status on chat_question_log (status, created_at desc);

alter table chat_question_log enable row level security;
-- ไม่สร้าง policy = ปฏิเสธทุก client · service role ข้าม RLS อยู่แล้ว

comment on table chat_question_log is
  'ประวัติคำถามแชทอิสระ (answered/unclear) เพื่อจัดลำดับฟีเจอร์ · service role เท่านั้น · §16';
