-- 031_share_reward.sql — รางวัล "กดแชร์การ์ด" +2 คำถามฟรี ครั้งเดียวต่อบัญชี (เฟส 2 — 1 ส.ค. 2569)
--
-- ข้อจำกัดที่ยอมรับแล้ว (ผู้ใช้ตัดสิน): ไม่มีแพลตฟอร์มไหนยืนยัน "แชร์สำเร็จจริง" ได้
-- → ให้รางวัลตอนกดแชร์ · กันฟาร์มด้วย PK auth_uid = ได้ครั้งเดียวตลอดชีพบัญชี
-- (มูลค่าความเสี่ยงสูงสุด ~฿0.70/บัญชี = ค่าการตลาดที่ยอมรับได้)

create table if not exists share_claims_e (
  auth_uid   uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- RLS: อ่านของตัวเองได้ (UI เช็คว่ารับไปหรือยัง) · เขียนผ่าน RPC เท่านั้น
alter table share_claims_e enable row level security;
drop policy if exists "own claim read" on share_claims_e;
create policy "own claim read" on share_claims_e
  for select using (auth.uid() = auth_uid);

-- เคลมรางวัล atomic ในทรานแซกชันเดียว: บันทึกเคลม + เพิ่มโบนัสถังคำถาม
-- คืนโบนัสรวมใหม่ · -1 = เคยรับไปแล้ว (PK ชนกัน — แม้ยิงพร้อมกันก็ได้แค่คนเดียว)
create or replace function claim_share_reward(p_auth_uid uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus int;
begin
  insert into share_claims_e (auth_uid) values (p_auth_uid)
  on conflict (auth_uid) do nothing;
  if not found then
    return -1; -- เคยรับแล้ว
  end if;
  -- +2 เข้าถังคำถามรวม (bucket "questions" — lib/chat/questions.ts)
  insert into chat_usage_e (auth_uid, bucket, used, bonus, updated_at)
  values (p_auth_uid, 'questions', 0, 2, now())
  on conflict (auth_uid, bucket) do update
    set bonus = chat_usage_e.bonus + 2, updated_at = now()
  returning bonus into v_bonus;
  return v_bonus;
end;
$$;

revoke all on function claim_share_reward(uuid) from public, anon, authenticated;
grant execute on function claim_share_reward(uuid) to service_role;

comment on table share_claims_e is
  'บันทึกการรับรางวัลแชร์ (+2 คำถามฟรี) — PK auth_uid = ครั้งเดียวต่อบัญชีเชิงโครงสร้าง (§15 เฟส 2)';
