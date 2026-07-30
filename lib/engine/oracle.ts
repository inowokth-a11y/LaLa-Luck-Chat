// Logic 21 — เสี่ยงทายวงแหวนคู่ (ตรรกะล้วน แยกจาก UI ให้เทสต์ได้)
// พอร์ตจาก legacy-artifacts/oracle_dual_ring.html
//
// กลไก: วงแหวน 2 วง วงละ 10 ช่อง (เลข 0-9 สลับที่ด้วย Fisher-Yates)
//       ผู้ใช้ปัดหมุน → วงชะลอตัวลง → เข็ม (reticle) ที่ตำแหน่ง 12 นาฬิกาชี้ช่องไหน
//       ได้เลขนั้น → รวม 2 วงเป็นเลขการ์ด 00-99
//       หมุน 2 รอบ: รอบ 1 = การ์ดของ "ตัวคุณ" · รอบ 2 = การ์ดของ "เรื่องที่ถาม"
//
// ⚠️ สิ่งที่จงใจ **ไม่** ลอกจาก HTML — HTML มีสำเนาตารางของตัวเองที่ล้าสมัย:
//    - `DAY_ELEMENT` ใน HTML เป็นเวอร์ชันบั๊ก B2 (พุธ=Wood, **ไม่มีพฤหัสบดี**)
//      → ใช้ของจริงจาก lib/engine/element.ts ที่แก้แล้ว (CLAUDE.md §5.1)
//    - `artifactElement5()` ใน HTML คือ `artifactElement()` ของ Logic 2 เป๊ะ (ตาราง 4 ธาตุ
//      ไม่มีทอง) → เรียกตัวจริงที่ผ่าน golden test แล้ว ไม่เขียนซ้ำ

import { wuXingScore, DAY_ELEMENT, THAI_LABEL_5, type Element5 } from "./element";
import { artifactElement } from "./numerology";

export const SLOT_COUNT = 10;
export const SLOT_ANGLE = 360 / SLOT_COUNT;
/** หมุนอย่างน้อยกี่องศาต่อการปัด 1 ครั้ง (ให้รู้สึกว่า "หมุนจริง" ไม่ใช่ขยับนิดเดียว) */
export const MIN_SPIN_ROTATION_DEG = 900;
/** ตัวคูณแปลงความเร็วปัด → องศาที่หมุนเพิ่ม */
export const VELOCITY_TO_ROTATION = 240;
export const SPIN_DURATION_MS = 5000;

export type LayerType = "place" | "vehicle" | "organization" | "other_person";

export const LAYER_LABEL: Record<LayerType, string> = {
  place: "บ้าน/สถานที่",
  vehicle: "รถ/ยานพาหนะ",
  organization: "บริษัท/โลโก้",
  other_person: "คนอื่น",
};

/** ข้อมูลที่ผู้ใช้ผูกกับแต่ละเลเยอร์ — เลข (บ้าน/ทะเบียน) หรือวันเกิด (คนอื่น) */
export interface LayerData {
  number?: string;
  day?: string;
}
export type BoundLayers = Partial<Record<LayerType, LayerData>>;

// ---------------------------------------------------------------------------
// กลไกวงแหวน (pure)
// ---------------------------------------------------------------------------

