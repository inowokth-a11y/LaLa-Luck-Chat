// Logic 7 — ฮวงจุ้ย (ทิศ/รูปทรง/สีของพื้นที่ เทียบกับธาตุประจำตัว)
//
// ที่มา: docs/source-materials/KRUTH_ELEMENT_Platform_E_Handoff_v1.md §4.3 + §Logic 7
//
// 🔴 **แก้ความเข้าใจผิดใน §3 ของ CLAUDE.md** — Logic 7 ถูกจัดรวมกับ 5,6 ว่า "ต้องใช้ Vision API"
//    แต่สเปกจริงเป็น**ฟอร์มกรอกข้อมูลล้วนๆ** ไม่มีการอ่านภาพเลย
//
// ⚠️ **ตัดสินใจร่วมกับผู้ใช้ (19 ก.ค. 2569): คงธาตุ "ทอง" ไว้ ไม่ยุบเป็น "ดิน"**
//    เอกสารต้นทางแปลง ทอง→ดิน ตามระบบ 4 ธาตุไทย ซึ่งทำให้ **4 ใน 9 ทิศกลายเป็นดินเหมือนกันหมด**
//    (ตะวันตก · ตะวันตกเฉียงเหนือ · ตะวันออกเฉียงเหนือ · ตะวันตกเฉียงใต้) — เสียความละเอียด
//    ของคำแนะนำไปมาก ในเมื่อ `wuXingScore()` รองรับ 5 ธาตุอยู่แล้ว จึงคงทองไว้ตามตำราฮวงจุ้ยจีน
//    **นี่คือจุดที่ต่างจากสเปกโดยตั้งใจ** — ถ้าจะย้อนกลับต้องถามผู้ใช้ก่อน
//
// ⚠️ ยังไม่ครอบคลุม: Flying Stars (ดาวเหิน 9 ยุค) เป็นศาสตร์แยกทั้งระบบ ดู CLAUDE.md §3.6

import { wuXingScore, THAI_LABEL_5, type Element5, type WuXingResult } from "./element";

export type Direction =
  | "เหนือ" | "ใต้" | "ตะวันออก" | "ตะวันตก"
  | "ตะวันออกเฉียงเหนือ" | "ตะวันออกเฉียงใต้"
  | "ตะวันตกเฉียงเหนือ" | "ตะวันตกเฉียงใต้"
  | "กลาง";

/**
 * ทิศ → ธาตุ (ปากัว/เบญจธาตุจีน)
 * ตรงกับตำราฮวงจุ้ยจีนมาตรฐาน: เหนือ=น้ำ · ใต้=ไฟ · ออก/ออกเฉียงใต้=ไม้ ·
 * ตก/ตกเฉียงเหนือ=ทอง · ออกเฉียงเหนือ/ตกเฉียงใต้/กลาง=ดิน
 */
export const DIRECTION_TO_ELEMENT: Record<Direction, Element5> = {
  เหนือ: "Water",
  ใต้: "Fire",
  ตะวันออก: "Wood",
  ตะวันออกเฉียงใต้: "Wood",
  ตะวันตก: "Metal",
  ตะวันตกเฉียงเหนือ: "Metal",
  ตะวันออกเฉียงเหนือ: "Earth",
  ตะวันตกเฉียงใต้: "Earth",
  กลาง: "Earth",
};

export const ALL_DIRECTIONS = Object.keys(DIRECTION_TO_ELEMENT) as Direction[];

