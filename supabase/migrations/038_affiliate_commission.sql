-- 038: อัตราคอมมิชชันต่อลิงก์ + บันทึกการจ่ายจริง (ผู้ใช้ตัดสิน 3 ส.ค. 2569:
-- เริ่มต้น 15% ปรับได้รายลิงก์ผ่านหน้าแอดมิน · จ่ายตามรายได้จริงตามหลัก §12 เดิม)
--
-- ค่าคอมที่ "ควรจ่าย" ไม่เก็บซ้ำ — คำนวณตอนอ่านจาก รายรับจริง × commission_pct
-- (แหล่งความจริงเดียวเช่นเดียวกับรายรับ) · ตารางนี้เก็บเฉพาะ "การจ่ายที่เกิดขึ้นแล้ว"

ALTER TABLE affiliate_links_e
  ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2) NOT NULL DEFAULT 15
    CHECK (commission_pct >= 0 AND commission_pct <= 100);

COMMENT ON COLUMN affiliate_links_e.commission_pct IS
  'เปอร์เซ็นต์คอมมิชชันจากรายรับจริงของผู้ใช้ที่มาจากลิงก์นี้ — ค่าเริ่มต้น 15 แก้ได้รายลิงก์ที่หน้าแอดมิน';

CREATE TABLE IF NOT EXISTS affiliate_payouts_e (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id    uuid NOT NULL REFERENCES affiliate_links_e(id) ON DELETE CASCADE,
  amount_thb numeric(12,2) NOT NULL CHECK (amount_thb > 0),
  note       text,           -- ช่องทางจ่าย/เลขอ้างอิงโอน
  created_by text NOT NULL,  -- อีเมลแอดมินผู้บันทึก
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_payout_link ON affiliate_payouts_e (link_id, created_at DESC);

ALTER TABLE affiliate_payouts_e ENABLE ROW LEVEL SECURITY;
-- ไม่มี policy โดยเจตนา (แพทเทิร์นเดียวกับ 034) — client แตะไม่ได้ อ่าน/เขียนผ่าน service role ในหน้าแอดมินเท่านั้น
