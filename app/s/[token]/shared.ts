// ตัวช่วยร่วมของหน้าแชร์ face-card /s/<token> (page + opengraph-image + story ใช้ชุดเดียวกัน)
//
// 🔴 ความเป็นส่วนตัว: หน้าแชร์เปิดด้วย token สุ่มที่เจ้าของกดแชร์เองเท่านั้น — เนื้อหามีแค่
//    "ภาพผลงานศิลปะ + ข้อมูลการ์ดสาธารณะ" ไม่มีชื่อ/วันเกิด/ข้อมูลส่วนตัวใดๆ ของเจ้าของ

import { createServiceClient } from "@/lib/supabase/server";
import { isValidShareToken } from "@/lib/face-card/store";
import { sniffImageType } from "@/lib/vision/image";

/**
 * Buffer ภาพ → data URI โดยดู mime จาก magic bytes จริง — **ห้ามเดาจากนามสกุลไฟล์**
 * (บทเรียน 21 ส.ค. 2569: fal คืนไฟล์ PNG ทั้งที่ header บอก jpeg → satori ใช้ parser ผิดตัว
 * พัง "Offset is outside the bounds of the DataView" ตอนวาด OG/สตอรี่)
 */
export function imageBufferToDataUri(buf: Buffer): string {
  const kind = sniffImageType(buf) ?? "image/png";
  return `data:${kind};base64,${buf.toString("base64")}`;
}

export interface ShareGen {
  card_id: string;
  image_path: string;
}

export interface ShareCardInfo {
  energy_id: string;
  energy_name: string | null;
  archetype_figure: string | null;
  figure_category: string | null;
}

/** lookup token → ผลงาน + ข้อมูลการ์ดสาธารณะ (service role — ตารางไม่มี anon policy) */
export async function fetchShareData(token: string): Promise<{ gen: ShareGen; card: ShareCardInfo | null } | null> {
  if (!isValidShareToken(token)) return null;
  const svc = createServiceClient();
  const { data: gen } = await svc
    .from("face_card_gen_e")
    .select("card_id, image_path")
    .eq("share_token", token)
    .maybeSingle();
  if (!gen) return null;
  const { data: card } = await svc
    .from("master_energy_cards")
    .select("energy_id, energy_name, archetype_figure, figure_category")
    .eq("energy_id", (gen as ShareGen).card_id)
    .maybeSingle();
  return { gen: gen as ShareGen, card: (card as ShareCardInfo) ?? null };
}
