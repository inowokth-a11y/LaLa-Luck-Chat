-- 039: เลเยอร์การแชร์ต่อของแอฟฟิลิเอต (ผู้ใช้สั่ง 3 ส.ค. 2569)
--
-- โจทย์: ผู้ใช้ที่มาจากลิงก์พันธมิตร X แชร์การ์ดต่อ → คนที่กดแชร์แล้วสมัครต้องถูกผูกกลับ
-- ไปลิงก์ X ด้วย (ref ไหลตามการแชร์เป็นทอดๆ) และแยกให้เห็นว่ายอดไหนมาจาก "คลิกลิงก์ตรง"
-- vs "แชร์ต่อ" — วัดว่าพันธมิตรคนไหนพา traffic ที่ viral จริง
--
-- via ของ attribution: 'link' = คลิกลิงก์พันธมิตรตรง · 'share' = ผ่านการ์ดที่ผู้ใช้แชร์ต่อ

ALTER TABLE affiliate_attributions_e
  ADD COLUMN IF NOT EXISTS via text NOT NULL DEFAULT 'link'
    CHECK (via IN ('link', 'share'));

COMMENT ON COLUMN affiliate_attributions_e.via IS
  'ทางที่ผู้ใช้เข้ามา: link = คลิกลิงก์พันธมิตรตรง · share = ผ่านการ์ดที่ผู้ใช้คนอื่นแชร์ต่อ (ref ไหลตามแชร์)';

ALTER TABLE affiliate_links_e
  ADD COLUMN IF NOT EXISTS share_visit_count bigint NOT NULL DEFAULT 0;

COMMENT ON COLUMN affiliate_links_e.share_visit_count IS
  'จำนวนการเปิดผ่านการ์ดที่แชร์ต่อ (subset แนวคิดเดียวกับ visit_count ซึ่งนับรวมทุกทาง)';

-- แทน RPC เดิมด้วยเวอร์ชันรับธง p_share (default false → เรียกแบบเดิมได้)
DROP FUNCTION IF EXISTS bump_affiliate_visit(text);
CREATE OR REPLACE FUNCTION bump_affiliate_visit(p_code text, p_share boolean DEFAULT false)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE affiliate_links_e
     SET visit_count = visit_count + 1,
         share_visit_count = share_visit_count + (CASE WHEN p_share THEN 1 ELSE 0 END)
   WHERE code = p_code AND active;
$$;

REVOKE ALL ON FUNCTION bump_affiliate_visit(text, boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION bump_affiliate_visit(text, boolean) TO service_role;
