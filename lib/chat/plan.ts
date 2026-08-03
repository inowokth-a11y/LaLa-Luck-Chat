// AI Chat แบบยืดหยุ่น — เฟส 1: "แผน JSON" (CLAUDE.md §16)
//
// 🔴 เส้นแบ่งที่ห้ามข้าม (สำคัญที่สุดในไฟล์นี้):
//    ✅ AI เลือกว่าจะเรียกฟังก์ชันไหน ด้วยค่าอะไร → engine คำนวณ → AI เรียบเรียง
//    ❌ AI คำนวณเอง / คิดสูตรผสมใหม่เอง = การเดาที่แต่งตัวเป็นการคำนวณ
//    เหตุผลเชิงธุรกิจ ไม่ใช่เชิงเทคนิค: §0 บอกว่าจุดขายคือ "การคำนวณจริง ไม่ใช่การเดา"
//
// ไฟล์นี้เป็นตรรกะล้วน — ไม่เรียก AI ไม่แตะ network/cookie จึงเทสต์ได้ตรงๆ
// (เฟส 1 ตามที่ตกลง: ให้ validate ผ่านเทสต์ก่อน แล้วค่อยต่อ AI จริง)
//
// ⚠️ ไม่ใช่ golden parity port — ตรรกะใหม่ ไม่มีต้นฉบับ Python

import {
  wuXingScore,
  THAI_LABEL_5,
  THAI_LABEL_4,
  calculatePersonalYear,
  getPersonalYearGuidance,
  type Element5,
  type ElementSeedResult,
} from "../engine/element";
import { getWellnessForMissing, getWellnessPair, FRAMING_CAVEAT } from "../engine/wellness";
import { getMindCare, toMindState, MIND_STATE_TH, MIND_CARE_CAVEAT } from "../engine/mind-care";
import { getWorkShield, toWorkPattern, WORK_SHIELD_CAVEAT } from "../engine/work-toxic";
import { DAY_ELEMENT } from "../engine/element";
import { numberAspects, NUMBER_ASPECTS_CAVEAT } from "../engine/number-aspects";
import { scoreCandidateName, nameComposition } from "../engine/naming";
import { rankAuspiciousDays, ACTIVITIES, TIMING_CAVEAT, type Emphasis } from "../engine/timing";
import { analyzeFengShui, type Direction, type Purpose } from "../engine/fengshui";
import { namePower } from "../engine/card-id";
import { ELEMENT_TO_COLORS, DIRECTION_TO_ELEMENT, ALL_DIRECTIONS } from "../engine/fengshui";
import {
  lookup2digit,
  lookup3digit,
  analyzePhoneNumber,
  artifactElement,
  digitSumReduce,
} from "../engine/numerology";

// ---------------------------------------------------------------------------
// บริบทโปรไฟล์ผู้ใช้ — server เติมตอนรัน ฟังก์ชัน "ของฉัน" ใช้ค่านี้ (AI ไม่แตะวันเกิด §16)
// ---------------------------------------------------------------------------

export interface PlanProfileContext {
  /** ธาตุเด่นของผู้ใช้ (จาก ElementSeed) — ใช้เป็น "ตัวเรา" ใน wuXingScore */
  dominant: Element5;
  /** ธาตุที่ผู้ใช้ขาด — ใช้ตัดสิน Productive Clash */
  missing: Element5[];
  /** ผล ElementSeed เต็ม (สำหรับ myElementSeed) */
  seed: ElementSeedResult;
  /** วัน/เดือนเกิด (สำหรับ myPersonalYear — แนวโน้มปีส่วนบุคคล) · optional เผื่อ ctx รุ่นเก่า */
  birthDay?: number;
  birthMonth?: number;
}

// ---------------------------------------------------------------------------
// ชนิดข้อมูลของ "แผน"
// ---------------------------------------------------------------------------

/** ฟังก์ชันที่เปิดให้ AI เรียกได้
 *  - 6 ตัวแรก: ไม่ต้องใช้วันเกิด (เฟส 1)
 *  - myElementSeed / myWuXingVsElement: ใช้วันเกิดของผู้ใช้ **ที่ server เติมให้** (needsProfile)
 *    🔴 AI ไม่ได้ส่งวันเกิดมา — เลือกได้แค่ "ให้ใช้ธาตุประจำตัวของผู้ใช้" เท่านั้น (§16) */
export const PLAN_FN_NAMES = [
  "lookup2digit",
  "lookup3digit",
  "analyzePhoneNumber",
  "artifactElement",
  "digitSumReduce",
  "wuXingScore",
  "myElementSeed",
  "myWuXingVsElement",
  "myNumberScore",
  "myNumberAspects",
  "myNameMatch",
  "myAuspiciousDays",
  "myFengshuiCheck",
  "myPersonalYear",
  "myWellnessAdvice",
  "myLuckyColors",
  "myMatchProfile",
  "myMindCare",
  "myWorkShield",
] as const;

export type PlanFnName = (typeof PLAN_FN_NAMES)[number];

export const CHART_TYPES = ["bar", "radar", "table", "scale"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export interface PlanCall {
  fn: PlanFnName;
  args: Record<string, unknown>;
  /** ป้ายชื่อของจุดข้อมูลนี้ในกราฟ — AI ตั้งได้ (แต่ "ตัวเลข" ต้องมาจาก engine เท่านั้น) */
  label?: string;
}

export interface PlanChart {
  type: ChartType;
  label: string;
  /** ต้องเป็น engine เดียวกันทั้งกราฟ — ห้ามเทียบข้าม Logic (§16) */
  series: PlanFnName;
}

export interface ChatPlan {
  calls: PlanCall[];
  chart?: PlanChart;
  missingInputs?: string[];
}

export type PlanValidation =
  | { ok: true; plan: ChatPlan }
  /** AI บอกว่าข้อมูลไม่พอ → ต้องถามผู้ใช้ ห้ามรันแล้วเดา (§16 กฎ 4) */
  | { ok: false; kind: "needs_input"; missingInputs: string[] }
  | { ok: false; kind: "invalid"; errors: string[] };

/** จำกัดจำนวน calls ต่อแผน — กันแผนบวมสูบ token (§16 กฎ 5) */
export const MAX_CALLS_PER_PLAN = 5;
const MAX_LABEL_LEN = 60;
const MAX_MISSING_INPUTS = 5;

// ---------------------------------------------------------------------------
// ธาตุ — รับได้ทั้งชื่ออังกฤษและไทย แล้ว normalize เป็น Element5 ตัวจริง
// ---------------------------------------------------------------------------

const ELEMENT5_ALL: readonly Element5[] = ["Wood", "Fire", "Earth", "Metal", "Water"];

// "ลม" มาจากระบบ 4 bucket (THAI_LABEL_4.Wood) ส่วน "ไม้" มาจากระบบ 5 ธาตุ — ทั้งคู่คือ Wood
const THAI_TO_ELEMENT5: Record<string, Element5> = {
  ...Object.fromEntries(ELEMENT5_ALL.map((e) => [THAI_LABEL_5[e], e])),
  [THAI_LABEL_4.Wood]: "Wood",
};

function toElement5(v: unknown): Element5 | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  const en = ELEMENT5_ALL.find((e) => e.toLowerCase() === s.toLowerCase());
  return en ?? THAI_TO_ELEMENT5[s] ?? null;
}

// ---------------------------------------------------------------------------
// นิยามฟังก์ชันใน allowlist (schema + validate + run อยู่ที่เดียวกัน)
// ---------------------------------------------------------------------------

type ArgCheck = { ok: true; args: Record<string, unknown> } | { ok: false; error: string };

