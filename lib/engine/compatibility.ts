// Logic 20 — ข่ายความสัมพันธ์หลาย entity (คน ↔ บ้าน/รถ/องค์กร/คนอื่น)
//
// ⚠️ สถานะการตรวจสอบ (CLAUDE.md §5): ไฟล์นี้ **ไม่ใช่ golden parity port**
//    เพราะ Logic 20 ไม่เคยมี engine ฝั่ง Python — ต้นฉบับคือ JS ที่ฝังใน
//    `legacy-artifacts/compatibility_dashboard.html` ตรงนี้จึงเป็นการ "ยกออกมาเป็นโมดูล"
//    แล้วเขียน unit test คุมพฤติกรรมเอง ไม่ได้เทียบกับ fixture ของภาษาอื่น
//
// ⚠️ สิ่งที่จงใจ "ไม่" ยกมาจาก HTML เดิม — HTML นั้นมีสำเนาสูตรของตัวเองที่ล้าสมัยแล้ว:
//    - `DAY_ELEMENT` ใน HTML ยังเป็นเวอร์ชันที่มีบั๊ก B2 (พุธ=ลม, ไม่มีพฤหัสบดีเลย)
//    - `yearEndElement` ใน HTML ยังไม่คิดขอบเขตลี่ชุน (บั๊ก B1)
//    ทั้งสองแก้ไปแล้วใน `lib/engine/element.ts` → หน้าเว็บต้องเรียก calculateElementSeed()
//    ตัวจริงเท่านั้น **ห้ามลอกสูตรจาก HTML มาใช้ซ้ำ** (ดู CLAUDE.md §5.1)

import { wuXingScore, type Element5, type WuXingResult } from "./element";
import { artifactElement } from "./numerology";

export type EntityType = "house" | "vehicle" | "phone" | "colleague" | "romantic" | "company";

export const ENTITY_ICONS: Record<EntityType, string> = {
  house: "🏠",
  vehicle: "🚗",
  phone: "📱",
  colleague: "🧑‍🤝‍🧑",
  romantic: "💞",
  company: "🏢",
};

export const ENTITY_LABELS: Record<EntityType, string> = {
  house: "บ้าน/ที่อยู่",
  vehicle: "ทะเบียนรถ",
  phone: "เบอร์โทรศัพท์",
  colleague: "เพื่อนร่วมงาน",
  romantic: "คู่รัก",
  company: "องค์กร/บริษัท",
};

export interface Entity {
  id: number;
  name: string;
  type: EntityType;
  element: Element5;
  /** อยู่ในบริบทเดียวกันทุกวัน (บ้านที่อยู่จริง/รถที่ขับเอง) → ถ่วงน้ำหนักมากกว่า */
  shared: boolean;
  /** เลขอ้างอิงดิบตามที่ผู้ใช้พิมพ์ (เช่น "จง 6266" / "0812345678") — โหมดองค์รวมใช้คิดคะแนน 5 ด้าน */
  ref?: string;
  /** วันเกิด (เฉพาะประเภทบุคคล — ธาตุ+เลขตัวตนมาจากสูตรคน ไม่ใช่เลข · 22 ส.ค. 2569) */
  birthDate?: string;
  /** วันเริ่มต้นของวัตถุ/สถานที่ (วันออกรถ/ขึ้นบ้าน/เปิดกิจการ — ไม่บังคับ) → กาลโยคย้อนหลัง */
  startDate?: string;
  /** เวลาเริ่มต้น HH:MM (ไม่บังคับ — มีแล้วเพิ่มชั้นยาม) */
  startTime?: string;
}

/** ประเภทที่เป็น "คน" — ฟอร์มกรอกวันเกิดแทนเลขอ้างอิง (สูตรคนตัวจริงถูกหลักกว่าเลข) */
export const PERSON_TYPES: readonly EntityType[] = ["colleague", "romantic"];
export const isPersonType = (t: EntityType) => PERSON_TYPES.includes(t);