/** สี → ธาตุ (จาก Handoff บรรทัด 315 — คืนธาตุทองให้กลุ่มโลหะตามการตัดสินใจข้างบน) */
export const COLOR_TO_ELEMENT: Record<string, Element5> = {
  แดง: "Fire", แดงเข้ม: "Fire", ส้ม: "Fire", ชมพูร้อน: "Fire", แดงส้ม: "Fire", ทับทิม: "Fire",
  เหลือง: "Earth", เหลืองทอง: "Earth", น้ำตาล: "Earth", ครีม: "Earth", เบจ: "Earth",
  เขียว: "Wood", เขียวอ่อน: "Wood", เขียวเข้ม: "Wood", เขียวมิ้นท์: "Wood", ม่วง: "Wood",
  น้ำเงิน: "Water", ฟ้า: "Water", ดำ: "Water", เทาเข้ม: "Water", ม่วงน้ำเงิน: "Water", ชมพูอ่อน: "Water",
  // กลุ่มโลหะ — เอกสารเดิมยุบเป็นดิน ที่นี่คงเป็นทอง
  ขาว: "Metal", เงิน: "Metal", ทอง: "Metal", เทา: "Metal", เทาอ่อน: "Metal",
};

/** รูปทรง → ธาตุ (จาก Handoff บรรทัด 346) */
export const SHAPE_TO_ELEMENT: Record<string, Element5> = {
  สามเหลี่ยม: "Fire", แหลม: "Fire", พุ่งขึ้น: "Fire", ดาว: "Fire", เปลวเพลิง: "Fire",
  สี่เหลี่ยมจัตุรัส: "Earth", สี่เหลี่ยมผืนผ้าแนวนอน: "Earth", แนวราบ: "Earth", เตี้ยกว้าง: "Earth",
  สี่เหลี่ยมผืนผ้าแนวตั้ง: "Wood", สูงชะลูด: "Wood", เส้นตรงแนวตั้ง: "Wood",
  วงกลม: "Water", วงรี: "Water", คลื่น: "Water", อิสระ: "Water", ไร้เหลี่ยม: "Water",
  หยดน้ำ: "Water", โค้ง: "Water", อาร์ค: "Water",
  // กลุ่มโลหะ — เอกสารเดิมยุบเป็นดิน ที่นี่คงเป็นทอง
  กลม: "Metal", ครึ่งวงกลม: "Metal",
};

/** ธาตุ → สีที่แนะนำใช้แก้ (ใช้ตอนเสนอวิธีปรับพื้นที่) */
export const ELEMENT_TO_COLORS: Record<Element5, string[]> = {
  Fire: ["แดง", "ส้ม", "ชมพูร้อน"],
  Earth: ["เหลือง", "น้ำตาล", "ครีม", "เบจ"],
  Wood: ["เขียว", "เขียวเข้ม", "ม่วง"],
  Metal: ["ขาว", "เงิน", "ทอง", "เทา"],
  Water: ["น้ำเงิน", "ฟ้า", "ดำ"],
};

export type Purpose = "bedroom" | "office" | "living" | "entrance";

export const PURPOSE_LABELS: Record<Purpose, string> = {
  bedroom: "ห้องนอน",
  office: "โต๊ะทำงาน/ห้องทำงาน",
  living: "ห้องนั่งเล่น",
  entrance: "ทางเข้า/ประตูหลัก",
};

export interface SpaceInput {
  direction: Direction;
  shape?: string | null;
  color?: string | null;
  purpose: Purpose;
}

export interface AspectAnalysis {
  aspect: "ทิศ" | "รูปทรง" | "สี";
  value: string;
  element: Element5;
  element_th: string;
  result: WuXingResult;
}

export interface Recommendation {
  issue: string;
  fix: string;
}

export interface FengShuiResult {
  user_element: Element5;
  user_element_th: string;
  aspects: AspectAnalysis[];
  recommendations: Recommendation[];
  /** ทิศที่ส่งเสริมผู้ใช้มากที่สุด (คะแนนเท่ากันเรียงตามลำดับทิศ) */
  lucky_directions: Array<{ direction: Direction; element_th: string; score: number }>;
  /** ทิศที่ควรระวังที่สุด */
  caution_directions: Array<{ direction: Direction; element_th: string; score: number }>;
}