interface ChartableSpec {
  /** ช่วงคะแนนของ engine นี้ — กราฟทั้งอันต้องอยู่สเกลเดียวกัน */
  scale: [number, number];
  pick: (out: unknown) => number;
}

interface FnSpec {
  /** Logic ต้นสังกัด — ใช้ยืนยันว่ากราฟไม่ได้เทียบข้าม Logic */
  logic: number;
  description: string;
  argsHint: string;
  /** ข้อจำกัดที่ต้องบอกผู้ใช้ทุกครั้ง (§5) — null = ผ่านการ verify แล้ว */
  caveat: string | null;
  chartable: ChartableSpec | null;
  /** true = ต้องใช้โปรไฟล์ผู้ใช้ (วันเกิด) ที่ server เติมให้ — ต้องล็อกอิน+กรอกข้อมูลก่อน */
  needsProfile?: boolean;
  check: (args: Record<string, unknown>) => ArgCheck;
  /** ctx = โปรไฟล์ผู้ใช้ (มีเฉพาะ fn ที่ needsProfile) — server เติมตอนรัน AI ไม่แตะ */
  run: (args: Record<string, unknown>, ctx?: PlanProfileContext) => unknown;
  /** ป้ายชื่อสำรองเมื่อ AI ไม่ได้ตั้งมา — สร้างจาก args ฝั่ง server */
  defaultLabel: (args: Record<string, unknown>) => string;
}

function intInRange(v: unknown, min: number, max: number, name: string, hint: string): ArgCheck {
  // 🔴 เข้มเรื่อง type ตามกฎ 2 — "99" (สตริง) ถือว่าผิด ไม่ใช่แปลงให้
  if (typeof v !== "number" || !Number.isInteger(v)) {
    return { ok: false, error: `${name} ต้องเป็นจำนวนเต็ม (ได้ ${JSON.stringify(v)})` };
  }
  if (v < min || v > max) {
    return { ok: false, error: `${name} ต้องอยู่ในช่วง ${min}-${max} (ได้ ${v}) — ${hint}` };
  }
  return { ok: true, args: {} };
}

const CROSS_CONTEXT_HINT =
  "ตัวเลขนอกช่วงนี้เป็นคนละบริบท (เช่นปีเกิด/ปี พ.ศ.) ห้ามเอามาเปิดตารางนี้";

