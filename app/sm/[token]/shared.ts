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

/** Buffer → data URI ตาม magic bytes จริง (บทเรียน fal ส่ง PNG ใน header jpeg — 21 ส.ค. 2569) */
export function imageBufferToDataUri(buf: Buffer): string {
  const kind = sniffImageType(buf) ?? "image/png";
  return `data:${kind};base64,${buf.toString("base64")}`;
}
