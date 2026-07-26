-- 024_feedback.sql — ระบบความเห็นผู้ใช้ + คำถามความเห็นที่แอดมินตั้งได้
--
-- feedback: ความเห็นเปิดกว้างจากผู้ใช้ (+ ให้ดาวได้) — เขียนผ่าน /api/feedback (service role) ไม่ใช่ client ตรง
-- feedback_prompts: คำถามความเห็นที่แอดมินตั้ง (เช่น "อยากได้โหมดไหนเพิ่ม?") — public อ่านเฉพาะที่ active

create table if not exists feedback_prompts (
  id         bigint generated always as identity primary key,
  question   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
-- ผู้ใช้ทั่วไป (anon) อ่านคำถามที่ active ได้ (เพื่อโชว์ในกล่องความเห็น) · เขียนผ่าน service role เท่านั้น
alter table feedback_prompts enable row level security;
drop policy if exists "read active prompts" on feedback_prompts;
create policy "read active prompts" on feedback_prompts for select using (active = true);

create table if not exists feedback (
  id         bigint generated always as identity primary key,
  message    text not null,
  rating     int,                     -- 1-5 (ไม่บังคับ)
  prompt_id  bigint references feedback_prompts(id) on delete set null,  -- ตอบคำถามไหน (NULL = เปิดกว้าง)
  user_id    text,                    -- auth_uid ถ้าล็อกอิน (nullable)
  channel    text not null default 'web',
  created_at timestamptz not null default now()
);
create index if not exists idx_feedback_created on feedback (created_at desc);
-- 🔒 ไม่มี policy = client อ่าน/เขียนตรงไม่ได้ · เขียนผ่าน /api/feedback (service role) · อ่านที่แดชบอร์ดแอดมิน
alter table feedback enable row level security;

comment on table feedback is 'ความเห็นผู้ใช้ · เขียนผ่าน /api/feedback (service role) · อ่านเฉพาะแอดมิน';
comment on table feedback_prompts is 'คำถามความเห็นที่แอดมินตั้ง · public อ่านเฉพาะ active · เขียน service role';