export const PLAN_ALLOWLIST: Record<PlanFnName, FnSpec> = {
  lookup2digit: {
    logic: 2,
    description: "เปิดความหมายเลข 2 หลัก (00-99) จากตาราง Master Energy",
    argsHint: "{ num: 0-99 }",
    caveat: null, // ตรง 100% กับตาราง
    chartable: null,
    check: (a) => {
      const r = intInRange(a.num, 0, 99, "num", CROSS_CONTEXT_HINT);
      return r.ok ? { ok: true, args: { num: a.num } } : r;
    },
    run: (a) => lookup2digit(a.num as number),
    defaultLabel: (a) => String(a.num).padStart(2, "0"),
  },

  lookup3digit: {
    logic: 2,
    description: "เปิดความหมายเลข 3 หลัก (000-999)",
    argsHint: "{ num: 0-999 }",
    // 🔴 caveat เขียนเป็น "ภาษาผู้ใช้" (ผู้ใช้สั่ง 2 ส.ค. 2569) — ห้ามมีศัพท์ภายใน
    //    (Logic/ตาราง/fallback/verify) เพราะข้อความนี้ไหลถึงหน้าจอผู้ใช้ตรงๆ
    caveat:
      "เลขสามหลักบางชุดไม่มีคำทำนายตรงตัวในตำรา แม่หมอจึงประเมินจากพลังของเลขแต่ละหลักแทน",
    chartable: null,
    check: (a) => {
      const r = intInRange(a.num, 0, 999, "num", CROSS_CONTEXT_HINT);
      return r.ok ? { ok: true, args: { num: a.num } } : r;
    },
    run: (a) => lookup3digit(a.num as number),
    defaultLabel: (a) => String(a.num).padStart(3, "0"),
  },

  analyzePhoneNumber: {
    logic: 2,
    description: "วิเคราะห์เบอร์โทร (เลข 3 ตัวท้าย + ผลรวมทั้งเบอร์)",
    argsHint: '{ phone: "0812345678" }',
    caveat:
      "การวิเคราะห์เบอร์โทรเป็นแนวทางเสริมของแม่หมอ ยังไม่ได้อ้างอิงตำราโดยตรง — ใช้ประกอบการพิจารณานะคะ",
    chartable: null,
    check: (a) => {
      const p = a.phone;
      if (typeof p !== "string") {
        return { ok: false, error: `phone ต้องเป็นสตริง (ได้ ${JSON.stringify(p)})` };
      }
      if (!/^[0-9+\-() ]+$/.test(p)) {
        return { ok: false, error: "phone มีอักขระที่ไม่ใช่เบอร์โทร" };
      }
      const digits = p.replace(/\D/g, "");
      if (digits.length < 3 || digits.length > 15) {
        return { ok: false, error: `phone ต้องมี 3-15 หลัก (ได้ ${digits.length})` };
      }
      return { ok: true, args: { phone: p } };
    },
    run: (a) => analyzePhoneNumber(a.phone as string),
    defaultLabel: (a) => String(a.phone),
  },

  artifactElement: {
    logic: 2,
    description: "หาธาตุของวัตถุ/ทะเบียน/เลขใดๆ จากผลรวมเลข",
    argsHint: "{ num: 0-9999999999 }",
    // เกร็ดเรื่อง "ตารางไม่มีธาตุทอง" ถูกถอดจาก caveat แล้ว (ผู้ใช้ตัดสิน 2 ส.ค. 2569) —
    // เป็นข้อเท็จจริงเชิงโครงสร้างที่ไม่กระทบคำทำนาย ผู้ใช้ทั่วไปอ่านแล้วงงมากกว่าได้ประโยชน์
    // (ข้อจำกัดนี้ยังบันทึกอยู่ใน CLAUDE.md §10 + เทสต์ engine เดิม — แค่ไม่พูดกับผู้ใช้)
    caveat: null,
    chartable: null,
    check: (a) => {
      const r = intInRange(a.num, 0, 9_999_999_999, "num", "รองรับสูงสุด 10 หลัก");
      return r.ok ? { ok: true, args: { num: a.num } } : r;
    },
    run: (a) => artifactElement(a.num as number),
    defaultLabel: (a) => String(a.num),
  },

  digitSumReduce: {
    logic: 2,
    description: "ลดทอนเลขด้วยการบวกหลัก จนเหลือไม่เกินค่าที่กำหนด",
    argsHint: "{ n: number, stopAt?: 1-99 (ค่าปกติ 9) }",
    caveat: null,
    chartable: { scale: [0, 9], pick: (o) => o as number },
    check: (a) => {
      const rn = intInRange(a.n, 0, 9_999_999_999, "n", "รองรับสูงสุด 10 หลัก");
      if (!rn.ok) return rn;
      if (a.stopAt === undefined) return { ok: true, args: { n: a.n } };
      const rs = intInRange(a.stopAt, 1, 99, "stopAt", "ค่าปกติคือ 9");
      return rs.ok ? { ok: true, args: { n: a.n, stopAt: a.stopAt } } : rs;
    },
    run: (a) => digitSumReduce(a.n as number, (a.stopAt as number | undefined) ?? 9),
    defaultLabel: (a) => String(a.n),
  },

  wuXingScore: {
    logic: 1,
    description: "คะแนนความเข้ากันของธาตุผู้ใช้กับธาตุของสิ่งหนึ่ง (สมการ 2-3)",
    argsHint:
      '{ userElement: "Fire", objectElement: "Water", userMissingElements?: ["Water"] }',
    caveat: null, // golden test ผ่านแล้ว
    chartable: { scale: [-2, 2], pick: (o) => (o as { final_score: number }).final_score },
    check: (a) => {
      const u = toElement5(a.userElement);
      const o = toElement5(a.objectElement);
      if (!u) return { ok: false, error: `userElement ไม่ใช่ธาตุที่มีจริง (ได้ ${JSON.stringify(a.userElement)})` };
      if (!o) return { ok: false, error: `objectElement ไม่ใช่ธาตุที่มีจริง (ได้ ${JSON.stringify(a.objectElement)})` };

      const missing: Element5[] = [];
      if (a.userMissingElements !== undefined) {
        if (!Array.isArray(a.userMissingElements)) {
          return { ok: false, error: "userMissingElements ต้องเป็น array" };
        }
        if (a.userMissingElements.length > 5) {
          return { ok: false, error: "userMissingElements มีได้ไม่เกิน 5 ธาตุ" };
        }
        for (const raw of a.userMissingElements) {
          const el = toElement5(raw);
          if (!el) return { ok: false, error: `userMissingElements มีค่าที่ไม่ใช่ธาตุ (${JSON.stringify(raw)})` };
          if (!missing.includes(el)) missing.push(el);
        }
      }
      return { ok: true, args: { userElement: u, objectElement: o, userMissingElements: missing } };
    },
    run: (a) =>
      wuXingScore(
        a.userElement as Element5,
        a.objectElement as Element5,
        (a.userMissingElements as Element5[] | undefined) ?? []
      ),
    defaultLabel: (a) => THAI_LABEL_5[a.objectElement as Element5],
  },

  // ---- ฟังก์ชัน "ของฉัน" — ใช้วันเกิดของผู้ใช้ที่ server เติม (AI ไม่ส่งวันเกิดมา) ----
  myElementSeed: {
    logic: 1,
    description:
      "ธาตุประจำตัวของผู้ใช้ (คำนวณจากวันเกิดที่บันทึกไว้) — ใช้เมื่อถามเรื่อง 'ธาตุของฉัน/ดวงฉัน/ฉันธาตุอะไร'",
    argsHint: "{} (ไม่ต้องใส่วันเกิด — ระบบเติมจากโปรไฟล์ผู้ใช้เอง)",
    caveat: null,
    chartable: null,
    needsProfile: true,
    // ไม่มี args ให้ AI ใส่ — กันไม่ให้ AI ยัดวันเกิด/ค่าอื่นเข้ามา
    check: () => ({ ok: true, args: {} }),
    run: (_a, ctx) => ctx!.seed,
    defaultLabel: () => "ธาตุประจำตัวของฉัน",
  },

  myWuXingVsElement: {
    logic: 1,
    description:
      "เทียบธาตุประจำตัวของผู้ใช้กับธาตุที่ระบุ (ส่งเสริม/พิฆาต/กลาง) — ใช้เมื่อถาม 'ธาตุฉันเข้ากับ [ธาตุ] ไหม'",
    argsHint: '{ objectElement: "Water" } (ธาตุเรามาจากโปรไฟล์ ไม่ต้องส่ง)',
    caveat: null,
    chartable: { scale: [-2, 2], pick: (o) => (o as { final_score: number }).final_score },
    needsProfile: true,
    check: (a) => {
      const o = toElement5(a.objectElement);
      if (!o) return { ok: false, error: `objectElement ไม่ใช่ธาตุที่มีจริง (ได้ ${JSON.stringify(a.objectElement)})` };
      return { ok: true, args: { objectElement: o } };
    },
    // ตัวเรา = dominant ของผู้ใช้ · missing ของผู้ใช้ → Productive Clash คิดจากของจริง
    run: (a, ctx) => wuXingScore(ctx!.dominant, a.objectElement as Element5, ctx!.missing),
    defaultLabel: (a) => `ฉัน ↔ ${THAI_LABEL_5[a.objectElement as Element5]}`,
  },

  myNumberScore: {
    logic: 2,
    description:
      "คะแนนความเข้ากันของเลขหนึ่งชุด (ทะเบียนรถ/บ้านเลขที่/เลขใดๆ) กับธาตุประจำตัวผู้ใช้ — " +
      "ใช้เมื่อถามว่าเลขนั้นส่งผลต่อ 'ตัวฉัน' อย่างไร · หลายเลขให้เรียกทีละเลขแล้วใส่ chart bar เทียบกัน",
    argsHint: "{ num: 0-9999999999 }",
    caveat: null, // ประกอบจาก artifactElement (ตาราง §5.4) + wuXingScore ที่ผ่าน golden test
    chartable: { scale: [-2, 2], pick: (o) => (o as { final_score: number }).final_score },
    needsProfile: true,
    check: (a) => {
      const r = intInRange(a.num, 0, 9_999_999_999, "num", "รองรับสูงสุด 10 หลัก");
      return r.ok ? { ok: true, args: { num: a.num } } : r;
    },
    // เลข → ธาตุ (ตาราง §5.4) → คะแนนเทียบธาตุประจำตัว — engine ล้วนทั้งสาย ไม่มี AI คำนวณ
    run: (a, ctx) => {
      const el = toElement5(artifactElement(a.num as number))!; // ตารางให้ 4 ธาตุไทย — อยู่ใน Element5 เสมอ
      const score = wuXingScore(ctx!.dominant, el, ctx!.missing);
      return { เลข: a.num, ธาตุของเลข: THAI_LABEL_5[el], ...score };
    },
    defaultLabel: (a) => `เลข ${a.num}`,
  },

  myNumberAspects: {
    logic: 2,
    description:
      "คะแนนเลข 5 ด้าน 0-10 (การเงิน/ความรัก/สุขภาพกายใจ/โชค/อำนาจบารมี) + จุดเด่น/ข้อควรระวัง — " +
      "**ตัวหลักสำหรับคำถามทะเบียนรถ บ้านเลขที่ เบอร์โทร เลขใดๆ ว่า 'ดีไหม/เป็นยังไง'** " +
      "หลายเลขให้เรียกทีละเลข (chart bar เทียบภาพรวมได้)",
    argsHint: "{ num: 0-9999999999 } (เอาเฉพาะหลักตัวเลข เช่น ทะเบียน 'จง 6266' → 6266)",
    caveat: NUMBER_ASPECTS_CAVEAT,
    chartable: { scale: [0, 10], pick: (o) => (o as { ภาพรวม: number }).ภาพรวม },
    needsProfile: true,
    check: (a) => {
      const r = intInRange(a.num, 0, 9_999_999_999, "num", "รองรับสูงสุด 10 หลัก");
      return r.ok ? { ok: true, args: { num: a.num } } : r;
    },
    // สูตรเสริม 3 ชั้น deterministic (ดู lib/engine/number-aspects.ts) — ไม่มี AI แต่งตัวเลข
    run: (a, ctx) => numberAspects(a.num as number, ctx?.dominant, ctx?.missing ?? []),
    defaultLabel: (a) => `เลข ${a.num}`,
  },

  myNameMatch: {
    logic: 19,
    description:
      "ธาตุของชื่อ/คำ (จากตารางกลุ่มอักษร) + คะแนนความเข้ากับธาตุประจำตัวผู้ใช้ + ผลรวมเลขศาสตร์ — " +
      "**ตัวหลักสำหรับคำถามเรื่องชื่อ นามสกุล ชื่อร้าน ชื่อแบรนด์** ว่าเข้ากับดวงไหม · " +
      "หลายชื่อให้เรียกทีละชื่อ (chart bar เทียบได้) · 🔴 ห้ามเดาธาตุของชื่อเองแล้วไปเรียก fn อื่น",
    argsHint: '{ name: "ชื่อภาษาไทยหรืออังกฤษ" } (เอาเฉพาะชื่อ ไม่รวมคำนำหน้า)',
    caveat:
      "การเทียบธาตุของชื่อใช้หลักกลุ่มอักษรซึ่งยังรอการยืนยันจากเจ้าของสูตร " +
      "ใช้เป็นแนวทางประกอบ ไม่ใช่คำตัดสิน",
    chartable: { scale: [-2, 2], pick: (o) => (o as { คะแนนรวมถ่วงน้ำหนัก?: number }).คะแนนรวมถ่วงน้ำหนัก ?? 0 },
    needsProfile: true,
    check: (a) => {
      const raw = typeof a.name === "string" ? a.name.trim() : "";
      if (!raw || raw.length > 60) {
        return { ok: false, error: "name ต้องเป็นข้อความ 1-60 ตัวอักษร" };
      }
      if (!/[ก-๙A-Za-z]/.test(raw)) {
        return { ok: false, error: "name ต้องมีตัวอักษรไทยหรืออังกฤษอย่างน้อย 1 ตัว" };
      }
      return { ok: true, args: { name: raw } };
    },
    // ธาตุชื่อจากหลักกลุ่มอักษร (engine Logic 19) + wuXingScore ตัวจริง — AI ไม่มีสิทธิ์กำหนดธาตุ
    // แสดง "องค์ประกอบธาตุ" รายสัดส่วนให้ผู้ใช้เห็น + คะแนนถ่วงน้ำหนักตามสัดส่วนจริง (4 ส.ค. 2569)
    run: (a, ctx) => {
      const name = a.name as string;
      const comp = nameComposition(name);
      if (comp.scoredChars === 0 || !comp.dominant) {
        return { ชื่อ: name, error: "ไม่พบตัวอักษรที่จับคู่ธาตุได้" };
      }
      const scored = scoreCandidateName(name, ctx!.dominant, ctx!.missing);
      // คะแนนต่อธาตุ × สัดส่วน → คะแนนรวมถ่วงน้ำหนัก (ทุกตัวจาก engine — ไม่มีเลขจาก AI)
      const องค์ประกอบ: Record<string, string> = {};
      let weighted = 0;
      const คะแนนต่อธาตุ: Record<string, number> = {};
      for (const [el, share] of Object.entries(comp.shares) as [Element5, number][]) {
        องค์ประกอบ[THAI_LABEL_5[el]] = `${Math.round(share * 100)}%`;
        const sc = wuXingScore(ctx!.dominant, el, ctx!.missing).final_score;
        คะแนนต่อธาตุ[THAI_LABEL_5[el]] = sc;
        weighted += share * sc;
      }
      return {
        ...("error" in scored ? {} : scored),
        องค์ประกอบธาตุ: องค์ประกอบ,
        คะแนนต่อธาตุ,
        คะแนนรวมถ่วงน้ำหนัก: Math.round(weighted * 100) / 100,
        ผลรวมเลขศาสตร์: namePower(name),
      };
    },
    defaultLabel: (a) => `ชื่อ ${a.name}`,
  },

  myAuspiciousDays: {
    logic: 3,
    description:
      "จัดอันดับวันดี+ยามมงคลรายชั่วโมงล่วงหน้า (กาลโยค+อุบากอง) — **ตัวหลักสำหรับคำถามฤกษ์/วันไหนดี/" +
      "กี่โมงดี** เช่น ออกรถ เปิดกิจการ ขึ้นบ้าน เจรจา · ไม่รู้ประเภทงาน → missingInputs:[\"timingTask\"]",
    argsHint:
      '{ task: "open_company"|"car_registration"|"housewarming"|"negotiation"|"general", days?: 3-30 (default 14) }',
    caveat: TIMING_CAVEAT,
    chartable: null,
    needsProfile: false, // ฤกษ์ระดับปี/วัน ไม่ใช้วันเกิด (ชั้นดวงส่วนตัวยังไม่รวม — อยู่ใน caveat)
    check: (a) => {
      const task = ACTIVITIES.find((x) => x.key === a.task);
      if (!task) {
        return { ok: false, error: `task ต้องเป็นหนึ่งใน: ${ACTIVITIES.map((x) => x.key).join(", ")}` };
      }
      const d = typeof a.days === "number" && Number.isInteger(a.days) && a.days >= 3 && a.days <= 30 ? a.days : 14;
      return { ok: true, args: { task: task.key, days: d } };
    },
    run: (a) => {
      const act = ACTIVITIES.find((x) => x.key === a.task)!;
      // 🔴 วันที่ต้องเป็น "วันของไทย" (UTC+7) — toISOString ล้วนให้วัน UTC ซึ่งช่วงหัวค่ำ-เที่ยงคืนไทย
      // ยังเป็นเมื่อวาน → เคยทำให้ "พรุ่งนี้" ในคำตอบชี้ผิดวัน (เจอจริง 4 ส.ค. 2569)
      const BKK_MS = 7 * 3600_000;
      const from = new Date(Date.now() + BKK_MS);
      const to = new Date(from.getTime() + (a.days as number) * 86400_000);
      const iso = (dt: Date) => dt.toISOString().slice(0, 10);
      const r = rankAuspiciousDays({ fromISO: iso(from), toISO: iso(to), emphasis: act.emphasis as Emphasis });
      // ย่อผล — เอาเฉพาะหัวตาราง (ดีสุด 4 + ควรเลี่ยง 2) กัน context บวม
      const best = r.days.slice(0, 4);
      const avoid = r.days.filter((d) => d.verdict === "avoid").slice(0, 2);
      return {
        ประเภทงาน: act.label,
        วันนี้ของไทย: iso(from),
        ช่วงที่ดู: `${iso(from)} ถึง ${iso(to)}`,
        วันแนะนำ: best,
        วันควรเลี่ยง: avoid,
      };
    },
    defaultLabel: (a) => `ฤกษ์${ACTIVITIES.find((x) => x.key === a.task)?.label ?? ""}`,
  },

  myFengshuiCheck: {
    logic: 7,
    description:
      "วิเคราะห์ฮวงจุ้ยจากทิศ (และสี/รูปทรงถ้าผู้ใช้บอก) เทียบธาตุประจำตัวผู้ใช้ พร้อมคำแนะนำแก้เคล็ด — " +
      "**ตัวหลักสำหรับคำถามฮวงจุ้ย/หันทิศไหน/โต๊ะ-เตียง-ประตูทิศนี้ดีไหม** · " +
      'ไม่รู้ทิศ → missingInputs:["direction"]',
    argsHint:
      '{ direction: "เหนือ"|"ใต้"|"ตะวันออก"|"ตะวันตก"|"ตะวันออกเฉียงเหนือ"|"ตะวันออกเฉียงใต้"|' +
      '"ตะวันตกเฉียงเหนือ"|"ตะวันตกเฉียงใต้"|"กลาง", purpose?: "bedroom"|"office"|"living"|"entrance", ' +
      'color?: "ชื่อสีไทย", shape?: "รูปทรง" }',
    caveat: "ผลนี้วิเคราะห์จากทิศ สี และรูปทรงตามหลักธาตุ ยังไม่รวมศาสตร์ดาวเหิน โปรดใช้เป็นแนวทางประกอบ",
    chartable: null,
    needsProfile: true,
    check: (a) => {
      if (!ALL_DIRECTIONS.includes(a.direction as Direction)) {
        return { ok: false, error: `direction ต้องเป็นหนึ่งใน: ${ALL_DIRECTIONS.join(", ")}` };
      }
      const purpose = ["bedroom", "office", "living", "entrance"].includes(a.purpose as string)
        ? (a.purpose as Purpose)
        : ("office" as Purpose);
      const out: Record<string, unknown> = { direction: a.direction, purpose };
      // สี/รูปทรงเป็นข้อความอิสระ — engine จับคู่เอง จับไม่ได้ = ข้าม (ไม่เดา)
      if (typeof a.color === "string" && a.color.trim()) out.color = a.color.trim().slice(0, 30);
      if (typeof a.shape === "string" && a.shape.trim()) out.shape = a.shape.trim().slice(0, 30);
      return { ok: true, args: out };
    },
    run: (a, ctx) =>
      analyzeFengShui(ctx!.dominant, ctx!.missing, {
        direction: a.direction as Direction,
        purpose: a.purpose as Purpose,
        color: (a.color as string) ?? null,
        shape: (a.shape as string) ?? null,
      }),
    defaultLabel: (a) => `ฮวงจุ้ยทิศ${a.direction}`,
  },

  // ---- ฟังก์ชันสายคำปรึกษา (2 ส.ค. 2569 — ผู้ใช้ขอ: แนวโน้ม/แนวทางตัดสินใจจากหลักธาตุ) ----
  myPersonalYear: {
    logic: 1,
    description:
      "แนวโน้มปีส่วนบุคคลของผู้ใช้ (ธีมปี จุดที่ควรระวัง โอกาส คำแนะนำ) — ใช้กับคำถามขอคำปรึกษา " +
      "แนวโน้มอนาคต หรือประกอบการตัดสินใจ เช่น 'ปีนี้เหมาะเริ่มอะไรใหม่ไหม' 'ช่วงนี้ควรวางตัวยังไง'",
    argsHint: "{} (คำนวณจากวันเกิดในโปรไฟล์ — ห้ามใส่ค่าใดๆ)",
    caveat: "แนวโน้มปีส่วนบุคคลเป็นภาพกว้างตามรอบปี ใช้เป็นแนวทางประกอบ ไม่ใช่คำตัดสินแทนการพิจารณาของคุณ",
    chartable: null,
    needsProfile: true,
    check: () => ({ ok: true, args: {} }), // ไม่มี args — กัน AI ยัดวันเกิด/ปีเอง
    run: (_a, ctx) => {
      if (!ctx?.birthDay || !ctx?.birthMonth) return { error: "ต้องมีวันเกิดเต็ม (วัน/เดือน) ในโปรไฟล์" };
      const year = new Date().getFullYear();
      const py = calculatePersonalYear(ctx.birthDay, ctx.birthMonth, year);
      return { ปีปฏิทิน: year, เลขปีส่วนบุคคล: py, ...getPersonalYearGuidance(py) };
    },
    defaultLabel: () => "แนวโน้มปีส่วนบุคคล",
  },

  myWellnessAdvice: {
    logic: 16,
    description:
      "กิจกรรมดูแลตัวเองที่เหมาะกับธาตุของผู้ใช้ (สมาธิ/การหายใจ/การเคลื่อนไหว พร้อมงานวิจัยอ้างอิง) — " +
      "ใช้กับคำถามแนวเครียด เหนื่อยใจ อยากดูแลตัวเอง หรือขอวิธีเสริมพลังธาตุที่ขาด",
    argsHint: "{} (ใช้ธาตุที่ขาดจากโปรไฟล์ — ห้ามใส่ค่าใดๆ)",
    caveat: FRAMING_CAVEAT, // "กิจกรรมสุขภาวะทั่วไป...ไม่ใช่การรักษา หากกังวลควรปรึกษาผู้เชี่ยวชาญ"
    chartable: null,
    needsProfile: true,
    check: () => ({ ok: true, args: {} }),
    // ขาดธาตุ → กิจกรรมเสริมธาตุนั้น · ธาตุครบ → กิจวัตรของธาตุเด่นแทน (แบบเดียวกับหน้า /wellness)
    run: (_a, ctx) =>
      ctx!.missing.length > 0
        ? { ธาตุที่ขาด: ctx!.missing.map((m) => THAI_LABEL_5[m]), กิจกรรมแนะนำ: getWellnessForMissing(ctx!.missing) }
        : { ธาตุครบสมดุล: true, กิจวัตรธาตุเด่น: getWellnessPair(ctx!.dominant) },
    defaultLabel: () => "กิจกรรมเสริมพลังธาตุ",
  },

  myLuckyColors: {
    logic: 7,
    description:
      "สีมงคลของผู้ใช้ (เสื้อผ้า/เล็บ/ของใช้) จากธาตุที่ขาด+ธาตุที่บำรุงธาตุเด่น+ธาตุประจำวันนี้ — " +
      "ใช้กับคำถาม 'วันนี้ใส่สีอะไรดี' 'ทำเล็บสีอะไร' 'สีเสริมดวง'",
    argsHint: "{} (ใช้ธาตุจากโปรไฟล์ — ห้ามใส่ค่าใดๆ)",
    caveat: "การเลือกสีตามธาตุเป็นเคล็ดเสริมความมั่นใจตามหลักธาตุ ไม่ใช่ข้อบังคับ — สีที่ใส่แล้วมั่นใจคือสีที่ดีเสมอค่ะ",
    chartable: null,
    needsProfile: true,
    check: () => ({ ok: true, args: {} }),
    run: (_a, ctx) => {
      const support = SUPPORT_OF[ctx!.dominant]; // ธาตุที่ให้กำเนิดธาตุเด่นเรา (印 บำรุง)
      const today = THAI_DAY_NAMES[new Date().getDay()];
      const dayEl = DAY_ELEMENT[today];
      return {
        สีเสริมธาตุที่ขาด: ctx!.missing.map((m) => ({ ธาตุ: THAI_LABEL_5[m], สี: ELEMENT_TO_COLORS[m] })),
        สีบำรุงธาตุเด่น: { ธาตุ: THAI_LABEL_5[support], สี: ELEMENT_TO_COLORS[support] },
        สีธาตุเด่นของตัวเอง: { ธาตุ: THAI_LABEL_5[ctx!.dominant], สี: ELEMENT_TO_COLORS[ctx!.dominant] },
        วันนี้: dayEl
          ? { วัน: today, ธาตุประจำวัน: THAI_LABEL_5[dayEl], สีธาตุของวัน: ELEMENT_TO_COLORS[dayEl] }
          : { วัน: today },
      };
    },
    defaultLabel: () => "สีมงคลของฉัน",
  },

  myMatchProfile: {
    logic: 1,
    description:
      "ธาตุของคน/คู่ที่เกื้อหนุนผู้ใช้ที่สุด (จัดอันดับทั้ง 5 ธาตุด้วยคะแนนความเข้ากัน) + ทิศที่ธาตุตรงกัน — " +
      "ใช้กับคำถาม 'เนื้อคู่/คนที่เหมาะกับฉันเป็นแบบไหน' 'จะเจอคนถูกใจที่ไหน'",
    argsHint: "{} (ใช้ธาตุจากโปรไฟล์ — ห้ามใส่ค่าใดๆ)",
    caveat:
      "หลักธาตุบอกได้แค่ 'พลังงานแบบไหนเกื้อหนุนคุณ' — ระบุตัวบุคคล สถานที่ หรือเวลาที่จะพบกันแน่นอนไม่ได้ค่ะ",
    chartable: null,
    needsProfile: true,
    check: () => ({ ok: true, args: {} }),
    run: (_a, ctx) => {
      // จัดอันดับทุกธาตุด้วย wuXingScore ตัวจริง (มุมมองเดียวกับ /compatibility)
      const ranked = (Object.keys(THAI_LABEL_5) as Element5[])
        .map((el) => {
          const s = wuXingScore(ctx!.dominant, el, ctx!.missing);
          return { ธาตุ: THAI_LABEL_5[el], คะแนน: s.final_score, ความสัมพันธ์: s.relation_th, _el: el };
        })
        .sort((a, b) => b.คะแนน - a.คะแนน);
      const top = ranked[0].คะแนน;
      const best = ranked.filter((r) => r.คะแนน === top);
      const dirs = ALL_DIRECTIONS.filter((d) => best.some((b) => DIRECTION_TO_ELEMENT[d] === b._el));
      return {
        ธาตุคู่ที่เกื้อหนุนที่สุด: best.map(({ _el, ...r }) => r),
        อันดับทั้งหมด: ranked.map(({ _el, ...r }) => r),
        ทิศที่ธาตุตรงกับคู่เกื้อหนุน: dirs,
      };
    },
    defaultLabel: () => "ธาตุคู่ที่เกื้อหนุนฉัน",
  },

  myMindCare: {
    logic: 16,
    description:
      "เทคนิคดูแลใจเฉพาะสภาวะ (เครียดเฉียบพลัน/กังวลคิดวน/สงสัยตัวเอง/หมดพลัง) เลือกให้เข้ากับธาตุผู้ใช้ — " +
      "ใช้กับอารมณ์เฉียบพลันตอนนี้ เช่น 'เครียดมากตอนนี้' 'คิดวนไม่หยุด' 'เพิ่งโดนต่อว่ามา ใจสั่น'",
    argsHint: '{ state: "stressed|anxious|self_doubt|drained" (หรือภาษาไทย เช่น เครียด/กังวล/สงสัยตัวเอง/หมดพลัง) }',
    caveat: MIND_CARE_CAVEAT,
    chartable: null,
    needsProfile: true,
    check: (a) => {
      const st = toMindState(a.state);
      if (!st) {
        return {
          ok: false,
          error: `state "${String(a.state)}" ไม่อยู่ในสภาวะที่ระบบรู้จัก (${Object.values(MIND_STATE_TH).join("/")})`,
        };
      }
      return { ok: true, args: { state: st } };
    },
    run: (a, ctx) => {
      const r = getMindCare(a.state as never, ctx!.missing);
      return {
        สภาวะ: r.stateTh,
        เทคนิคหลัก: {
          ชื่อ: `${r.primary.nameTh} (${r.primary.name})`,
          วิธีทำ: r.primary.steps,
          ใช้เวลา_นาที: r.primary.durationMin,
          เสริมธาตุ: r.primary.elementNote,
          ...(r.primary.caution ? { ข้อควรระวัง: r.primary.caution } : {}),
        },
        เทคนิคสำรอง: {
          ชื่อ: `${r.alternative.nameTh} (${r.alternative.name})`,
          วิธีทำ: r.alternative.steps,
          ใช้เวลา_นาที: r.alternative.durationMin,
          เสริมธาตุ: r.alternative.elementNote,
        },
        เทคนิคหลักเสริมธาตุที่ขาดพอดี: r.primaryBoostsMissing,
        สัญญาณที่ควรพบผู้เชี่ยวชาญ: r.redFlag,
      };
    },
    defaultLabel: () => "เทคนิคดูแลใจ",
  },

  myWorkShield: {
    logic: 16,
    description:
      "กลยุทธ์รับมือปัญหาที่ทำงานเป็นพิษ (ขโมยผลงาน/ทำให้สงสัยตัวเอง/โยนความผิด/จุกจิกควบคุม/" +
      "ประชดเงียบใส่/ประจานต่อหน้า/กีดกัน/เล่นพวก/อยากลาออก) พร้อมสคริปต์พูดจริง+เทคนิคตั้งหลักตามธาตุ — " +
      "ใช้เมื่อผู้ใช้เล่าปัญหากับหัวหน้า/เพื่อนร่วมงานแบบเจาะจง",
    argsHint:
      '{ pattern: "credit_stealing|gaslighting|scapegoating|micromanagement|passive_aggression|public_humiliation|exclusion|favoritism|exit_thoughts" }',
    caveat: WORK_SHIELD_CAVEAT,
    chartable: null,
    needsProfile: true,
    check: (a) => {
      const p = toWorkPattern(a.pattern);
      if (!p) {
        return { ok: false, error: `pattern "${String(a.pattern)}" ไม่อยู่ในรูปแบบที่ระบบรู้จัก` };
      }
      return { ok: true, args: { pattern: p } };
    },
    run: (a, ctx) => {
      const r = getWorkShield(a.pattern as never, ctx!.missing);
      return {
        รูปแบบที่เจอ: r.nameTh,
        คำยืนยัน: r.validation,
        ...(r.signs ? { สัญญาณที่มักเจอ: r.signs } : {}),
        ...(r.strategy ? { วิธีรับมือ: r.strategy } : {}),
        ...(r.script ? { สคริปต์พูดหรือเขียน: r.script } : {}),
        ...(r.escalation ? { จุดที่ควรยกระดับ: r.escalation } : {}),
        ...(r.elementNote ? { พลังงานของรูปแบบนี้: r.elementNote } : {}),
        เทคนิคตั้งหลัก: {
          ชื่อ: `${r.grounding.nameTh} (${r.grounding.name})`,
          วิธีทำ: r.grounding.steps,
          ใช้เวลา_นาที: r.grounding.durationMin,
          เสริมธาตุ: r.grounding.elementNote,
        },
        ...(r.exitSteps ? { ขั้นแรกก่อนตัดสินใจ: r.exitSteps } : {}),
      };
    },
    defaultLabel: () => "แนวทางรับมือที่ทำงาน",
  },
};

