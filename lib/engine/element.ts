// พอร์ตจาก legacy-python-engines/kruth_element_engine.py (สมการ 1-5 + Safety Gate
// + Deviation Engine + Personal Year) — CLAUDE.md §6
// ผลลัพธ์ต้องตรงเป๊ะกับ self-test Python — ยืนยันด้วย tests/element.test.ts
//
// หมายเหตุ naming: Element Seed ใช้ 4 bucket (ไฟ/ดิน/ลม(=Wood)/น้ำ),
// Wu Xing Score ใช้ 5 ธาตุเต็ม (Wood→Fire→Earth→Metal→Water) — ดู docstring ต้นฉบับ

import { getWellnessPair } from "./wellness";
import { julianDay, solarEclipticLongitude } from "./lagna";
import personalYearData from "../../data/personal_year_guidance.json";

export type Element5 = "Wood" | "Fire" | "Earth" | "Metal" | "Water";
export type Element4 = "Fire" | "Earth" | "Wood" | "Water";

export const THAI_LABEL_5: Record<Element5, string> = {
  Wood: "ไม้",
  Fire: "ไฟ",
  Earth: "ดิน",
  Metal: "ทอง",
  Water: "น้ำ",
};
export const THAI_LABEL_4: Record<Element4, string> = {
  Fire: "ไฟ",
  Earth: "ดิน",
  Wood: "ลม",
  Water: "น้ำ",
};

const GENERATING_CYCLE: Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];
// ลำดับคงที่ของ 4 bucket — สำคัญต่อ tie-break ของ dominant (เลียนแบบ max() ของ Python
// ที่คืน key แรกสุดตามลำดับ insertion เมื่อคะแนนเท่ากัน)
const BUCKET_ORDER: Element4[] = ["Fire", "Earth", "Wood", "Water"];

export function fold5To4(el5: Element5): Element4 {
  if (el5 === "Metal") return "Earth";
  return el5 as Element4;
}

// ---------------------------------------------------------------------------
// EQUATION 1 — Element Seed
// ---------------------------------------------------------------------------

export interface ElementSeedInputs {
  day_of_week: string;
  birth_month: number;
  birth_year_ad: number;
  zodiac_year_animal: string;
  /** 1-31 (ไม่บังคับ — ใช้ตัดสินขอบเขตลี่ชุนเมื่อเกิดเดือน ก.พ.) */
  birth_day?: number | null;
  name_wood_pct?: number | null;
}

// ✅ แก้ตามเอกสารต้นฉบับ KRUTH_ELEMENT_Platform_E_v1.docx:
//    "อังคาร/อาทิตย์=ไฟ | จันทร์/ศุกร์=น้ำ | พุธ/เสาร์=ดิน | พฤหัส=ลม"
// เดิมตารางนี้ผิด 2 จุด (พบตอนตรวจข้อมูลผู้ใช้จริง ก.ค. 2569):
//   1) "พุธ" ถูกใส่เป็น Wood(ลม) — ที่ถูกคือ Earth(ดิน)
//   2) "พฤหัสบดี" หายไปทั้งวัน — ที่ถูกคือ Wood(ลม)  ← ผู้ใช้เกิดวันนี้ถูกข้าม Source 1 เงียบๆ
export const DAY_ELEMENT: Record<string, Element4> = {
  อังคาร: "Fire",
  อาทิตย์: "Fire",
  จันทร์: "Water",
  ศุกร์: "Water",
  พุธ: "Earth",
  เสาร์: "Earth",
  พฤหัสบดี: "Wood", // แสดงผลเป็น "ลม"
};

const THAI_MONTH_ELEMENT: Record<number, Element4> = {
  1: "Fire", 2: "Fire", 3: "Fire",
  4: "Wood", 5: "Wood", 6: "Wood",
  7: "Water", 8: "Water", 9: "Water",
  10: "Earth", 11: "Earth", 12: "Earth",
};

const ZODIAC_ELEMENT: Record<string, Element4> = {
  จอ: "Earth", ฉลู: "Earth", มะโรง: "Earth", มะแม: "Earth", วอก: "Earth", ระกา: "Earth",
  ชวด: "Water", กุน: "Water",
  ขาล: "Wood", เถาะ: "Wood",
  มะเส็ง: "Fire", มะเมีย: "Fire",
};

