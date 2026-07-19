-- Logic 3 (Ubakong daytime table) + Logic 1 (Personal Year Guidance)
-- ทั้งสองตารางมาจากไฟล์จริงที่ผู้ใช้อัปโหลด (Ubakong_Time_Chart.xlsx,
-- Personal_Year_Guidance.xlsx) ไม่ใช่ข้อมูลที่สร้างขึ้นเอง

CREATE TABLE IF NOT EXISTS ubakong_time_chart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week TEXT NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  yam_name TEXT NOT NULL,
  meaning TEXT,
  prediction_status TEXT, -- 'ดี' | 'ดีมาก' | 'ร้าย'
  score INT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ubakong_day_time ON ubakong_time_chart(day_of_week, time_start, time_end);
-- ⚠️ ครอบคลุมแค่ยามกลางวัน (06:01-18:00, 5 ยาม/วัน = 35 แถว) ยามกลางคืนยังไม่มีข้อมูล

CREATE TABLE IF NOT EXISTS personal_year_guidance (
  personal_year_number INT PRIMARY KEY, -- 1-9, 11, 22, 33
  theme TEXT,
  prediction_overview TEXT,
  caution TEXT,
  opportunity TEXT,
  action_advice TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
