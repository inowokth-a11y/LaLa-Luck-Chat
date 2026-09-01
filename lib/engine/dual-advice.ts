/**
 * คำแนะนำสองแนวทาง (Dual Advice) — "เสริมส่วนที่ขาด" vs "ส่งเสริมจุดแข็ง"
 * (ผู้ใช้เคาะ 31 ส.ค. 2569: ใช้เฉพาะส่วน "คำแนะนำท้ายคำทำนาย" — โครงคำทำนายส่วนอื่นคงเดิม
 *  · กลไกทางแยก ก/ข ของเนื้อคู่เมื่อสองศาสตร์ขัดกัน เป็นคนละกลไก คงเดิมเช่นกัน)
 *
 * หลักการ: ทั้งสองแนวคือเส้น +2 ของ wuXingScore "ทาง ค" ที่มีอยู่แล้ว —
 * - เสริมส่วนที่ขาด: ธาตุที่ขาด (Productive Clash "พลิกเป็นยา") — ตาราง TTM ของตำราหนุนแนวนี้
 * - ส่งเสริมจุดแข็ง: ธาตุแม่ที่ให้กำเนิดธาตุเด่น (印 บำรุง) — ประกอบจากวงจรให้กำเนิด
 *   ไม่ใช่ตารางตำราเฉพาะ (ประกาศที่มาต่างกันตามจริง)
 * ไม่มีสูตรใหม่ — ประกอบจาก ELEMENT_TO_COLORS + WELLNESS_ACTIVITIES + วงจรให้กำเนิดเดิมทั้งหมด
 *
 * 🔴 กติกาการเล่า (แพทเทิร์นเดียวกับ Mirror ของเนื้อคู่): treatment เท่ากัน ห้ามคำเชียร์
 * (ดีกว่า/เหมาะกว่า/ควรเลือก) — ระบบไม่เลือกแทน + สองแนวไม่ขัดกัน ใช้ร่วมกันได้
 * · ระบบไม่คำนวณกำลังวันเกิด (身強/身弱) จึงห้ามเคลมว่าแนวใดถูกกว่า (เหตุผลเดียวกับ
 *   ที่ "ทาง ค" ไม่ให้ −1 กรณีระบายพลัง)
 */

import { THAI_LABEL_5, type Element5 } from "./element";
import { ELEMENT_TO_COLORS } from "./fengshui";
import { getWellnessPair } from "./wellness";

/** ธาตุแม่ที่ให้กำเนิดธาตุนั้น (วงจรให้กำเนิด — 印 บำรุง +2 ตาม "ทาง ค") */
export const SUPPORT_OF: Record<Element5, Element5> = {
  Wood: "Water",
  Fire: "Wood",
  Earth: "Fire",
  Metal: "Earth",
  Water: "Metal",
};

export interface AdvicePath {
  /** "เสริมส่วนที่ขาด" | "ส่งเสริมจุดแข็ง" */
  titleTh: string;
  /** ธาตุเป้าหมายของแนวนี้ (ไทย พร้อมคำอธิบายสั้น) */
  focusTh: string;
  colors: string[];
  /** เทคนิคสุขภาวะ 1 อย่างประจำแนว (จาก WELLNESS_ACTIVITIES — null เมื่อไม่มีข้อมูลธาตุ) */
  practiceTh: string | null;
  /** ที่มา — สองแนวไม่เท่ากันจริง ต้องประกาศตรงๆ ห้ามทำให้ดูน่าเชื่อเท่ากัน */
  sourceTh: string;
}

export interface DualAdvice {
  /** null เมื่อธาตุครบ (ไม่มีธาตุขาด) — ไม่สร้างทางแยกปลอม */
  lack: AdvicePath | null;
  strength: AdvicePath;
  noteTh: string;
  caveats: string[];
}

export const DUAL_ADVICE_NOTE =
  "สองแนวไม่ขัดกัน ใช้ร่วมกันได้ — การเลือกจุดเน้นเป็นของเจ้าของดวง ระบบไม่เลือกแทน";

export const DUAL_ADVICE_CAVEAT =
  "แนวคำแนะนำเป็นทางเลือกจุดเน้นตามหลักธาตุ ไม่ใช่คำสั่งหรือการรับประกันผล — " +
  "ระบบไม่มีข้อมูลตัดสินว่าแนวใดถูกกว่าสำหรับแต่ละดวง";

function practiceName(element: Element5): string | null {
  const w = getWellnessPair(element);
  return "error" in w ? null : w.internal.name;
}

/** ประกอบคำแนะนำสองแนวจากธาตุเด่น/ธาตุขาดของผู้ใช้ — pure ฿0 ไม่มีสูตรใหม่ */
export function dualAdvicePaths(dominant: Element5, missing: Element5[]): DualAdvice {
  const mother = SUPPORT_OF[dominant];

  const lack: AdvicePath | null = missing.length
    ? {
        titleTh: "เสริมส่วนที่ขาด",
        focusTh: `เติมธาตุ${missing.map((m) => THAI_LABEL_5[m]).join("/")}ที่ดวงขาด`,
        colors: missing.flatMap((m) => ELEMENT_TO_COLORS[m].slice(0, 2)),
        practiceTh: practiceName(missing[0]),
        sourceTh: "หลักเติมธาตุที่ขาด (Productive Clash พลิกเป็นยา) — ตาราง TTM ของตำราหนุนแนวนี้",
      }
    : null;

  const strength: AdvicePath = {
    titleTh: "ส่งเสริมจุดแข็ง",
    focusTh: `บำรุงธาตุ${THAI_LABEL_5[dominant]}ที่เด่น ด้วยธาตุ${THAI_LABEL_5[mother]}ที่ให้กำเนิด`,
    colors: ELEMENT_TO_COLORS[mother].slice(0, 2),
    practiceTh: practiceName(dominant),
    sourceTh: "ประกอบจากวงจรให้กำเนิดของเบญจธาตุ — ไม่ใช่ตารางตำราเฉพาะ",
  };

  return { lack, strength, noteTh: DUAL_ADVICE_NOTE, caveats: [DUAL_ADVICE_CAVEAT] };
}

/** บล็อกข้อความสำหรับฉีดเข้า context ของ narrator (จุดประกอบข้อความจุดเดียว) */
export function dualAdviceContextTh(da: DualAdvice): string {
  const line = (p: AdvicePath) =>
    `- แนว${p.titleTh}: ${p.focusTh} · สี ${p.colors.join("/")}` +
    (p.practiceTh ? ` · เทคนิค ${p.practiceTh}` : "") +
    ` (ที่มา: ${p.sourceTh})`;
  const rows = [da.lack ? line(da.lack) : null, line(da.strength)].filter(Boolean).join("\n");
  return `แนวคำแนะนำสองแบบสำหรับปิดท้าย (ให้ผู้ใช้เลือกจุดเน้นเอง):\n${rows}\n${da.noteTh}`;
}
