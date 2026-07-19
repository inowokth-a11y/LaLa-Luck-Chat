-- เปิดสิทธิ์ "อ่านสาธารณะ" ให้ตารางฐานความรู้ (content) ตามที่ตกลงไว้ใน CLAUDE.md §7:
--   "ตารางฐานความรู้ (การ์ด/สัญลักษณ์ฝัน/ธีม) เป็นข้อมูลสาธารณะที่ทุก user อ่านได้หมด
--    แต่การเขียน (INSERT/UPDATE) ควรจำกัดเฉพาะ service role หรือ admin เท่านั้น"
--
-- ที่มาของปัญหา: migration 010 เปิด RLS ให้ทุกตาราง แต่สร้าง policy เฉพาะตารางข้อมูลผู้ใช้
-- ทำให้ฐานความรู้ถูกล็อกไปด้วย → client ที่ใช้ anon key อ่านได้ 0 แถว (เงียบๆ ไม่ error)
-- ตรวจพบตอน verify ฐานข้อมูลจริงหลังรัน migration
--
-- หมายเหตุความปลอดภัย: policy นี้ให้แค่ SELECT — INSERT/UPDATE/DELETE ยังถูกปฏิเสธ
-- โดยปริยาย (ไม่มี policy) ฝั่ง service role ข้าม RLS อยู่แล้วจึงเขียนได้ตามปกติ
-- ตารางข้อมูลผู้ใช้ (users, subscriptions, chat_sessions, *_e ฯลฯ) ไม่แตะ — ยังล็อกตามเดิม

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'master_energy_cards',
    'dream_symbols',
    'dream_psychology_themes',
    'ubakong_time_chart',
    'personal_year_guidance',
    'wellness_activities',
    'kala_yoke_by_year'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'public read ' || t, t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (true)', 'public read ' || t, t);
  END LOOP;
END $$;
