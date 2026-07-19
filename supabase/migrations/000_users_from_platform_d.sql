-- ตาราง users (ฐานร่วม Platform D ↔ E) — ต้องรันก่อน 002-008/010 ที่มี FK REFERENCES users(id)
--
-- ⚠️ ที่มาของ schema นี้ (โปร่งใสตามหลัก CLAUDE.md — บอกเสมอว่าอะไร verify แล้ว/อะไรอนุมาน):
--   ✅ ชื่อคอลัมน์  = ของจริง จาก export ตาราง users ของ Platform D (41 คอลัมน์)
--   ✅ id เป็น TEXT = ยืนยันจาก FK ทั้งสองแพลตฟอร์ม (REFERENCES users(id) เป็น TEXT ทุกจุด)
--                     และรูปแบบ dvjId จริง (เช่น 'DEM-XXXX...')
--   ✅ occupation/special_skills/interests = จาก migration 034 ของ Platform D
--   ✅ line_user_id UNIQUE = จาก migration 031 ของ Platform D
--   ⚠️ ชนิดข้อมูล (type) = อนุมานจากค่าจริง 90 แถว ไม่ใช่จาก DDL ต้นฉบับ
--      (ไฟล์ 001 ของ Platform D ที่สร้างตารางนี้ "หายไป" — ชุด migration ของ D เริ่มที่ 002)
--      จุดที่ยังไม่ชัด: screen_width/screen_height (ข้อมูลว่างทั้ง 90 แถว เลยเดาเป็น INTEGER),
--      dob เก็บเป็น TEXT ตามข้อมูลจริง (ไม่ใช่ DATE)
--   ถ้าภายหลังได้ DDL ต้นฉบับจาก Platform D ควรเทียบและปรับให้ตรง
--
-- 🔒 ไฟล์นี้สร้าง "โครงตารางเปล่า" เท่านั้น ไม่มีการคัดลอกข้อมูลผู้ใช้จาก Platform D
--    (ตามกฎ data/sensitive/README.md — ห้ามข้อมูลหลุดข้าม D ↔ E)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- dvjId เช่น 'DEM-XXXXXXXX'

  -- ข้อมูลบุคคลพื้นฐาน
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  dob TEXT,                            -- เก็บเป็น TEXT ตามข้อมูลจริงของ D
  age INTEGER,
  birth_province TEXT,
  day_of_week TEXT,

  -- ธาตุ/โหราศาสตร์ (ใช้ร่วมกับ Platform E)
  thai_element TEXT,
  chinese_element TEXT,
  zodiac_sign TEXT,
  zodiac_element TEXT,
  zodiac_animal TEXT,
  indian_dosha TEXT,

  -- เปอร์เซ็นต์ธาตุจากชื่อ (Handoff §4.3)
  name_fire_pct INTEGER,
  name_earth_pct INTEGER,
  name_wind_pct INTEGER,
  name_water_pct INTEGER,

  -- เลขศาสตร์
  num_name INTEGER,
  num_surname INTEGER,
  num_birth INTEGER,
  num_fullname INTEGER,
  num_life INTEGER,                    -- เลขกำลังชีวิต

  -- ข้อมูลโปรไฟล์เพิ่มเติม (Platform D migration 034)
  occupation TEXT,
  special_skills TEXT,
  interests TEXT,

  -- ช่องทาง/แหล่งที่มา
  line_user_id TEXT UNIQUE,            -- Platform D migration 031
  referrer_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- เทเลเมทรีอุปกรณ์
  device_type TEXT,
  browser TEXT,
  os TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  ip_country TEXT,

  -- สถานะ/ความยินยอม
  pdpa_consent BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  is_super_admin BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

COMMENT ON TABLE users IS
  'ฐานผู้ใช้ร่วม Platform D (KRUTH MIND) ↔ E (KRUTH ELEMENT). schema ประกอบจาก export จริงของ D + migration 031/034 — type อนุมานจากข้อมูล ไม่ใช่ DDL ต้นฉบับ (ไฟล์ 001 ของ D หายไป). ⚠️ ฟิลด์คลินิกของ D อยู่ในตาราง results/category_flags ห้ามนำเข้ามาฝั่ง E (ดู CLAUDE.md §7)';