// วงจรให้กำเนิด (相生) — ใครให้กำเนิดธาตุนี้ (印 บำรุงเรา = ทาง ค §5)
const SUPPORT_OF: Record<Element5, Element5> = {
  Fire: "Wood",
  Earth: "Fire",
  Metal: "Earth",
  Water: "Metal",
  Wood: "Water",
};

const THAI_DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

// ---------------------------------------------------------------------------
// missingInputs — ชื่อ input ที่ระบบรู้จัก (ใช้เรนเดอร์คำถามกลับไปหาผู้ใช้)
// ---------------------------------------------------------------------------

/** key ถามกลับสายฤกษ์ — route แนบชิปประเภทงาน (เทมเพลต ฿0) */
export const TIMING_TASK_KEY = "timingTask";
export const TIMING_TASK_SUGGESTIONS = ACTIVITIES.map((a) => `หาฤกษ์${a.label}ให้หน่อย`);

/** key ถามกลับสายฮวงจุ้ย — route แนบชิปทิศ */
export const DIRECTION_KEY = "direction";
export const DIRECTION_SUGGESTIONS = ["เหนือ", "ใต้", "ตะวันออก", "ตะวันตก"].map(
  (d) => `หันทิศ${d}`
);

export const MISSING_INPUT_LABELS: Record<string, string> = {
  timingTask: "ประเภทงานที่จะหาฤกษ์ (เปิดกิจการ / ออกรถ / ขึ้นบ้านใหม่ / เจรจา / ทั่วไป)",
  direction: "ทิศที่หันหรือตั้งอยู่ (เช่น เหนือ ตะวันตกเฉียงใต้)",
  birthDate: "วันเดือนปีเกิด (ค.ศ.)",
  birthTime: "เวลาเกิด",
  birthProvince: "จังหวัดที่เกิด",
  dayOfWeek: "วันในสัปดาห์ที่เกิด",
  gender: "เพศ",
  phone: "เบอร์โทรศัพท์",
  plateNumber: "เลขทะเบียน",
  targetNumber: "ตัวเลขที่อยากให้ดู",
  userElement: "ธาตุประจำตัว (ต้องคำนวณจากวันเกิดก่อน)",
  consultTopic: "เรื่องที่หนักใจเป็นด้านไหน (งาน / เงิน / ความรัก / ครอบครัว / สุขภาพใจ)",
  workPattern: "รูปแบบปัญหาที่เจอในที่ทำงาน",
};