/** วัน "ลี่ชุน" (立春) ของปีนั้น = วันที่ดวงอาทิตย์ถึงลองจิจูดสุริยวิถี 315° (ตกวันที่ 3-5 ก.พ. เสมอ)
 *  ใช้สูตรดวงอาทิตย์ที่ verify แล้วใน lagna.ts — ไม่ต้องมีตาราง lookup */
export function lichunDayOfFebruary(yearAd: number): number {
  for (let d = 1; d <= 10; d++) {
    const jd = julianDay(Date.UTC(yearAd, 1, d, 12, 0, 0));
    if (solarEclipticLongitude(jd) >= 315) return d;
  }
  return 4; // fallback (ไม่ควรเกิดขึ้น)
}

/**
 * Source 3: เบญจธาตุจีนตามเลขท้ายปี
 *
 * ⚠️ ส่วนขยายที่ "ต่างจากสเปกเดิม" — อ่านก่อนแก้:
 * เอกสาร KRUTH_ELEMENT_Platform_E_v1.docx เขียนแค่ "ตามเลขท้ายปี" ไม่ได้ระบุขอบเขตปี
 * แต่ปีจีนไม่ได้เริ่ม 1 ม.ค. — ระบบเลขท้ายปีนี้คือ "ทศกัณฑ์ฟ้า" (Heavenly Stem) ซึ่งตามหลัก
 * โหราศาสตร์จีน (BaZi) ปีเปลี่ยนที่ "ลี่ชุน" (立春, 3-5 ก.พ.) ไม่ใช่ 1 ม.ค.
 * ตรวจกับข้อมูลผู้ใช้จริงของ Platform D 90 แถว: ทุกเคสที่ D ต่างจากสูตรเลขท้ายปีล้วนเป็น
 * คนเกิดเดือน ม.ค. และใช้ธาตุปีก่อนหน้า — ตรงกับหลักลี่ชุน 5/5 เคส
 *
 * backward compatible: ไม่ส่ง birthMonth → ใช้สูตรเดิมตามสเปกเป๊ะ
 */
export function chineseWuxingByYearEndDigit(
  yearAd: number,
  birthMonth?: number | null,
  birthDay?: number | null
): Element5 {
  let effectiveYear = yearAd;
  if (birthMonth !== undefined && birthMonth !== null) {
    if (birthMonth === 1) {
      effectiveYear = yearAd - 1; // ทั้งเดือน ม.ค. อยู่ก่อนลี่ชุนเสมอ
    } else if (birthMonth === 2 && birthDay !== undefined && birthDay !== null) {
      if (birthDay < lichunDayOfFebruary(yearAd)) effectiveYear = yearAd - 1;
    }
  }

  const d = ((effectiveYear % 10) + 10) % 10;
  if (d === 6 || d === 7) return "Fire";
  if (d === 8 || d === 9) return "Earth";
  if (d === 4 || d === 5) return "Wood";
  if (d === 2 || d === 3) return "Water";
  return "Metal"; // 0, 1
}

export type SourceUsed = [string, string | number, string];

export interface ElementSeedResult {
  scores: Record<Element4, number>;
  scores_th: Record<string, number>;
  dominant: Element4;
  dominant_th: string;
  missing: Element4[];
  missing_th: string[];
  sources_used: SourceUsed[];
}

