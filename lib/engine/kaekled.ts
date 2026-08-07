// แนวทางแก้เคล็ดความฝัน — เปิดใช้ `Unified_Kaekled_DB` ที่อยู่ใน data/raw-uploads มาตั้งแต่ต้น
// โปรเจกต์แต่ไม่เคยถูกเปิดอ่านเลย (เฟส 2 "อาณาจักรทำนายฝัน" 7 ส.ค. 2569)
//
// ไฟล์ต้นทางมี 8 สัญลักษณ์ที่คนฝันบ่อยที่สุดและกังวลที่สุด (ผี · ศพ · งู · จระเข้ · ฟันหัก ·
// เลือด · ไฟไหม้ · ถูกไล่ล่า) พร้อมข้อมูลครบชุด: ขีดอักษรคังซี · ธาตุ · ความหมาย ·
// วิธีแก้เคล็ด 3 ศาสตร์ (ไทย/จีน/ฮินดู) · ธาตุเชื่อม + กิจกรรม · บทสวด
//
// 🔴 กฎที่ค้นพบและตรวจแล้ว 8/8 แถว: **ธาตุเชื่อม = ธาตุที่สัญลักษณ์ให้กำเนิด** (วงจรกำเนิด)
//    น้ำ→ไม้ · ดิน→ทอง · ไฟ→ดิน · ทอง→น้ำ  (สัญลักษณ์ 2 ธาตุใช้ธาตุแรก: งู ไฟ/ดิน → ดิน)
//    หลักคือ "ผ่อนแรงของสิ่งที่ฝัน ให้ไหลไปเป็นการเติบโต" ไม่ใช่ปะทะกลับ
//    → ใช้กฎเดียวกันนี้ต่อยอดกับสัญลักษณ์อื่นได้ทั้ง 400+ ตัว แต่ต้องบอกผู้ใช้ตรงๆ ว่าอันไหน
//      "มีระบุในตำราแก้เคล็ด" อันไหน "อนุมานจากหลักธาตุเดียวกัน" (ดู field `source`)
//
// ⚠️ เนื้อหาแก้เคล็ด/บทสวดเป็นความเชื่อและพิธีกรรมตามตำรา — คัดลอกตรงจากไฟล์ต้นทาง ไม่แต่งเพิ่ม
//    ห้ามนำเสนอเป็นคำสั่งหรือคำรับประกันผล (KAEKLED_CAVEAT บังคับแสดงทุกครั้ง)

import { THAI_LABEL_5, type Element5 } from "./element";
import { ELEMENT_TO_COLORS } from "./fengshui";
import { getWellnessPair } from "./wellness";
import kaekledData from "../../data/kaekled_remedies.json";

export const KAEKLED_CAVEAT =
  "แนวทางแก้เคล็ดและบทสวดเป็นความเชื่อและพิธีกรรมตามตำรา นำไปปฏิบัติได้ตามศรัทธา " +
  "ใช้เพื่อความสบายใจและการตั้งสติ ไม่ใช่คำรับประกันผล และไม่ใช้แทนการแก้ปัญหาตามความเป็นจริง";

/** ธาตุที่ธาตุนี้ให้กำเนิด — ตัวเดียวกับ "ธาตุเชื่อม" ในตำราแก้เคล็ด (ตรวจแล้ว 8/8 แถว) */
const GENERATES: Record<Element5, Element5> = {
  Wood: "Fire",
  Fire: "Earth",
  Earth: "Metal",
  Metal: "Water",
  Water: "Wood",
};

export function bridgingElement(el: Element5): Element5 {
  return GENERATES[el];
}

export interface KaekledRow {
  category: string;
  object: string;
  aliases: string[];
  elements: Element5[];
  kangxi_strokes: number;
  meaning: string;
  thai_remedy: string;
  chinese_remedy: string;
  hindu_remedy: string;
  bridging_element: Element5;
  bridging_activity: string;
  mantra_name: string;
  mantra_detail: string;
}

export const KAEKLED_ROWS = kaekledData as KaekledRow[];

export interface KaekledGuidance {
  สัญลักษณ์: string;
  /** "ตำราแก้เคล็ด" = คัดจากไฟล์ต้นทางตรงๆ · "หลักธาตุ" = อนุมานด้วยกฎธาตุเชื่อมเดียวกัน */
  source: "ตำราแก้เคล็ด" | "หลักธาตุ";
  ธาตุของสัญลักษณ์: string;
  ธาตุเชื่อม: string;
  แนวทางไทย?: string;
  แนวทางจีน?: string;
  แนวทางฮินดู?: string;
  กิจกรรมเปลี่ยนพลัง: string;
  บทสวด?: { ชื่อ: string; บท: string };
  สีเสริมธาตุเชื่อม: string[];
}

