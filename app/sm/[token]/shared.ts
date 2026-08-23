// ตัวช่วยร่วมหน้าแชร์ภาพเนื้อคู่ /sm/<token> (page + opengraph-image)
//
// 🔴 เนื้อหา: ภาพบุคคลสมมติจาก AI + คำบรรยายจาก engine เท่านั้น — ไม่มีข้อมูลส่วนตัวเจ้าของ
//    และทุกจุดแสดงต้องมีป้าย "ภาพจินตนาการจาก AI ไม่ใช่บุคคลจริง" (นโยบายเดิมของโหมดเนื้อคู่)

import { createServiceClient } from "@/lib/supabase/server";
import { isValidShareToken } from "@/lib/soulmate/store";
import { sniffImageType } from "@/lib/vision/image";

export interface SoulmateShare {
  partner_element: string;
  image_paths: string[];
  captions: string[];
}

export async function fetchSoulmateShare(token: string): Promise<SoulmateShare | null> {
  if (!isValidShareToken(token)) return null;
  const svc = createServiceClient();
  const { data } = await svc
    .from("soulmate_gen_e")
    .select("partner_element, image_paths, captions")
    .eq("share_token", token)
    .maybeSingle();
  if (!data) return null;
  const row = data as SoulmateShare;
  if (!Array.isArray(row.image_paths) || row.image_paths.length === 0) return null;
  return row;
}

/**
 * ตัดอักษร CJK ออกจากข้อความที่จะวาดด้วย satori — ฟอนต์ NotoSansThai ไม่มี glyph จีน
 * (relation_th ของ wuXing มีคำกำกับจีน เช่น 印/泄/通關 → ขึ้นกล่อง tofu ใน OG/สตอรี่ เจอจริง 23 ส.ค. 2569)
 * ใช้เฉพาะตอนวาดภาพ — หน้าเว็บจริงแสดงจีนได้ปกติ (ฟอนต์ระบบมี)
 */
export function stripCjkForSatori(s: string): string {
  // \u2605\u2606 (U+2605-2606) \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48 emoji \u2014 satori \u0E43\u0E0A\u0E49\u0E1F\u0E2D\u0E19\u0E15\u0E4C\u0E15\u0E23\u0E07\u0E46 \u0E41\u0E25\u0E49\u0E27 tofu (\u0E40\u0E08\u0E2D\u0E08\u0E23\u0E34\u0E07\u0E43\u0E19\u0E2A\u0E15\u0E2D\u0E23\u0E35\u0E48)
  return s
    .replace(/[\u2605\u2606\u2E80-\u9FFF\uF900-\uFAFF]/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Buffer → data URI ตาม magic bytes จริง (บทเรียน fal ส่ง PNG ใน header jpeg — 21 ส.ค. 2569) */
export function imageBufferToDataUri(buf: Buffer): string {
  const kind = sniffImageType(buf) ?? "image/png";
  return `data:${kind};base64,${buf.toString("base64")}`;
}