export function calculateElementSeed(inp: ElementSeedInputs): ElementSeedResult {
  const scores: Record<Element4, number> = { Fire: 0, Earth: 0, Wood: 0, Water: 0 };
  const sourcesUsed: SourceUsed[] = [];

  // Source 1: day of week
  const elDay = DAY_ELEMENT[inp.day_of_week];
  if (elDay) {
    scores[elDay] += 1;
    sourcesUsed.push(["day_of_week", inp.day_of_week, elDay]);
  }

  // Source 2: Thai month element
  const elMonth = THAI_MONTH_ELEMENT[inp.birth_month];
  if (elMonth) {
    scores[elMonth] += 1;
    sourcesUsed.push(["birth_month", inp.birth_month, elMonth]);
  }

  // Source 3: Chinese Wu-Xing by year-end digit (folded 5->4)
  // ส่ง month/day ไปด้วยเพื่อใช้ขอบเขตลี่ชุน (คนเกิดต้นปีก่อน 3-5 ก.พ. ใช้ธาตุปีก่อนหน้า)
  const el5 = chineseWuxingByYearEndDigit(inp.birth_year_ad, inp.birth_month, inp.birth_day);
  const el4 = fold5To4(el5);
  scores[el4] += 1;
  sourcesUsed.push(["year_end_digit", inp.birth_year_ad, `${el5} -> folded ${el4}`]);

  // Source 4: zodiac year animal
  const elZod = ZODIAC_ELEMENT[inp.zodiac_year_animal];
  if (elZod) {
    scores[elZod] += 1;
    sourcesUsed.push(["zodiac_year", inp.zodiac_year_animal, elZod]);
  }

  // Source 5: name Kangxi-derived Wood% (if provided)
  if (inp.name_wood_pct !== undefined && inp.name_wood_pct !== null) {
    const dominantNameEl = inp.name_wood_pct >= 50 ? "Wood" : null;
    if (dominantNameEl) {
      scores[dominantNameEl] += 1;
      sourcesUsed.push(["name_kangxi", `${inp.name_wood_pct}% Wood`, dominantNameEl]);
    }
  } else {
    sourcesUsed.push(["name_kangxi", "NOT PROVIDED", "skipped — needs Unihan Parser integration"]);
  }

  // dominant = คะแนนสูงสุด, tie-break = key แรกตาม BUCKET_ORDER (เลียนแบบ Python max())
  let dominant: Element4 = BUCKET_ORDER[0];
  for (const e of BUCKET_ORDER) {
    if (scores[e] > scores[dominant]) dominant = e;
  }
  const missing = BUCKET_ORDER.filter((e) => scores[e] === 0);

  return {
    scores,
    scores_th: Object.fromEntries(BUCKET_ORDER.map((k) => [THAI_LABEL_4[k], scores[k]])),
    dominant,
    dominant_th: THAI_LABEL_4[dominant],
    missing,
    missing_th: missing.map((e) => THAI_LABEL_4[e]),
    sources_used: sourcesUsed,
  };
}

// ---------------------------------------------------------------------------
// EQUATION 2 & 3 — Wu Xing Score + Productive Clash
// ---------------------------------------------------------------------------

function cycleDistance(a: Element5, b: Element5): number {
  const ia = GENERATING_CYCLE.indexOf(a);
  const ib = GENERATING_CYCLE.indexOf(b);
  return (((ib - ia) % 5) + 5) % 5;
}

export interface WuXingResult {
  user_element: Element5;
  object_element: Element5;
  raw_score: number;
  final_score: number;
  productive_clash: boolean;
  relation_th: string;
}

export function wuXingScore(
  userElement: Element5,
  objectElement: Element5,
  userMissingElements: Element5[] = []
): WuXingResult {
  let rawScore: number;
  let relation: string;

  if (userElement === objectElement) {
    rawScore = 1;
    relation = "ธาตุเดียวกัน (กลมกลืน)";
  } else {
    // 🔴 2026-07-30 — แกน "ให้กำเนิด" ถูกแก้โดยเจตนา (จงใจต่างจาก Calculation Manual สมการ 2):
    // ต้นฉบับให้ เราให้กำเนิดเขา=+2 / เขาให้กำเนิดเรา=−1 ("ดูดพลัง") ซึ่งกลับด้านกับหลักเบญจธาตุ
    // (木生火 ไม้บำรุงไฟ ต้องเป็นคุณกับเรา) และป้ายขัดแย้งกับตัวเอง — ผู้ใช้เลือกทาง "ค":
    // เขาให้กำเนิดเรา=+2 (印 บำรุง) · เราให้กำเนิดเขา=+1 (ผู้ให้ — ไม่ให้ −1 ตาม 泄 เพราะระบบ
    // ไม่ได้คำนวณกำลังวันเกิด 身強/身弱 จึงไม่เคลมเกินข้อมูล) · ต้องแก้คู่กับ kruth_element_engine.py เสมอ
    const dist = cycleDistance(userElement, objectElement);
    if (dist === 1) {
      rawScore = 1;
      relation = `${THAI_LABEL_5[userElement]} ให้กำเนิด ${THAI_LABEL_5[objectElement]} (ดีแบบผู้ให้ — เราเป็นฝ่ายส่งพลัง อาจเหนื่อย)`;
    } else if (dist === 4) {
      rawScore = 2;
      relation = `${THAI_LABEL_5[objectElement]} ให้กำเนิด ${THAI_LABEL_5[userElement]} (★บำรุงเรา ดีที่สุด★)`;
    } else if (dist === 2) {
      rawScore = -2;
      relation = `${THAI_LABEL_5[userElement]} พิฆาต ${THAI_LABEL_5[objectElement]} (⚠️พิฆาต)`;
    } else if (dist === 3) {
      rawScore = -2;
      relation = `${THAI_LABEL_5[objectElement]} พิฆาต ${THAI_LABEL_5[userElement]} ย้อนกลับ (⚠️พิฆาต)`;
    } else {
      rawScore = 0;
      relation = "กลาง";
    }
  }

  let finalScore = rawScore;
  let productiveClash = false;
  if (rawScore === -2 && userMissingElements.includes(objectElement)) {
    finalScore = 2;
    productiveClash = true;
    relation += " → ⚡ Productive Clash: ธาตุที่ขาดกลายเป็นยา แทนที่จะเป็นพิษ!";
  }

  return {
    user_element: userElement,
    object_element: objectElement,
    raw_score: rawScore,
    final_score: finalScore,
    productive_clash: productiveClash,
    relation_th: relation,
  };
}

