-- ⚠️ ยังไม่ครบ — เป็นจุดเริ่มต้นเท่านั้น ต้องออกแบบ policy ให้ครบทุกตารางก่อน production
-- หลักการที่ตกลงกันไว้: clinical fields ใน results table ห้ามหลุดข้าม Platform D ↔ E
-- (pre_clinical_intake, doctor_name, license_id, clinical_opinion,
--  medication_recommendations, caregiver_guidelines)

ALTER TABLE entity_relationship_graphs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own entity graphs"
  ON entity_relationship_graphs FOR ALL
  USING (auth.uid()::text = user_id);

ALTER TABLE oracle_binding_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own oracle sessions"
  ON oracle_binding_sessions FOR ALL
  USING (auth.uid()::text = user_id);

ALTER TABLE org_naming_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can only see their own naming sessions"
  ON org_naming_sessions FOR ALL
  USING (auth.uid()::text = user_id);

-- TODO: results table RLS ต้องแยก column-level ไม่ใช่แค่ row-level เพราะ clinical
-- fields ต้องซ่อนจาก Platform E โดยสิ้นเชิงแม้เป็นแถวของ user เดียวกัน — พิจารณาใช้
-- VIEW แยกสำหรับ Platform E ที่ SELECT เฉพาะ non-clinical columns แทนการเปิด RLS
-- ตรงๆ บนตารางที่มีข้อมูลอ่อนไหวปนอยู่