/**
 * ธาตุของวัตถุจากเลขอ้างอิง (บ้านเลขที่ / ทะเบียนรถ)
 * ใช้ `artifactElement()` ของ Logic 2 ที่ผ่าน golden test แล้ว — ไม่คำนวณเอง
 *
 * ⚠️ ตาราง digit→element ให้ได้แค่ 4 ธาตุไทย (ไฟ/ดิน/ลม/น้ำ) ไม่มี "ทอง" (Metal)
 *    ดังนั้น entity ที่มาจากเลขจะไม่มีวันเป็นธาตุทอง — เป็นข้อจำกัดของตารางต้นฉบับ
 *    ไม่ใช่บั๊ก (Metal เข้ามาได้ทางเดียวคือ entity ประเภทคนที่คำนวณจากวันเกิด)
 */
export function entityElementFromNumber(num: number): Element5 {
  return artifactElement(num) as Element5;
}

export interface Scored {
  entity: Entity;
  result: WuXingResult;
}

/** คิดคะแนนความเข้ากันของทุก entity เทียบกับธาตุเด่นของผู้ใช้ */
export function scoreEntities(
  entities: readonly Entity[],
  selfElement: Element5,
  selfMissing: readonly Element5[]
): Scored[] {
  return entities.map((entity) => ({
    entity,
    result: wuXingScore(selfElement, entity.element, [...selfMissing]),
  }));
}

export type AggregateTone = "good" | "mixed" | "bad" | "empty";

export interface AggregateResult {
  /** 0-100 — null เมื่อยังไม่มี entity */
  score: number | null;
  tone: AggregateTone;
  label: string;
}

/** น้ำหนักของ entity ที่อยู่ในบริบทเดียวกันทุกวัน (บ้านที่อยู่จริง ฯลฯ) */
const SHARED_WEIGHT = 1.5;
const NORMAL_WEIGHT = 1.0;
/** final_score มีพิสัย -2..+2 → หารด้วย 2 เพื่อ normalize เป็น -1..+1 ก่อนแปลงเป็น % */
const MAX_ABS_SCORE = 2;

/**
 * คะแนนรวม 0-100 (ยกสูตรมาจาก compatibility_dashboard.html ตรงๆ)
 *
 * สูตร: ค่าเฉลี่ยถ่วงน้ำหนักของ final_score → normalize -1..+1 → แปลงเป็น 0-100
 * ⚠️ **สูตรนี้ออกแบบขึ้นเอง ไม่มีในตำรา** — เป็นตัวช่วยอ่านภาพรวมเท่านั้น
 *    ห้ามนำไปแสดงเป็น "คะแนนดวง" ที่ฟันธง และห้ามใช้ตัดสินใจแทนรายจุด
 */
export function aggregateScore(
  entities: readonly Entity[],
  selfElement: Element5,
  selfMissing: readonly Element5[]
): AggregateResult {
  if (entities.length === 0) {
    return { score: null, tone: "empty", label: "เพิ่มสิ่งรอบตัวเพื่อดูภาพรวม" };
  }

  let totalWeighted = 0;
  let totalWeight = 0;
  for (const { entity, result } of scoreEntities(entities, selfElement, selfMissing)) {
    const weight = entity.shared ? SHARED_WEIGHT : NORMAL_WEIGHT;
    totalWeighted += result.final_score * weight;
    totalWeight += weight * MAX_ABS_SCORE;
  }

  const pct = Math.round(((totalWeighted / totalWeight + 1) / 2) * 100);
  const score = Math.max(0, Math.min(100, pct));

  if (score >= 65) return { score, tone: "good", label: "ภาพรวมกลมกลืนดี" };
  if (score <= 35) return { score, tone: "bad", label: "ภาพรวมมีความตึง ลองดูรายจุด" };
  return { score, tone: "mixed", label: "ภาพรวมปานกลาง" };
}

/** สีของเส้นเชื่อม/ตัวเลข ตามผลลัพธ์ (คืนชื่อ CSS variable ไม่ใช่ hex — ห้าม hardcode สี §2) */
export function relationColorVar(r: WuXingResult): string {
  if (r.productive_clash) return "var(--clash)";
  if (r.final_score >= 1) return "var(--good)";
  if (r.final_score === -1) return "var(--neutral)";
  return "var(--bad)";
}