// ---------------------------------------------------------------------------
// EQUATION 4 — Friction Score
// ---------------------------------------------------------------------------

export function frictionScore(
  dayElementTh: string,
  bigFiveE: number,
  bigFiveN: number,
  pdcrWind?: number | null
): number {
  let friction = 0.0;

  if (dayElementTh === "ไฟ") {
    if (bigFiveE < 2.5) friction = 3;
    else if (bigFiveE < 3.0) friction = 2;
  } else if (dayElementTh === "ดิน") {
    if (bigFiveE < 2.5) friction = 0;
  } else if (dayElementTh === "ลม") {
    if (pdcrWind !== undefined && pdcrWind !== null && pdcrWind >= 6) friction = 2;
  }

  if (bigFiveN >= 3.5) friction += 1.5;
  else if (bigFiveN >= 3.0) friction += 0.5;

  return friction;
}

// ---------------------------------------------------------------------------
// EQUATION 5 — TTM Lifestyle lookup
// ---------------------------------------------------------------------------

export interface TtmLifestyle {
  taste: string;
  food: string[];
  activity: string[];
  color: string[];
}

export const TTM_LIFESTYLE: Record<Element4, TtmLifestyle> = {
  Fire: { taste: "เผ็ด ร้อน", food: ["ขิง", "พริกไทย", "กระเทียม", "ต้มยำ"], activity: ["วิ่ง", "เต้น"], color: ["แดง", "ส้ม", "เหลือง"] },
  Earth: { taste: "หวาน มัน", food: ["ฟักทอง", "กล้วย", "ข้าวต้ม"], activity: ["ซุปข้น", "โยคะ", "สมาธิ"], color: ["เหลือง", "น้ำตาล", "ครีม"] },
  Wood: { taste: "เปรี้ยว", food: ["มะนาว", "ส้ม", "ผักสด", "สับปะรด"], activity: ["ท่องเที่ยว", "ปั่นจักรยาน"], color: ["เขียว", "ฟ้าอ่อน", "ขาว"] },
  Water: { taste: "เค็ม อ่อน", food: ["น้ำมะพร้าว", "บัวบก", "แตงกวา", "ซุปใส"], activity: ["ว่ายน้ำ", "สมาธิ"], color: ["ฟ้า", "น้ำเงิน", "ดำ"] },
};