/** ถามกลับเมื่อเล่าปัญหาที่ทำงานแบบกว้างๆ — ชิปให้จิ้มเป็นคำถามเต็ม (สไลซ์ B) */
export const WORK_PATTERN_KEY = "workPattern";
export const WORK_PATTERN_SUGGESTIONS: string[] = [
  "โดนขโมยผลงาน/เครดิต ทำยังไงดี",
  "โดนพูดจนสงสัยความจำตัวเอง ทำยังไงดี",
  "โดนจุกจิกควบคุมทุกอย่าง ทำยังไงดี",
  "โดนตำหนิต่อหน้าคนอื่น ทำยังไงดี",
  "อยากลาออกแต่ไม่แน่ใจ ช่วยคิดหน่อย",
];

/**
 * เฟส 1 จิตวิทยาในแชท (ผู้ใช้ยืนยัน 2 ส.ค. 2569): คำปรึกษาที่คลุมเครือ → ถามกลับ 1 คำถาม
 * เพื่อให้ระบบเลือกสูตรถูก (คำตอบผู้ใช้ป้อนเข้า logic — ไม่ใช่ให้ AI ด้นสด) · ถามกลับไม่หักสิทธิ์
 */
export const CONSULT_TOPIC_KEY = "consultTopic";

/** ชิปคำตอบสำเร็จรูป — ผู้ใช้จิ้มแล้วกลายเป็นคำถามเต็มที่ planner เลือกสูตรได้ทันที (฿0 เทมเพลตล้วน) */
export const CONSULT_TOPIC_SUGGESTIONS: string[] = [
  "หนักใจเรื่องงาน ควรทำยังไงดี",
  "หนักใจเรื่องเงิน ควรทำยังไงดี",
  "หนักใจเรื่องความรัก ควรทำยังไงดี",
  "เครียดสะสม อยากได้วิธีดูแลใจ",
];

