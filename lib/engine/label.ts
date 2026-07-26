// คะแนนองค์ประกอบฉลาก — ลวดลาย/สี/รูปทรง เทียบกับธาตุประจำแบรนด์ (Logic 7 ต่อยอด)
//
// 🔴 ใช้โมเดลความสัมพันธ์ธาตุ "เดียวกับฮวงจุ้ย/compatibility" เป๊ะ:
//    wuXingScore(ธาตุแบรนด์, ธาตุองค์ประกอบ, ธาตุที่แบรนด์ขาด)
//    → แบรนด์ให้กำเนิดองค์ประกอบ = +2 (ดีสุด) · ธาตุเดียวกัน = +1 · พิฆาต = -2 ·
//      องค์ประกอบที่พิฆาตแต่ "แบรนด์ขาดธาตุนั้น" → พลิกเป็น +2 (Productive Clash)
//
// ⚠️ MOTIF_TO_ELEMENT เป็นการจัดเอง ยัง verify กับตำราไม่ได้ (§5) — โดยเฉพาะ "ลายกนก"
//    ตั้งเป็น "ไฟ" (มาจากรูปเปลวไฟ) แต่บางสำนักมองเป็นเถาไม้=ไม้ → พลิกได้ในตารางนี้จุดเดียว

import { wuXingScore, THAI_LABEL_5, type Element5 } from "./element";
import { COLOR_TO_ELEMENT, SHAPE_TO_ELEMENT, ELEMENT_TO_COLORS } from "./fengshui";

export const LABEL_COMPOSITION_CAVEAT =
  "คะแนนองค์ประกอบใช้หลักเบญจธาตุ (วงจรกำเนิด/พิฆาต) เดียวกับฮวงจุ้ย — เป็นแนวทางเชิงสัญลักษณ์ " +
  "ตาราง 'ลวดลาย→ธาตุ' จัดขึ้นเอง ยังไม่ผ่านการตรวจกับตำรา (โดยเฉพาะลายไทย) โปรดใช้วิจารณญาณ";

/** ลวดลาย/ภาพ → ธาตุ · key เป็นคำไทยที่มักปรากฏในคำขอของผู้ใช้ (จับแบบ substring) */
export const MOTIF_TO_ELEMENT: Record<string, Element5> = {
  // ไม้ — พืชพรรณ เติบโต
  ต้นไม้: "Wood", ใบไม้: "Wood", สวน: "Wood", ผลไม้: "Wood", ดอกไม้: "Wood", เถาวัลย์: "Wood", ป่า: "Wood", ใบ: "Wood",
  // ไฟ — เปลวไฟ แสง (ลายกนกจัดที่นี่ — ดู caveat)
  ไฟ: "Fire", เปลวไฟ: "Fire", ดวงอาทิตย์: "Fire", พระอาทิตย์: "Fire", แสง: "Fire", ลายกนก: "Fire", กนก: "Fire",
  // ดิน — ภูเขา ดิน เครื่องปั้น
  ภูเขา: "Earth", ดิน: "Earth", หิน: "Earth", เซรามิก: "Earth", ทราย: "Earth", ทุ่ง: "Earth",
  // ทอง — โลหะ ของมีค่า
  ทอง: "Metal", โลหะ: "Metal", เงิน: "Metal", เพชร: "Metal", ดาบ: "Metal", เหล็ก: "Metal",
  // น้ำ — สายน้ำ
  น้ำ: "Water", คลื่น: "Water", ทะเล: "Water", แม่น้ำ: "Water", ฝน: "Water", หยดน้ำ: "Water", มหาสมุทร: "Water",
};

