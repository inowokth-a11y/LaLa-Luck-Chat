// prompt สร้าง "ภาพผู้ใช้ในบทบาทการ์ด" (เฟส 1 ของแผนภาพ OG เฉพาะบุคคล — 9 ส.ค. 2569)
//
// ที่มาของสไตล์: ไฟล์ `00-99+Prompt` ที่ผู้ใช้ส่ง — prompt ต้นฉบับที่ใช้วาดการ์ดจริงทั้ง 100 ใบ
// ส่วน "สูตรสไตล์" ตรวจแล้วคงที่ 100/100 prompt (คัดมาตรงๆ ไม่แต่งเพิ่ม) จึงยกมาเป็นแม่แบบ
//
// ⚠️ ส่วน "รายใบ" ของ PDF (เลข → archetype/คีย์เวิร์ด) **ใช้ไม่ได้** — ตรวจแล้วเป็นการ์ด
//    คนละชุดกับ production (ชื่อตรงกันแค่ 7/100 และไม่ใช่การเลื่อนเลข — น่าจะเป็นเวอร์ชันออกแบบ
//    รุ่นเก่า) → ตัวตนรายใบใช้ข้อมูลจริงจาก master_energy_00_99.json + ภาพการ์ดจริงเป็น
//    style reference แทน (data/card_gen_prompts.json เก็บไว้เพื่อ traceability เท่านั้น)
//
// หลักการ portrait (ตามแผน): เจนเฉพาะภาพเหมือนครึ่งตัว ไม่เจนทั้งการ์ด — กรอบ/แผงข้อความ/
// composite เป็นงานฝั่งเรา (฿0) และ portrait เดียวใช้ได้ทั้ง OG 1200×630 และสตอรี่ IG 1080×1920

/** สูตรสไตล์ทางการจากไฟล์ต้นฉบับ (ส่วนที่คงที่ 100/100 — ห้ามแก้ถ้อยคำโดยไม่เทียบไฟล์) */
export const CARD_ART_STYLE =
  "An artwork in the style of Cubist Brushwork mixed with Techno-Minimalism, accented with " +
  "elegant gold leaf details. Featuring expressive, visible brushstrokes and bold geometric " +
  "shapes, with some lines appearing like cracks filled with gold foil (Kintsugi style).";

import cardScenes from "../../data/card_gen_scenes.json";

/** ฉากประจำการ์ดจากไฟล์ prompt ต้นฉบับชุดที่ 2 (ตรวจแล้วชื่อตรง production 100/100 ใบ) */
const SCENES = cardScenes as Record<string, { name_en: string; name_th: string; scene: string }>;

/**
 * prompt เจนภาพผู้ใช้เป็นตัวละครของการ์ด — ใช้คู่กับรูปหน้าผู้ใช้ (identity reference)
 * และภาพการ์ดจริงของใบนั้น (style/scene reference) ที่ส่งเป็น image input
 *
 * ฉากรายใบมาจากไฟล์ prompt ต้นฉบับของจริง (data/card_gen_scenes.json) — ไม่ได้แต่งเอง
 */
export function faceCardPrompt(cardId: string): string {
  const sc = SCENES[cardId];
  const who = sc ? `"${sc.name_en}" (${sc.name_th})` : "the character shown in the second reference image";
  const scene = sc ? ` The scene depicts ${sc.scene}.` : "";
  return (
    `${CARD_ART_STYLE} ` +
    `Reimagine the person from the first reference photo as ${who}, matching the painted ` +
    `cubist style of the second reference image.${scene} ` +
    `Keep the person's facial identity clearly recognizable (face shape, hairstyle, skin tone) ` +
    `while rendering them fully in the painted cubist style. ` +
    `Half-body portrait, centered, looking slightly toward the viewer. ` +
    `Use the same color palette as the second reference image. ` +
    `No text, no letters, no numbers, no watermark, no frame. masterpiece, 4k`
  );
}

/** URL รูปการ์ดจริง (สูตรจาก CLAUDE.md §1.5 — bucket master_energy_cards) */
export function cardArtUrl(cardId: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/master_energy_cards/${cardId}-removebg-preview.png`;
}