/** ข้อความถามข้อมูลที่ขาด — ถามตรงๆ ดีกว่ารันแล้วเดา */
export function missingInputPrompt(missing: string[]): string {
  // ถามกลับเรื่องที่ทำงาน — validate ความรู้สึกก่อน (จาก opening_toxic ของ KB ต้นฉบับ)
  if (missing.includes(WORK_PATTERN_KEY)) {
    return (
      "ฟังดูเหนื่อยมากเลยนะคะ สิ่งที่เจออยู่มีชื่อเรียกและมีวิธีรับมือ — ไม่ใช่ความอ่อนแอของคุณค่ะ 🐾\n\n" +
      "เล่าเพิ่มอีกนิดได้ไหมคะ ว่าสิ่งที่เจอบ่อยที่สุดเป็นแบบไหน แม่หมอจะได้แนะวิธีรับมือที่ตรงจุด (ถามกลับแบบนี้ไม่นับสิทธิ์นะคะ)"
    );
  }
  // ถามกลับเชิงปรึกษา — โทนเห็นใจ ไม่ใช่ฟอร์มขอข้อมูล
  if (missing.includes(CONSULT_TOPIC_KEY)) {
    return (
      "แม่หมออยากช่วยให้ตรงจุดที่สุดค่ะ 🐾 เล่าเพิ่มอีกนิดได้ไหมคะ ว่าเรื่องที่หนักใจตอนนี้" +
      "เป็นด้านไหนเป็นหลัก — งาน เงิน ความรัก ครอบครัว หรืออยากได้วิธีดูแลใจ\n\n" +
      "บอกมาแล้วแม่หมอจะคำนวณแนวทางที่เหมาะกับธาตุและจังหวะปีของคุณให้เลยค่ะ (ถามกลับแบบนี้ไม่นับสิทธิ์นะคะ)"
    );
  }
  const known = missing.filter((k) => MISSING_INPUT_LABELS[k]);
  const unknownCount = missing.length - known.length;
  const lines = known.map((k) => `• ${MISSING_INPUT_LABELS[k]}`);
  // planner ตั้ง key นอกลิสต์เองได้ — แสดงเป็นประโยคชวนเล่า ไม่โชว์ key ภาษาอังกฤษดิบใส่ผู้ใช้
  if (unknownCount > 0) lines.push("• รายละเอียดที่เกี่ยวข้อง (พิมพ์เล่าเพิ่มในคำถามได้เลยค่ะ)");
  const items = lines.join("\n");
  return `ขอข้อมูลเพิ่มอีกนิดนะคะ เพื่อให้คำนวณได้จริง ไม่ใช่เดา 🙏\n\n${items}`;
}