/** จุดเรียกเดียวสำหรับคำแนะนำธาตุขาด — รวม TTM_LIFESTYLE (รส/อาหาร/สี) + wellness_practice */
export function ttmRemedyForMissing(missingElements: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const e of missingElements) {
    if (!(e in TTM_LIFESTYLE)) continue;
    const label = THAI_LABEL_4[e as Element4];
    result[label] = {
      ...TTM_LIFESTYLE[e as Element4],
      wellness_practice: getWellnessPair(e),
    };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Personal Year Guidance — Logic 1 CASE 1
// ---------------------------------------------------------------------------

interface PersonalYearRow {
  personal_year_number: number;
  theme: string;
  prediction_overview: string;
  caution: string;
  opportunity: string;
  action_advice: string;
}

const PERSONAL_YEAR_TABLE: Record<number, PersonalYearRow> = Object.fromEntries(
  (personalYearData as PersonalYearRow[]).map((row) => [row.personal_year_number, row])
);

function digitSum(n: number): number {
  return String(Math.abs(n))
    .split("")
    .reduce((a, c) => a + (Number.isNaN(parseInt(c, 10)) ? 0 : parseInt(c, 10)), 0);
}

export function calculatePersonalYear(birthDay: number, birthMonth: number, currentYear: number): number {
  const total0 = birthDay + birthMonth + currentYear;
  let total = digitSum(total0);
  while (total > 9 && total !== 11 && total !== 22 && total !== 33) {
    total = digitSum(total);
  }
  return total;
}

export function getPersonalYearGuidance(personalYearNumber: number): PersonalYearRow | { error: string } {
  const row = PERSONAL_YEAR_TABLE[personalYearNumber];
  if (!row) {
    return { error: `ไม่พบข้อมูลปีจร ${personalYearNumber} ในตาราง (มีแค่ 1-9, 11, 22, 33)` };
  }
  return row;
}

// ---------------------------------------------------------------------------
// SAFETY GATE — ต้องเรียกก่อนเสมอในทุก entry point ที่รับ free-text (CLAUDE.md §6)
// ---------------------------------------------------------------------------

export const CRISIS_KEYWORDS = [
  "อยากตาย", "ฆ่าตัวตาย", "ทนไม่ไหว", "สิ้นหวัง", "หมดหวังแล้ว",
  "อยากหายไป", "ไม่อยากมีชีวิตอยู่", "ทำร้ายตัวเอง", "ไม่อยากอยู่แล้ว",
];

export const CRISIS_RESOURCE_MESSAGE =
  "หากคุณกำลังรู้สึกทุกข์ใจมากๆ หรือมีความคิดทำร้ายตัวเอง อยากให้คุณลองติดต่อ " +
  "สายด่วนสุขภาพจิต 1323 (โทรฟรี ตลอด 24 ชม.) หรือสมาคมสะมาริตันส์แห่งประเทศไทย " +
  "02-713-6791 นะคะ มีคนพร้อมรับฟังคุณอยู่เสมอ 💛 " +
  "อาจารย์ลาลาขอหยุดการทำนายไว้ก่อน เพราะอยากให้คุณได้รับความช่วยเหลือที่เหมาะสมกว่านี้";

export interface SafetyIntercept {
  intercepted: true;
  matched_keywords: string[];
  crisis_resource_message: string;
}

/** เรียกก่อนสุดของทุก endpoint ที่รับ free-text — คืน intercept dict ถ้าพบสัญญาณวิกฤต, null ถ้าปลอดภัย */
export function safetyGate(message: string): SafetyIntercept | null {
  const matched = CRISIS_KEYWORDS.filter((k) => message.includes(k));
  if (matched.length > 0) {
    return {
      intercepted: true,
      matched_keywords: matched,
      crisis_resource_message: CRISIS_RESOURCE_MESSAGE,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// DEVIATION ENGINE
// ---------------------------------------------------------------------------

/** round แบบ half-to-even ให้ตรงกับ Python round() */
export function pyRound(x: number, ndigits: number): number {
  const m = Math.pow(10, ndigits);
  const y = x * m;
  const floor = Math.floor(y);
  const diff = y - floor;
  const eps = 1e-9;
  let r: number;
  if (Math.abs(diff - 0.5) < eps) {
    r = floor % 2 === 0 ? floor : floor + 1;
  } else {
    r = Math.round(y);
  }
  return r / m;
}

export function normalizeTo03(value: number, maxValue: number): number {
  if (maxValue <= 0) return 1.5;
  return pyRound((value / maxValue) * 3, 2);
}

export interface Deviation {
  dimension: string;
  expected: number;
  actual: number;
  gap: number;
  meaning: string;
}

export function calcDeviation(
  dimsExpected: Record<string, number>,
  dimsActual: Record<string, number>,
  threshold = 0.5
): Deviation[] {
  const deviations: Deviation[] = [];
  for (const [dim, expected] of Object.entries(dimsExpected)) {
    const actual = dim in dimsActual ? dimsActual[dim] : 1.5;
    const gap = actual - expected;
    if (Math.abs(gap) >= threshold) {
      deviations.push({
        dimension: dim,
        expected,
        actual,
        gap: pyRound(gap, 2),
        meaning: gap > 0 ? `${dim}: สูงกว่าที่คาด` : `${dim}: ต่ำกว่าที่คาด`,
      });
    }
  }
  return deviations.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}
