-- 030_topup_idempotency.sql — กันเติมเครดิตซ้ำจาก charge เดียวกัน (Omise PromptPay)
--
-- ทางเข้า settle มี 2 ทาง (webhook + polling จากหน้าเว็บ) อาจวิ่งพร้อมกัน — เช็ค ledger
-- ก่อน grant อย่างเดียวมีหน้าต่าง race → ใช้ unique index เป็นด่านสุดท้าย:
-- grant_credits เขียน wallet + ledger ในทรานแซกชันเดียว (plpgsql) ถ้า insert ledger ชน
-- unique index ทั้งฟังก์ชันถูก rollback → ยอดเงินไม่มีทางเพิ่มซ้ำแม้ยิงพร้อมกัน
--
-- จำกัดเฉพาะ action ที่ขึ้นต้น 'topup:' — การหัก/เติมชนิดอื่น (spend, grant:admin) ใช้ ref
-- ซ้ำได้ตามเดิม (เช่น bucket เดิมโผล่หลายแถวเป็นเรื่องปกติ)

create unique index if not exists uq_credit_ledger_topup_ref
  on credit_ledger_e (ref)
  where action like 'topup:%' and ref is not null;

comment on index uq_credit_ledger_topup_ref is
  '1 charge (Omise) = เติมเครดิตได้ 1 ครั้งเท่านั้น — ด่านกัน race ระหว่าง webhook กับ polling (§12)';