// ---------------------------------------------------------------------------
// Validate — ด่านเดียวที่กั้นระหว่าง "AI พูด" กับ "ระบบรัน"
// ---------------------------------------------------------------------------

function cleanString(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s.length === 0 ? null : s.slice(0, maxLen);
}

/** จำนวนจุดข้อมูลขั้นต่ำต่อชนิดกราฟ — กราฟเปรียบเทียบที่มีจุดเดียวไม่มีความหมาย */
const MIN_POINTS: Record<ChartType, number> = { bar: 2, radar: 3, table: 2, scale: 1 };

export function validateChatPlan(raw: unknown): PlanValidation {
  const errors: string[] = [];

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, kind: "invalid", errors: ["แผนต้องเป็น JSON object"] };
  }
  const p = raw as Record<string, unknown>;

  // ---- กฎ 4: ข้อมูลไม่พอ → ถามผู้ใช้ ห้ามรันแล้วเดา (ตรวจก่อนอย่างอื่น) ----
  if (Array.isArray(p.missingInputs)) {
    const missing: string[] = [];
    for (const m of p.missingInputs) {
      const s = cleanString(m, 40);
      if (s && !missing.includes(s)) missing.push(s);
    }
    if (missing.length > 0) {
      return { ok: false, kind: "needs_input", missingInputs: missing.slice(0, MAX_MISSING_INPUTS) };
    }
  }

  // ---- calls ----
  if (!Array.isArray(p.calls) || p.calls.length === 0) {
    return { ok: false, kind: "invalid", errors: ["แผนต้องมี calls อย่างน้อย 1 รายการ"] };
  }
  if (p.calls.length > MAX_CALLS_PER_PLAN) {
    return {
      ok: false,
      kind: "invalid",
      errors: [`calls มีได้ไม่เกิน ${MAX_CALLS_PER_PLAN} รายการ (ได้ ${p.calls.length})`],
    };
  }

  const calls: PlanCall[] = [];
  p.calls.forEach((rawCall, i) => {
    if (rawCall === null || typeof rawCall !== "object" || Array.isArray(rawCall)) {
      errors.push(`calls[${i}] ต้องเป็น object`);
      return;
    }
    const c = rawCall as Record<string, unknown>;

    // กฎ 1: fn ต้องอยู่ใน allowlist — ไม่ใช่เรียกอะไรก็ได้
    const fn = c.fn;
    if (typeof fn !== "string" || !(PLAN_FN_NAMES as readonly string[]).includes(fn)) {
      errors.push(`calls[${i}].fn "${String(fn)}" ไม่อยู่ใน allowlist`);
      return;
    }
    const spec = PLAN_ALLOWLIST[fn as PlanFnName];

    const args = c.args;
    if (args === null || typeof args !== "object" || Array.isArray(args)) {
      errors.push(`calls[${i}].args ต้องเป็น object`);
      return;
    }

    // กฎ 2 + 3: type/ช่วงค่าต้องถูก และห้ามยัดค่าจากคนละบริบท
    const checked = spec.check(args as Record<string, unknown>);
    if (!checked.ok) {
      errors.push(`calls[${i}] (${fn}): ${checked.error}`);
      return;
    }

    const label = cleanString(c.label, MAX_LABEL_LEN);
    calls.push({ fn: fn as PlanFnName, args: checked.args, ...(label ? { label } : {}) });
  });

  if (errors.length > 0) return { ok: false, kind: "invalid", errors };

  // ---- chart ----
  let chart: PlanChart | undefined;
  if (p.chart !== undefined && p.chart !== null) {
    const raw2 = p.chart;
    if (typeof raw2 !== "object" || Array.isArray(raw2)) {
      return { ok: false, kind: "invalid", errors: ["chart ต้องเป็น object"] };
    }
    const ch = raw2 as Record<string, unknown>;

    if (typeof ch.type !== "string" || !(CHART_TYPES as readonly string[]).includes(ch.type)) {
      errors.push(`chart.type "${String(ch.type)}" ไม่ใช่ชนิดที่รองรับ (${CHART_TYPES.join("/")})`);
    }
    if (typeof ch.series !== "string" || !(PLAN_FN_NAMES as readonly string[]).includes(ch.series)) {
      errors.push(`chart.series "${String(ch.series)}" ไม่อยู่ใน allowlist`);
    }
    if (errors.length > 0) return { ok: false, kind: "invalid", errors };

    const type = ch.type as ChartType;
    const series = ch.series as PlanFnName;

    // 🔴 ห้ามเทียบข้าม Logic (§16 / §4 ข้อ 5 "Track A/B/C ห้ามเฉลี่ยรวม")
    //    ทุก call ต้องเป็น engine เดียวกับ series — สเกลเดียวกัน ที่มาเดียวกัน
    const offenders = calls.filter((c) => c.fn !== series);
    if (offenders.length > 0) {
      const names = [...new Set(offenders.map((c) => c.fn))].join(", ");
      errors.push(
        `กราฟเทียบข้าม engine ไม่ได้ — chart.series คือ ${series} แต่แผนมี ${names} ปนอยู่ (คนละสเกล คนละที่มา)`
      );
    }

    // กราฟที่มีแกนตัวเลข ต้องเป็น engine ที่ให้ "คะแนน" จริง
    if (type !== "table" && !PLAN_ALLOWLIST[series].chartable) {
      errors.push(`${series} ไม่ได้คืนค่าเป็นคะแนน จึงทำกราฟ ${type} ไม่ได้ (ใช้ table แทน)`);
    }

    const min = MIN_POINTS[type];
    if (calls.length < min) {
      errors.push(`กราฟ ${type} ต้องมีอย่างน้อย ${min} จุดข้อมูล (ได้ ${calls.length})`);
    }

    if (errors.length > 0) return { ok: false, kind: "invalid", errors };

    chart = { type, series, label: cleanString(ch.label, MAX_LABEL_LEN) ?? "ผลเปรียบเทียบ" };
  }

  return { ok: true, plan: { calls, ...(chart ? { chart } : {}) } };
}

