-- 025_chat_bonus.sql — เครดิตโบนัส (ขยายโควตาฟรี) สำหรับให้รางวัล เช่น ตอบแบบสอบถาม/คอมเมนต์
--
-- โมเดลปัจจุบันยังไม่มี "กระเป๋าเครดิต" เต็มรูป → ให้รางวัลด้วยการ **เพิ่มโควตาฟรี** (bonus)
-- เพดานฟรีจริง = FREE_PLAN_QUESTIONS + bonus · 1 โบนัส ≈ 1 คำถาม plan-chat (= 1 เครดิตตามเรท §pricing)

alter table chat_usage_e add column if not exists bonus int not null default 0;

-- เพิ่มโบนัสแบบ atomic แล้วคืนค่าโบนัสใหม่ (upsert เผื่อยังไม่มีแถว bucket นั้น)
create or replace function add_chat_bonus(p_auth_uid uuid, p_bucket text, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bonus int;
begin
  insert into chat_usage_e (auth_uid, bucket, used, bonus, updated_at)
  values (p_auth_uid, p_bucket, 0, greatest(p_amount, 0), now())
  on conflict (auth_uid, bucket) do update
    set bonus = chat_usage_e.bonus + greatest(p_amount, 0), updated_at = now()
  returning bonus into v_bonus;
  return v_bonus;
end;
$$;

revoke all on function add_chat_bonus(uuid, text, int) from public, anon, authenticated;
grant execute on function add_chat_bonus(uuid, text, int) to service_role;

comment on column chat_usage_e.bonus is 'โควตาฟรีเพิ่มเติม (รางวัล เช่น คอมเมนต์) · เพดานฟรี = FREE + bonus (§13)';
