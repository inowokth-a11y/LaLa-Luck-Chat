// รหัสพลังงานเชิงสัญลักษณ์ของความฝัน — ฿0 ทั้งหมด (ผู้ใช้ตัดสิน 6 ส.ค. 2569:
// "เรื่องเลขอย่ามองเป็นใบ้หวย ให้มองเป็นการคำนวณ เช่น เลขเวลา เลขสีนำโชคของช่วงเวลานั้น")
//
// แหล่งเลขทุกตัวเป็นการคำนวณ/ตารางจริง ไม่มีการสุ่มหรือเดา:
//   1. ขีดอักษรคังซีของสัญลักษณ์ — มากับ dream DB ต่อสัญลักษณ์อยู่แล้ว (เช่น บ้าน = 家 = 10 ขีด)
//   2. เลขดาวประจำวันฝัน — ธรรมเนียมโหราศาสตร์ไทยมาตรฐาน (อาทิตย์ 1 ... เสาร์ 7)
//   3. เลขประจำธาตุของสัญลักษณ์ — reverse ของตาราง §5.4 (เลข→ธาตุ ที่ผ่าน golden test)
//   4. สีนำโชคช่วงนั้น — ELEMENT_TO_COLORS ของธาตุประจำวันฝัน
// 🔴 กรอบการนำเสนอ: "เลขเชิงสัญลักษณ์จากการคำนวณ" — ห้ามชวนเสี่ยงโชค (guardrail หวยยังทำงานปกติ)

import { DAY_ELEMENT, THAI_LABEL_5, type Element5 } from "./element";
import { artifactElement } from "./numerology";
import { ELEMENT_TO_COLORS } from "./fengshui";

export const DREAM_ENERGY_CAVEAT =
  "รหัสพลังงานเป็นเลขเชิงสัญลักษณ์จากการคำนวณ (ขีดอักษรคังซี เลขดาวประจำวัน เลขประจำธาตุ) " +
  "ใช้เชื่อมโยงความหมายและสีเสริมพลังของช่วงเวลา ไม่ใช่คำแนะนำการเสี่ยงโชค";

/** เลขดาวประจำวันตามโหราศาสตร์ไทย (อาทิตย์=1 ... เสาร์=7) */
export const DAY_STAR_NUMBER: Record<string, number> = {
  อาทิตย์: 1,
  จันทร์: 2,
  อังคาร: 3,
  พุธ: 4,
  พฤหัสบดี: 5,
  ศุกร์: 6,
  เสาร์: 7,
};

/** ป้ายธาตุไทย (4 ธาตุของ dream DB) → Element5 */
const THAI4_TO_5: Record<string, Element5> = { ไฟ: "Fire", ดิน: "Earth", น้ำ: "Water", ลม: "Wood" };

/** เลข 0-9 ที่ประจำธาตุนั้นตามตาราง §5.4 (reverse lookup — deterministic) */
export function elementDigits(el: Element5): number[] {
  const out: number[] = [];
  for (let d = 0; d <= 9; d++) {
    if (artifactElement(d) === el) out.push(d);
  }
  return out;
}

export interface DreamSymbolInput {
  object: string;
  element: string; // ป้ายไทย 4 ธาตุจาก dream DB
  kangxi_strokes?: number | null;
}

export interface DreamEnergyCode {
  เลขขีดสัญลักษณ์: { สัญลักษณ์: string; ขีดคังซี: number }[];
  เลขดาววันฝัน: number | null;
  ธาตุประจำวันฝัน: string | null;
  สีนำโชคช่วงนี้: string[];
  เลขประจำธาตุสัญลักษณ์: Record<string, number[]>;
  หมายเหตุ: string;
}

export function dreamEnergyCode(symbols: DreamSymbolInput[], dayOfWeek?: string | null): DreamEnergyCode {
  const strokes = symbols
    .filter((s) => typeof s.kangxi_strokes === "number" && s.kangxi_strokes! > 0)
    .slice(0, 5)
    .map((s) => ({ สัญลักษณ์: s.object, ขีดคังซี: s.kangxi_strokes as number }));

  const day = (dayOfWeek ?? "").trim();
  const starNo = DAY_STAR_NUMBER[day] ?? null;
  const dayEl = DAY_ELEMENT[day] ?? null;

  // สีนำโชคของช่วงเวลา = สีธาตุประจำวันฝัน (ตารางเดียวกับฮวงจุ้ย/สีมงคล)
  const colors = dayEl ? ELEMENT_TO_COLORS[dayEl].slice(0, 3) : [];

  const digitByElement: Record<string, number[]> = {};
  for (const s of symbols.slice(0, 5)) {
    const el5 = THAI4_TO_5[s.element];
    if (!el5) continue;
    const label = THAI_LABEL_5[el5];
    if (!(label in digitByElement)) digitByElement[label] = elementDigits(el5);
  }

  return {
    เลขขีดสัญลักษณ์: strokes,
    เลขดาววันฝัน: starNo,
    ธาตุประจำวันฝัน: dayEl ? THAI_LABEL_5[dayEl] : null,
    สีนำโชคช่วงนี้: colors,
    เลขประจำธาตุสัญลักษณ์: digitByElement,
    หมายเหตุ: DREAM_ENERGY_CAVEAT,
  };
}
