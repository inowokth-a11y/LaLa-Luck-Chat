// โหมด "ทำนายแบบองค์รวม" (Logic 20 ยกเครื่อง — ผู้ใช้สั่ง 22 ส.ค. 2569)
//
// แนวคิด: เพิ่มหลายส่วนพร้อมกัน (ตนเอง · บ้าน · ทะเบียนรถ · โทรศัพท์ · เพื่อนร่วมงาน ฯลฯ)
// → คะแนน 5 ด้านของแต่ละส่วน (numberAspects — สูตรเสริมที่มี caveat บังคับอยู่แล้ว)
// → ความสอดคล้องรายด้านทั้งข่าย → จุดแข็ง / ข้อควรระวัง / คำแนะนำ (เทมเพลต ฿0 ห้ามเรียก AI)
//
// "เลขตัวตน" ของส่วนตนเอง = BirthPower ล้วนผ่าน reduceTo99 — นิยามทางการของ "เลขตัวตน 00-99"
// ตาม CLAUDE.md §4 ข้อ 1 (Track A มาจาก BirthPower เพียงอย่างเดียว) ไม่ใช่สูตรการ์ด A เต็ม
// (Birth+Day+Time+Name) เพราะที่นี่ต้องการ "เลขจากวันเกิดล้วน" ไม่พึ่งชื่อ/เวลา
//
// ⚠️ คะแนน 5 ด้าน/ความสอดคล้อง เป็นสูตรเสริมออกแบบเอง (ไม่มีในตำรา) — caveat ต้องแสดงเสมอ

import {
  numberAspects,
  NUMBER_ASPECTS_CAVEAT,
  ASPECT_KEYS,
  ASPECT_LABEL_TH,
  type AspectKey,
  type NumberAspectsResult,
} from "./number-aspects";
import { digitSum, reduceTo99 } from "./card-id";
import { THAI_LABEL_5, type Element5, type WuXingResult } from "./element";
import { ELEMENT_TO_COLORS } from "./fengshui";

// ---------------------------------------------------------------------------
// ขีดจำกัดข่าย (ผู้ใช้เคาะ 22 ส.ค. 2569): ฟรี 2 สิ่งรอบตัว · สูงสุด 10 · เกิน 2 = 20 เครดิต/ครั้ง
// (เรทอยู่ที่ lib/credits/pricing.ts key "holistic_network" · เกตที่ /api/holistic)
// ---------------------------------------------------------------------------

export const FREE_NETWORK_PARTS = 2;
export const MAX_NETWORK_PARTS = 10;

// ---------------------------------------------------------------------------
// เลขตัวตนจากวันเกิด (BirthPower → 00-99)
// ---------------------------------------------------------------------------

/** BirthPower = digitSum(วัน)+digitSum(เดือน)+digitSum(ปี ค.ศ.) → reduceTo99 (เลขตัวตน 00-99) */
export function birthPowerNumber(birthDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) throw new Error(`birthDate ต้องเป็นรูปแบบ YYYY-MM-DD (ได้รับ: ${birthDate})`);
  return reduceTo99(digitSum(Number(m[3])) + digitSum(Number(m[2])) + digitSum(Number(m[1])));
}

// ---------------------------------------------------------------------------
// แยกเลข/อักษรจากช่องเลขอ้างอิง (รองรับ "จง 6266" · เบอร์ 0 นำหน้า · บ้านเลขที่)
// ---------------------------------------------------------------------------

export interface ParsedRef {
  /** สตริงหลักตัวเลขล้วน (คงเลข 0 นำหน้า) */
  digits: string;
  /** อักษรไทยบนป้าย (ถ้ามี เช่น "จง") — ส่งเข้า numberAspects เป็น plateLetters */
  letters: string | null;
}

export function parseRefInput(input: string): ParsedRef | null {
  const digits = input.replace(/\D/g, "");
  if (!digits || digits.length > 10) return null;
  const letters = (input.match(/[ก-ฮ]+/g) ?? []).join("");
  return { digits, letters: letters || null };
}