// ---------------------------------------------------------------------------
// Execute — รันแผนที่ผ่าน validate แล้วเท่านั้น
// ---------------------------------------------------------------------------

export interface CallResult {
  fn: PlanFnName;
  args: Record<string, unknown>;
  label: string;
  output: unknown;
  /** ข้อจำกัดที่ต้องแสดงให้ผู้ใช้เห็น ไม่ใช่ซ่อนไว้ */
  caveat?: string;
}

export type ChartData =
  | {
      type: "bar" | "radar" | "scale";
      label: string;
      series: PlanFnName;
      scale: [number, number];
      points: { label: string; value: number }[];
    }
  | { type: "table"; label: string; series: PlanFnName; rows: { label: string; output: unknown }[] };

export interface PlanExecution {
  results: CallResult[];
  chart?: ChartData;
  /** รวม caveat ที่ไม่ซ้ำกัน — ให้ชั้นเล่าเรื่องเอาไปแสดงทุกครั้ง */
  caveats: string[];
}

/** แผนนี้ต้องใช้โปรไฟล์ผู้ใช้ (วันเกิด) ไหม — ใช้ตัดสินว่าต้องถามให้ล็อกอิน/กรอกข้อมูลก่อน */
export function planRequiresProfile(plan: ChatPlan): boolean {
  return plan.calls.some((c) => PLAN_ALLOWLIST[c.fn].needsProfile === true);
}

// ctx ต้องมีเมื่อแผนมี fn ที่ needsProfile — caller (interpretPlannerOutput) กันไว้แล้ว
export function executePlan(plan: ChatPlan, ctx?: PlanProfileContext): PlanExecution {
  const results: CallResult[] = plan.calls.map((c) => {
    const spec = PLAN_ALLOWLIST[c.fn];
    return {
      fn: c.fn,
      args: c.args,
      label: c.label ?? spec.defaultLabel(c.args),
      output: spec.run(c.args, ctx),
      ...(spec.caveat ? { caveat: spec.caveat } : {}),
    };
  });

  const caveats = [...new Set(results.map((r) => r.caveat).filter((x): x is string => !!x))];

  let chart: ChartData | undefined;
  if (plan.chart) {
    const { type, label, series } = plan.chart;
    if (type === "table") {
      chart = { type, label, series, rows: results.map((r) => ({ label: r.label, output: r.output })) };
    } else {
      const spec = PLAN_ALLOWLIST[series].chartable!;
      // 🔴 ตัวเลขในกราฟมาจาก engine เท่านั้น — AI ตั้งได้แค่ป้ายชื่อกับชนิดกราฟ
      chart = {
        type,
        label,
        series,
        scale: spec.scale,
        points: results.map((r) => ({ label: r.label, value: spec.pick(r.output) })),
      };
    }
  }

  return { results, chart, caveats };
}

// ---------------------------------------------------------------------------
// คำอธิบาย allowlist สำหรับใส่ใน system prompt (เฟส 2 ตอนต่อ AI จริง)
// สร้างจาก PLAN_ALLOWLIST ตรงๆ — prompt จึง drift จาก allowlist จริงไม่ได้
// ---------------------------------------------------------------------------

export function describeAllowlistForPrompt(): string {
  return PLAN_FN_NAMES.map((fn) => {
    const s = PLAN_ALLOWLIST[fn];
    return `- ${fn} ${s.argsHint} — ${s.description}`;
  }).join("\n");
}

// ---------------------------------------------------------------------------
// เส้น hybrid ในโหมด context (2 ส.ค. 2569 — feedback ผู้ใช้: ถามเลขทะเบียน/บ้านบนหน้า
// โปรไฟล์แล้วได้คำตอบ "คำนวณให้ไม่ได้" ทั้งที่ engine มีครบ)
// ---------------------------------------------------------------------------

/**
 * คำถามที่น่าจะต้อง "คำนวณเลขใหม่" นอกเหนือจากผลบนหน้า → /api/chat โหมด context จะลอง
 * เส้น planner+engine ก่อน แล้วค่อยตกกลับมาตอบจาก context ถ้าวางแผนไม่ได้
 * เกณฑ์: มีตัวเลข (อารบิก/ไทย) หรือคำที่สื่อถึงเลขเฉพาะ — pure, ฿0, ไม่เรียก AI
 */
export function questionSuggestsComputation(q: string): boolean {
  if (/[0-9๐-๙]/.test(q)) return true;
  return /ทะเบียน|เบอร์|เลขบ้าน|บ้านเลขที่|หมายเลข|เลขที่/.test(q);
}
