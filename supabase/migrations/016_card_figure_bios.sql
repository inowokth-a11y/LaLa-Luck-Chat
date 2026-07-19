-- เพิ่มประวัติ/เรื่องราวสั้นของบุคคลต้นแบบ (archetype_figure) ทั้ง 100 ใบ
-- ที่มา: figure_bios.py — ค้นคว้า+เขียนโดย Claude ในเซสชันนี้ ไม่ใช่ข้อมูลจากไฟล์ต้นฉบับ
-- (ตรวจสอบแล้วว่าไฟล์ต้นฉบับ Master_Energy_00_99 ไม่มีคอลัมน์ประวัติเลย)
--
-- ⚠️ สถานะการยืนยัน: มีแค่ 2/100 ที่ผ่านการค้นเว็บยืนยันจริงในเซสชันนี้ (เทพีไพเธีย,
-- เจ้าชายมิชกิน) ที่เหลือ 98 เขียนจากความรู้ทั่วไปที่เชื่อถือได้แต่ยังไม่ผ่านการค้นเว็บ
-- เจาะจง — ดูคอลัมน์ figure_bio_verified ต่อแถว

ALTER TABLE master_energy_cards
  ADD COLUMN IF NOT EXISTS figure_bio TEXT,
  ADD COLUMN IF NOT EXISTS figure_category TEXT, -- 'historical'|'religious'|'mythological'|'legendary'|'fictional'|'role_title'
  ADD COLUMN IF NOT EXISTS figure_bio_verified BOOLEAN DEFAULT false;

COMMENT ON COLUMN master_energy_cards.figure_category IS
  'historical=บุคคลจริง, religious=ศาสดา, mythological=เทพปกรณัม, legendary=กึ่งตำนาน, fictional=ตัวละครวรรณกรรม, role_title=ตำแหน่งไม่ใช่บุคคลเดียว — ใช้กำหนดโทนการนำเสนอ AI ให้ถูกต้อง (เช่น role_title ต้องบอกผู้ใช้ว่าไม่ใช่บุคคลเดียว)';