/** คะแนน 5 ด้านของส่วนหนึ่ง — ห่อ numberAspects (จุดเรียกเดียว หน้าห้ามคำนวณเอง) */
export function partAspects(
  ref: ParsedRef,
  userDominant?: Element5,
  userMissing: Element5[] = []
): NumberAspectsResult {
  return numberAspects(ref.digits, userDominant, userMissing, ref.letters ?? undefined);
}

// ---------------------------------------------------------------------------
// ความสอดคล้องรายด้านทั้งข่าย
// ---------------------------------------------------------------------------

export interface HolisticPart {
  /** ชื่อที่ผู้ใช้เห็น เช่น "ตัวคุณ (เลขตัวตน 32)" / "บ้านหลังใหม่" */
  label: string;
  icon: string;
  aspects: NumberAspectsResult;
  /** เคมีธาตุกับผู้ใช้ — null สำหรับส่วน "ตนเอง" (ไม่เทียบกับตัวเอง) */
  chemistry: WuXingResult | null;
  element: Element5 | null;
}

export type CoherenceTone = "strong" | "caution" | "neutral";

export interface AspectCoherence {
  key: AspectKey;
  labelTh: string;
  avg: number;
  min: number;
  max: number;
  strongest: { label: string; score: number };
  weakest: { label: string; score: number };
  tone: CoherenceTone;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** สรุปความสอดคล้องรายด้าน — strong: ทุกส่วน ≥6.5 · caution: มีส่วนใด ≤4 */
export function analyzeCoherence(parts: readonly HolisticPart[]): AspectCoherence[] {
  if (!parts.length) return [];
  return ASPECT_KEYS.map((key) => {
    const labelTh = ASPECT_LABEL_TH[key];
    const scores = parts.map((p) => ({ label: p.label, score: p.aspects.คะแนน[labelTh] ?? 0 }));
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const min = sorted[sorted.length - 1].score;
    const max = sorted[0].score;
    const avg = round1(scores.reduce((s, x) => s + x.score, 0) / scores.length);
    return {
      key,
      labelTh,
      avg,
      min,
      max,
      strongest: sorted[0],
      weakest: sorted[sorted.length - 1],
      tone: min >= 6.5 ? "strong" : min <= 4 ? "caution" : ("neutral" as CoherenceTone),
    };
  });
}

// ---------------------------------------------------------------------------
// จุดแข็ง / ข้อควรระวัง / คำแนะนำ — เทมเพลตจากข้อมูลจริงล้วน
// ---------------------------------------------------------------------------

/** วงจรให้กำเนิด (相生) — ใช้หา "ธาตุสะพาน" ตอนพิฆาต: ธาตุที่ตัวพิฆาตให้กำเนิด จะไปบำรุงฝ่ายถูกพิฆาตพอดี */
const GEN_NEXT: Record<Element5, Element5> = {
  Wood: "Fire",
  Fire: "Earth",
  Earth: "Metal",
  Metal: "Water",
  Water: "Wood",
};

/** วงจรพิฆาต (相剋): ผู้พิฆาต → ผู้ถูกพิฆาต */
const CONTROLS: Record<Element5, Element5> = {
  Wood: "Earth",
  Earth: "Water",
  Water: "Fire",
  Fire: "Metal",
  Metal: "Wood",
};

/** ธาตุสะพานเมื่อสองธาตุพิฆาตกัน (通關) — คืน null ถ้าคู่นี้ไม่ได้พิฆาตกัน */
export function bridgeElement(a: Element5, b: Element5): Element5 | null {
  if (CONTROLS[a] === b) return GEN_NEXT[a];
  if (CONTROLS[b] === a) return GEN_NEXT[b];
  return null;
}

export const HOLISTIC_CAVEAT =
  "ความสอดคล้องรวมและคำแนะนำเป็นเครื่องมือช่วยอ่านที่ออกแบบขึ้นเอง ไม่มีในตำรา — ใช้ประกอบการพิจารณา ไม่ใช่คำฟันธง";

export interface HolisticAdvice {
  strengths: string[];
  cautions: string[];
  tips: string[];
  caveats: string[];
}

export function holisticAdvice(
  parts: readonly HolisticPart[],
  coherence: readonly AspectCoherence[],
  userDominant: Element5 | null
): HolisticAdvice {
  const strengths: string[] = [];
  const cautions: string[] = [];
  const tips: string[] = [];

  // --- จุดแข็ง: ด้านที่ทุกส่วนหนุนกัน ---
  for (const c of coherence) {
    if (c.tone === "strong") {
      strengths.push(
        `ด้าน${c.labelTh}สอดคล้องกันทั้งข่าย (ต่ำสุด ${c.min}/10) — เด่นสุดที่ ${c.strongest.label} (${c.strongest.score})`
      );
    }
  }
  // เคมีธาตุที่เกื้อหนุน (+2) — รวม Productive Clash
  for (const p of parts) {
    if (!p.chemistry || !p.element) continue;
    if (p.chemistry.productive_clash) {
      strengths.push(
        `${p.icon} ${p.label} เป็นธาตุ${THAI_LABEL_5[p.element]}ที่คุณขาด — พลิกเป็น "ยา" เกื้อหนุนคุณ (+${p.chemistry.final_score})`
      );
    } else if (p.chemistry.final_score >= 2) {
      strengths.push(`${p.icon} ${p.label} ธาตุ${THAI_LABEL_5[p.element]}บำรุงธาตุคุณโดยตรง (+${p.chemistry.final_score})`);
    }
  }

  // --- ข้อควรระวัง: ด้านที่มีส่วนใดต่ำ + เคมีพิฆาต ---
  for (const c of coherence) {
    if (c.tone === "caution") {
      const lean =
        c.max >= 6.5 ? ` — ด้านนี้พึ่ง ${c.strongest.label} (${c.strongest.score}) ช่วยพยุงได้` : "";
      cautions.push(`${c.weakest.label} ได้ด้าน${c.labelTh}เพียง ${c.min}/10 ฉุดภาพรวมของข่าย${lean}`);
    }
  }
  for (const p of parts) {
    if (!p.chemistry || !p.element || !userDominant) continue;
    if (p.chemistry.final_score <= -2 && !p.chemistry.productive_clash) {
      const bridge = bridgeElement(userDominant, p.element);
      const remedy = bridge
        ? ` — เสริมธาตุ${THAI_LABEL_5[bridge]}เป็นสะพาน (เช่น สี${ELEMENT_TO_COLORS[bridge].slice(0, 2).join("/")})`
        : "";
      cautions.push(`${p.icon} ${p.label} ธาตุ${THAI_LABEL_5[p.element]}พิฆาตกับธาตุคุณ (${p.chemistry.final_score})${remedy}`);
    }
  }

  // --- คำแนะนำอื่น ---
  const withOverall = parts.map((p) => ({ p, overall: p.aspects.ภาพรวม }));
  if (withOverall.length >= 2) {
    const best = [...withOverall].sort((a, b) => b.overall - a.overall)[0];
    tips.push(`ส่วนที่ภาพรวมแข็งแรงสุดในข่ายคือ ${best.p.icon} ${best.p.label} (${best.overall}/10) — ใช้เป็นหลักยึดของเรื่องสำคัญ`);
  }
  const neutral = coherence.filter((c) => c.tone === "neutral");
  if (neutral.length && cautions.length === 0) {
    tips.push("ไม่มีด้านใดฉุดข่ายลงชัดเจน — จุดที่คะแนนกลางๆ พัฒนาได้ด้วยการเลือกใช้ส่วนที่เด่นด้านนั้นให้บ่อยขึ้น");
  }

  return { strengths, cautions, tips, caveats: [NUMBER_ASPECTS_CAVEAT, HOLISTIC_CAVEAT] };
}