/** ตัดวงเล็บ/ช่องว่างให้เทียบชื่อสัญลักษณ์ข้ามสองฐานข้อมูลได้ */
function norm(s: string): string {
  return s.replace(/\(.*?\)/g, "").replace(/\s+/g, "").trim();
}

/** หาแถวตำราแก้เคล็ดที่ตรงกับชื่อสัญลักษณ์ (เทียบทั้งชื่อเต็มและชื่อย่อยที่คั่นด้วย /) */
export function findKaekledRow(dreamObject: string): KaekledRow | null {
  const target = norm(dreamObject);
  if (!target) return null;
  for (const row of KAEKLED_ROWS) {
    for (const alias of row.aliases) {
      const a = norm(alias);
      if (a && (target.includes(a) || a.includes(target))) return row;
    }
  }
  return null;
}

const THAI_EL_TO_KEY: Record<string, Element5> = {
  ไฟ: "Fire",
  ดิน: "Earth",
  ทอง: "Metal",
  น้ำ: "Water",
  ไม้: "Wood",
  ลม: "Wood", // ฐานข้อมูลความฝันใช้ระบบ 4 ธาตุไทย ("ลม" = ไม้ในระบบ 5 ธาตุ)
};

export function elementKeyFromThai(thai: string): Element5 | null {
  const first = thai.split("/")[0].trim();
  return THAI_EL_TO_KEY[first] ?? null;
}

/**
 * แนวทางแก้เคล็ดของสัญลักษณ์หนึ่ง — ใช้ตำราก่อนเสมอ ถ้าไม่มีจึงอนุมานด้วยกฎธาตุเชื่อม
 * @param dreamObject ชื่อสัญลักษณ์จากฐานความฝัน
 * @param elementThai ธาตุของสัญลักษณ์ (ป้ายไทยจากฐานความฝัน)
 */
export function kaekledFor(dreamObject: string, elementThai: string): KaekledGuidance | null {
  const row = findKaekledRow(dreamObject);
  if (row) {
    return {
      สัญลักษณ์: row.object,
      source: "ตำราแก้เคล็ด",
      ธาตุของสัญลักษณ์: row.elements.map((e) => THAI_LABEL_5[e]).join(" / "),
      ธาตุเชื่อม: THAI_LABEL_5[row.bridging_element],
      แนวทางไทย: row.thai_remedy,
      แนวทางจีน: row.chinese_remedy,
      แนวทางฮินดู: row.hindu_remedy,
      กิจกรรมเปลี่ยนพลัง: row.bridging_activity,
      บทสวด: row.mantra_name ? { ชื่อ: row.mantra_name, บท: row.mantra_detail } : undefined,
      สีเสริมธาตุเชื่อม: ELEMENT_TO_COLORS[row.bridging_element].slice(0, 3),
    };
  }

  const el = elementKeyFromThai(elementThai);
  if (!el) return null;
  const bridge = bridgingElement(el);
  const pair = getWellnessPair(bridge);
  const activity =
    "error" in pair
      ? `เพิ่มกิจกรรมที่เสริมธาตุ${THAI_LABEL_5[bridge]} ในชีวิตประจำวัน`
      : `${pair.external} (ภายนอก) · ${pair.internal} (ภายใน)`;
  return {
    สัญลักษณ์: dreamObject,
    source: "หลักธาตุ",
    ธาตุของสัญลักษณ์: elementThai,
    ธาตุเชื่อม: THAI_LABEL_5[bridge],
    กิจกรรมเปลี่ยนพลัง: activity,
    สีเสริมธาตุเชื่อม: ELEMENT_TO_COLORS[bridge].slice(0, 3),
  };
}

/** แนวทางของทุกสัญลักษณ์ที่จับได้ในฝันหนึ่งครั้ง — ตำรามาก่อน แล้วค่อยหลักธาตุ (จำกัด 3 รายการ) */
export function kaekledForSymbols(
  symbols: readonly { dream_object: string; element: string }[]
): { รายการ: KaekledGuidance[]; หมายเหตุ: string } {
  const seen = new Set<string>();
  const out: KaekledGuidance[] = [];
  for (const s of symbols) {
    const g = kaekledFor(s.dream_object, s.element);
    if (!g || seen.has(g.สัญลักษณ์)) continue;
    seen.add(g.สัญลักษณ์);
    out.push(g);
  }
  // ตำราก่อนหลักธาตุ แล้วตัดเหลือ 3 (คำตอบยาวเกินไปผู้ใช้ไม่อ่าน)
  out.sort((a, b) => (a.source === b.source ? 0 : a.source === "ตำราแก้เคล็ด" ? -1 : 1));
  return { รายการ: out.slice(0, 3), หมายเหตุ: KAEKLED_CAVEAT };
}
