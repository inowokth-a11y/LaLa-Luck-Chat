-- 027_credit_wallet.sql — กระเป๋าเครดิต + ledger (โมเดลซื้อเครดิต หักตามการใช้ §12)
--
-- โครง: balance เก็บยอดปัจจุบัน (อ่านเร็ว) · ledger เก็บทุกความเคลื่อนไหว (ตรวจย้อนหลัง/กันเถียง)
-- เขียนทั้งหมดผ่าน RPC (service role เท่านั้น) — client ปั่นยอดเองไม่ได้
-- การหักเป็น atomic UPDATE เงื่อนไข balance >= จำนวน → ยอดติดลบเป็นไปไม่ได้แม้ยิงพร้อมกัน

create table if not exists credit_wallet_e (
  auth_uid   uuid primary key references auth.users(id) on delete cascade,
  balance    int  not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists credit_ledger_e (
  id            bigint generated always as identity primary key,
  auth_uid      uuid not null references auth.users(id) on delete cascade,
  -- ลบ = หักตอนใช้ · บวก = เติม/รางวัล
  delta         int  not null,
  -- key จาก lib/credits/pricing.ts (chat_question, logo_vector, ...) หรือ grant:<ที่มา>
  action        text not null,
  -- อ้างอิงเพิ่มเติม เช่น bucket ที่ใช้, อีเมลแอดมินผู้เติม, payment id (อนาคต Omise)
  ref           text,
  balance_after int  not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_credit_ledger_uid on credit_ledger_e (auth_uid, created_at desc);

-- RLS: ผู้ใช้อ่านได้แค่ของตัวเอง · ไม่มี policy เขียนเลย (เขียนผ่าน RPC service role)
alter table credit_wallet_e enable row level security;
alter table credit_ledger_e enable row level security;

drop policy if exists "own wallet read" on credit_wallet_e;
create policy "own wallet read" on credit_wallet_e
  for select using (auth.uid() = auth_uid);

drop policy if exists "own ledger read" on credit_ledger_e;
create policy "own ledger read" on credit_ledger_e
  for select using (auth.uid() = auth_uid);

-- หักเครดิตแบบ atomic — คืนยอดใหม่ · -1 = เครดิตไม่พอ/ยังไม่มีกระเป๋า · -2 = จำนวนไม่ถูกต้อง
-- (คืนรหัสแทน raise เพื่อให้ route แยกกรณี "ไม่พอ" ออกจาก "ระบบพัง" ได้โดยไม่ parse ข้อความ error)
create or replace function spend_credits(p_auth_uid uuid, p_amount int, p_action text, p_ref text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return -2; -- หัก 0/ติดลบไม่ได้ — การเพิ่มเครดิตต้องผ่าน grant_credits เท่านั้น
  end if;
  update credit_wallet_e
     set balance = balance - p_amount, updated_at = now()
   where auth_uid = p_auth_uid and balance >= p_amount
   returning balance into v_balance;
  if v_balance is null then
    return -1; -- ไม่มีแถว หรือยอดไม่พอ (เงื่อนไข WHERE ไม่ผ่าน)
  end if;
  insert into credit_ledger_e (auth_uid, delta, action, ref, balance_after)
  values (p_auth_uid, -p_amount, p_action, p_ref, v_balance);
  return v_balance;
end;
$$;

-- เติมเครดิต (แอดมิน/รางวัล/ชำระเงินในอนาคต) — คืนยอดใหม่ · -2 = จำนวนไม่ถูกต้อง
create or replace function grant_credits(p_auth_uid uuid, p_amount int, p_action text, p_ref text default null)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_amount is null or p_amount <= 0 then
    return -2;
  end if;
  insert into credit_wallet_e (auth_uid, balance, updated_at)
  values (p_auth_uid, p_amount, now())
  on conflict (auth_uid) do update
    set balance = credit_wallet_e.balance + p_amount, updated_at = now()
  returning balance into v_balance;
  insert into credit_ledger_e (auth_uid, delta, action, ref, balance_after)
  values (p_auth_uid, p_amount, p_action, p_ref, v_balance);
  return v_balance;
end;
$$;

revoke all on function spend_credits(uuid, int, text, text) from public, anon, authenticated;
revoke all on function grant_credits(uuid, int, text, text) from public, anon, authenticated;
grant execute on function spend_credits(uuid, int, text, text) to service_role;
grant execute on function grant_credits(uuid, int, text, text) to service_role;

comment on table credit_wallet_e is
  'กระเป๋าเครดิตต่อผู้ใช้ · เขียนผ่าน spend_credits/grant_credits (service role) เท่านั้น (§12)';
comment on table credit_ledger_e is
  'ประวัติเครดิตทุกรายการ (หัก/เติม) · ผู้ใช้อ่านของตัวเองได้ เขียนผ่าน RPC เท่านั้น';
