-- Logic 3 ส่วนขยาย: กาลโยค (ธงชัย/อธิบดี/อุบาทว์/โลกาวินาศ) — ระดับปี/วัน
-- สูตร verify แล้วกับตัวอย่างเฉลยจริงจากวิกิพีเดีย (จ.ศ. 1369) ตรงเป๊ะยกเว้น
-- 1 จุดที่ต้นฉบับพิมพ์ผิดเอง (ดู kala_yoke_engine.py comment)
--
-- ไม่ seed เป็นข้อมูลตายตัว เพราะคำนวณจากสูตรได้ตรงๆ ทุกปี (ต่างจาก Ubakong ที่
-- เป็นตารางค่าคงที่) — เก็บผลลัพธ์ที่คำนวณแล้วไว้ cache ต่อปีแทน เพื่อไม่ต้อง
-- คำนวณซ้ำทุกครั้งที่ query

CREATE TABLE IF NOT EXISTS kala_yoke_by_year (
  chulasakarat_year INT PRIMARY KEY,
  thongchai_day TEXT NOT NULL,   -- ธงชัย (ดี) — วันในสัปดาห์
  athibodee_day TEXT NOT NULL,   -- อธิบดี (ดี)
  ubat_day TEXT NOT NULL,        -- อุบาทว์ (ร้าย)
  lokawinat_day TEXT NOT NULL,   -- โลกาวินาศ (ร้าย)
  computed_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE kala_yoke_by_year IS
  'Cache ผลคำนวณกาลโยครายปี — คำนวณจริงด้วย kala_yoke_engine.calculate_kala_yoke(), ตารางนี้แค่เก็บผลลัพธ์ไม่ให้คำนวณซ้ำ ไม่ใช่แหล่งข้อมูลต้นทาง';