/**
 * หา "ธาตุที่ใช้แก้" เมื่อพื้นที่ขัดกับผู้ใช้
 * หลักเบญจธาตุ: ธาตุที่ผู้ใช้ให้กำเนิด จะดูดพลังที่ปะทะออกไปโดยไม่ปะทะกลับ
 * (วงจรกำเนิด Wood→Fire→Earth→Metal→Water→Wood)
 */
const GENERATING: Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];
export function remedyElement(userElement: Element5): Element5 {
  const i = GENERATING.indexOf(userElement);
  return GENERATING[(i + 1) % GENERATING.length];
}

function analyzeAspect(
  aspect: AspectAnalysis["aspect"],
  value: string | null | undefined,
  table: Record<string, Element5>,
  userElement: Element5,
  missing: readonly Element5[]
): AspectAnalysis | null {
  if (!value) return null;
  const element = table[value];
  if (!element) return null; // ค่าที่ไม่มีในตาราง — ข้ามไป ไม่เดา
  return {
    aspect,
    value,
    element,
    element_th: THAI_LABEL_5[element],
    result: wuXingScore(userElement, element, [...missing]),
  };
}

/**
 * วิเคราะห์พื้นที่ตามฮวงจุ้ย
 * @param userElement ธาตุเด่นของผู้ใช้ (จาก calculateElementSeed().dominant)
 * @param missing ธาตุที่ผู้ใช้ขาด — ใช้ตัดสิน Productive Clash
 */
export function analyzeFengShui(
  userElement: Element5,
  missing: readonly Element5[],
  space: SpaceInput
): FengShuiResult {
  const aspects: AspectAnalysis[] = [];
  const dir = analyzeAspect("ทิศ", space.direction, DIRECTION_TO_ELEMENT, userElement, missing);
  if (dir) aspects.push(dir);
  const shape = analyzeAspect("รูปทรง", space.shape, SHAPE_TO_ELEMENT, userElement, missing);
  if (shape) aspects.push(shape);
  const color = analyzeAspect("สี", space.color, COLOR_TO_ELEMENT, userElement, missing);
  if (color) aspects.push(color);

  const remedy = remedyElement(userElement);
  const recommendations: Recommendation[] = [];
  for (const a of aspects) {
    // Productive Clash = ธาตุที่ขาดกลายเป็นยา → ไม่ต้องแก้ ถือเป็นข้อดี
    if (a.result.final_score >= 0) continue;
    recommendations.push({
      issue: `${a.aspect}${a.value} เป็นธาตุ${a.element_th} ซึ่งขัดกับธาตุ${THAI_LABEL_5[userElement]}ของคุณ`,
      fix: `เพิ่มสี${ELEMENT_TO_COLORS[remedy].slice(0, 2).join("/")} หรือของตกแต่งธาตุ${THAI_LABEL_5[remedy]} ในพื้นที่นี้ เพื่อผ่อนแรงปะทะ`,
    });
  }
  if (recommendations.length === 0 && aspects.length > 0) {
    recommendations.push({
      issue: "ไม่พบจุดที่ขัดกับธาตุประจำตัวของคุณ",
      fix: `รักษาบรรยากาศเดิมไว้ และเสริมด้วยสี${ELEMENT_TO_COLORS[userElement][0]} เพื่อหนุนธาตุเด่นให้ชัดขึ้น`,
    });
  }

  const ranked = ALL_DIRECTIONS.map((d) => {
    const el = DIRECTION_TO_ELEMENT[d];
    return {
      direction: d,
      element_th: THAI_LABEL_5[el],
      score: wuXingScore(userElement, el, [...missing]).final_score,
    };
  });
  const sortedDesc = [...ranked].sort((a, b) => b.score - a.score);
  const sortedAsc = [...ranked].sort((a, b) => a.score - b.score);

  return {
    user_element: userElement,
    user_element_th: THAI_LABEL_5[userElement],
    aspects,
    recommendations,
    lucky_directions: sortedDesc.filter((x) => x.score === sortedDesc[0].score),
    caution_directions: sortedAsc.filter((x) => x.score === sortedAsc[0].score && x.score < 0),
  };
}