/** ตัวอย่างลวดลายต่อธาตุ (ไว้แนะนำผู้ใช้) */
export const MOTIF_EXAMPLES: Record<Element5, string[]> = {
  Wood: ["สวนผลไม้", "ต้นไม้/ใบไม้", "ดอกไม้", "เถาวัลย์"],
  Fire: ["ลายกนก/เปลวไฟ", "ดวงอาทิตย์", "แสงประกาย"],
  Earth: ["ภูเขา", "ลายเซรามิก", "พื้นดิน/ทุ่ง"],
  Metal: ["ลายทอง/โลหะ", "เพชร/ของมีค่า", "เส้นคมมินิมอล"],
  Water: ["สายน้ำ/คลื่น", "ทะเล", "หยดน้ำ"],
};

const ELEMENTS: Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

/** หาธาตุของลวดลายจากข้อความ (จับคำแรกที่พบ) — ไม่พบ = null */
export function motifElement(text: string): Element5 | null {
  for (const [k, el] of Object.entries(MOTIF_TO_ELEMENT)) {
    if (text.includes(k)) return el;
  }
  return null;
}

export const colorElement = (c: string): Element5 | undefined => COLOR_TO_ELEMENT[c];
export const shapeElement = (s: string): Element5 | undefined => SHAPE_TO_ELEMENT[s];

export type ComponentKind = "สี" | "รูปทรง" | "ลวดลาย";
export interface LabelComponentInput {
  kind: ComponentKind;
  label: string; // สิ่งที่ผู้ใช้เลือก เช่น "แดง" / "สวนผลไม้"
  element: Element5;
}
export interface ScoredComponent extends LabelComponentInput {
  score: number; // final_score (-2..2)
  relation: string;
  productiveClash: boolean;
}

export interface LabelCompositionResult {
  brandElement: Element5;
  components: ScoredComponent[];
  overallScore: number; // เฉลี่ย final_score
  verdict: "excellent" | "good" | "mixed" | "clash";
  harmonious: string[]; // label ขององค์ประกอบที่เข้ากัน (score >= 1)
  clashing: string[]; // label ขององค์ประกอบที่พิฆาต (score < 0)
  caveat: string;
}

/** ให้คะแนนองค์ประกอบฉลากรวม — เทียบทุกองค์ประกอบกับธาตุแบรนด์ */
export function scoreLabelComposition(opts: {
  brandElement: Element5;
  brandMissing?: Element5[];
  components: LabelComponentInput[];
}): LabelCompositionResult {
  const { brandElement, components } = opts;
  const missing = opts.brandMissing ?? [];

  const scored: ScoredComponent[] = components.map((c) => {
    const r = wuXingScore(brandElement, c.element, missing);
    return { ...c, score: r.final_score, relation: r.relation_th, productiveClash: r.productive_clash };
  });

  const overall = scored.length ? scored.reduce((s, c) => s + c.score, 0) / scored.length : 0;
  const verdict: LabelCompositionResult["verdict"] =
    overall >= 1.5 ? "excellent" : overall >= 0.5 ? "good" : overall >= -0.4 ? "mixed" : "clash";

  return {
    brandElement,
    components: scored,
    overallScore: Math.round(overall * 100) / 100,
    verdict,
    harmonious: scored.filter((c) => c.score >= 1).map((c) => c.label),
    clashing: scored.filter((c) => c.score < 0).map((c) => c.label),
    caveat: LABEL_COMPOSITION_CAVEAT,
  };
}

export interface MotifRecommendation {
  element: Element5;
  elementTh: string;
  score: number;
  motifs: string[];
  colors: string[];
}

/** แนะนำลวดลาย/สี ต่อแบรนด์ — เรียงธาตุที่เข้ากันดีสุดก่อน (ใช้ wuXingScore เดียวกัน) */
export function recommendForBrand(brandElement: Element5, brandMissing: Element5[] = []): MotifRecommendation[] {
  return ELEMENTS.map((el) => {
    const r = wuXingScore(brandElement, el, brandMissing);
    return {
      element: el,
      elementTh: THAI_LABEL_5[el],
      score: r.final_score,
      motifs: MOTIF_EXAMPLES[el],
      colors: ELEMENT_TO_COLORS[el],
    };
  }).sort((a, b) => b.score - a.score);
}