/** สลับลำดับเลข 0-9 — รับ rng เข้ามาเพื่อให้เทสต์กำหนดผลได้ */
export function shuffleDigits(rng: () => number = Math.random): number[] {
  const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * เข็มอยู่นิ่งที่ 12 นาฬิกา (องศา 0) — หาว่าช่องไหนหมุนมาอยู่ตรงนั้น
 * หมุนตามเข็ม (rotation เป็นบวก) = ช่องเลื่อนถอยหลัง จึงต้องใส่ลบ
 */
export function digitAtReticle(map: readonly number[], rotation: number): number {
  const norm = (((-rotation % 360) + 360) % 360);
  const slotIndex = Math.round(norm / SLOT_ANGLE) % SLOT_COUNT;
  return map[slotIndex];
}

/** ตำแหน่ง x,y ของช่องที่ i บนวงรัศมี R (ช่อง 0 อยู่บนสุด) */
export function slotPosition(i: number, radius = 100): { x: number; y: number } {
  const rad = (i * SLOT_ANGLE * Math.PI) / 180;
  return { x: Math.sin(rad) * radius, y: -Math.cos(rad) * radius };
}

/** องศาที่จะหมุนไปเมื่อปัดด้วยความเร็ว v (0 = สุ่มทิศ) */
export function spinTarget(current: number, velocity: number, rng: () => number = Math.random): number {
  const dir = velocity === 0 ? (rng() < 0.5 ? 1 : -1) : Math.sign(velocity);
  return current + dir * (MIN_SPIN_ROTATION_DEG + Math.abs(velocity) * VELOCITY_TO_ROTATION);
}

/** ชะลอตัวแบบ easeOutQuint — ช้าลงเรื่อยๆ จนหยุดนิ่ง */
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

/** เลขการ์ดจากสองวง — เติม 0 ข้างหน้าให้เป็น 2 หลักเสมอ (00-99) */
export const cardIdFromDigits = (a: number, b: number): string => `${a}${b}`;

// ---------------------------------------------------------------------------
// การให้คะแนนรวม (พอร์ตตรงจาก computeCombinedReading ของ HTML)
// ---------------------------------------------------------------------------

export interface ReadingComponent {
  component: string;
  weight: number;
  score: number;
  detail: string;
  cardElement?: Element5;
}

const el5 = (n: number): Element5 => artifactElement(n) as Element5;

/** ยิ่งขาดธาตุมาก ยิ่งได้คะแนนน้อย */
export function personalEnergyComponent(missing: readonly Element5[]): ReadingComponent {
  const scoreMap: Record<number, number> = { 0: 2, 1: 1, 2: 0, 3: -1, 4: -2 };
  return {
    component: "พลังงานส่วนบุคคล",
    weight: 0.1,
    score: scoreMap[missing.length] ?? -2,
    detail: `ธาตุขาด ${missing.length} ธาตุ (${missing.map((e) => THAI_LABEL_5[e]).join(", ") || "ไม่ขาดเลย"})`,
  };
}

export function timeEnergyComponent(
  dayOfWeek: string,
  dominant: Element5,
  missing: readonly Element5[]
): ReadingComponent {
  const dayEl = DAY_ELEMENT[dayOfWeek] as Element5 | undefined;
  if (!dayEl) {
    return { component: "พลังกาลเวลา", weight: 0.1, score: 0, detail: "ไม่ทราบวันที่ถาม" };
  }
  const res = wuXingScore(dominant, dayEl, [...missing]);
  return {
    component: "พลังกาลเวลา",
    weight: 0.1,
    score: res.final_score,
    detail: `ธาตุวันนี้ (${THAI_LABEL_5[dayEl]}) — ${res.relation_th}`,
  };
}

export function otherInfluencesComponent(
  layers: BoundLayers,
  dominant: Element5,
  missing: readonly Element5[]
): ReadingComponent {
  const base = { component: "พลังอื่นๆที่ส่งผล", weight: 0.1 };
  const entries = Object.entries(layers) as Array<[LayerType, LayerData]>;
  if (entries.length === 0) return { ...base, score: 0, detail: "ไม่ได้ผูกเลเยอร์เสริมใดๆ" };

  const resolved = entries
    .map(([type, data]) => ({ type, el: resolveLayerElement(type, data) }))
    .filter((r): r is { type: LayerType; el: Element5 } => r.el !== null);
  if (resolved.length === 0) return { ...base, score: 0, detail: "เลเยอร์ที่เลือกยังกรอกข้อมูลไม่ครบ" };

  const scored = resolved.map((r) => ({ ...r, res: wuXingScore(dominant, r.el, [...missing]) }));
  const avg = scored.reduce((a, s) => a + s.res.final_score, 0) / scored.length;
  return {
    ...base,
    score: Math.round(avg * 100) / 100,
    detail: scored.map((s) => `${LAYER_LABEL[s.type]}: ${s.res.relation_th}`).join("; "),
  };
}

export function cardComponent(
  label: string,
  weight: number,
  cardId: string,
  dominant: Element5,
  missing: readonly Element5[]
): ReadingComponent {
  // ใช้ "เลขหลักหน่วย" ของการ์ดเป็นตัวกำหนดธาตุ (ตาม CLAUDE.md §3 Logic 21)
  const unitsDigit = parseInt(cardId[cardId.length - 1], 10);
  const cardEl = el5(unitsDigit);
  const res = wuXingScore(dominant, cardEl, [...missing]);
  return { component: label, weight, score: res.final_score, cardElement: cardEl, detail: res.relation_th };
}

/** ธาตุของเลเยอร์: คนอื่นใช้วันเกิด · ที่เหลือใช้เลขอ้างอิง */
export function resolveLayerElement(type: LayerType, data: LayerData): Element5 | null {
  if (type === "other_person") {
    if (!data.day) return null;
    // ⚠️ ย่อจริง — ใช้ธาตุประจำวันเกิดอย่างเดียว ไม่ใช่ Element Seed เต็ม 5 แหล่ง
    //    (ตรงกับ HTML ต้นฉบับ และตรงกับที่ CLAUDE.md §3.5 ระบุว่ายังเป็นแบบย่อ)
    return (DAY_ELEMENT[data.day] as Element5) ?? "Earth";
  }
  if (!data.number) return null;
  const n = parseFloat(data.number);
  return Number.isFinite(n) ? el5(n) : null;
}

export interface CombinedReading {
  components: ReadingComponent[];
  aggregate: number;
  label: string;
}

/**
 * คะแนนรวม 0-100 จาก 5 องค์ประกอบถ่วงน้ำหนัก
 *
 * ⚠️ **สูตรนี้ออกแบบขึ้นเองใน HTML ต้นฉบับ ไม่มีในตำรา** — เป็นตัวช่วยอ่านภาพรวมเท่านั้น
 *    ห้ามแสดงเป็น "คะแนนดวง" ที่ฟันธง (หลักเดียวกับคะแนนรวมของ Logic 20)
 *
 * น้ำหนัก: ส่วนบุคคล 0.10 · กาลเวลา 0.10 · อื่นๆ 0.10 · การ์ด1 0.30 · การ์ด2 0.40
 * (รวม 1.00 — การ์ดใบที่ 2 "เรื่องที่ถาม" มีน้ำหนักมากที่สุดตามเจตนาต้นฉบับ)
 */
export function computeCombinedReading(params: {
  card1Id: string;
  card2Id: string;
  dominant: Element5;
  missing: readonly Element5[];
  dayOfWeek: string;
  boundLayers: BoundLayers;
}): CombinedReading {
  const { card1Id, card2Id, dominant, missing, dayOfWeek, boundLayers } = params;

  const components: ReadingComponent[] = [
    personalEnergyComponent(missing),
    timeEnergyComponent(dayOfWeek, dominant, missing),
    otherInfluencesComponent(boundLayers, dominant, missing),
    cardComponent("การ์ดใบที่ 1 (ตัวคุณ)", 0.3, card1Id, dominant, missing),
    cardComponent("การ์ดใบที่ 2 (เรื่องที่ถาม)", 0.4, card2Id, dominant, missing),
  ];

  const weightedSum = components.reduce((a, c) => a + c.score * c.weight, 0);
  // score มีพิสัย -2..+2 → normalize เป็น 0-100
  const raw = Math.round(((weightedSum + 2) / 4) * 100 * 10) / 10;
  const aggregate = Math.max(0, Math.min(100, raw));

  const label =
    aggregate >= 70
      ? "ดวงเสริมกันดีมาก"
      : aggregate <= 30
      ? "สัญญาณขัดแย้งค่อนข้างสูง ควรระวัง"
      : "ปานกลาง มีทั้งจุดดีและจุดที่ต้องระวัง";

  return { components, aggregate, label };
}

// ---------------------------------------------------------------------------
// ✅ 2026-07-30 — แก้ด้านอาร์กิวเมนต์แล้ว (ผู้ใช้ตัดสินพร้อมทาง "ค" ของ wuXingScore)
// ---------------------------------------------------------------------------
// HTML ต้นฉบับเรียก `wuXingScore(อีกฝ่าย, dominant, missing)` (ธาตุเด่นของผู้ใช้เป็น "วัตถุ")
// ทำให้เงื่อนไข Productive Clash `missing.includes(objectElement)` เช็คกับ dominant ซึ่ง
// ไม่มีวันอยู่ใน missing → Clash ไม่มีทางทำงานเลย
// ตอนนี้ทุกองค์ประกอบเรียก `wuXingScore(dominant, อีกฝ่าย, missing)` เหมือน /compatibility
// → มุมมองเดียวทั้งระบบ และการ์ด/วัน/เลเยอร์ที่เป็น "ธาตุที่ผู้ใช้ขาด" พลิกเป็นยาได้จริง
