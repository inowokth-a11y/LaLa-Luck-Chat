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

import { wuXingScore, THAI_LABEL_5, THAI_LABEL_4, type Element5 } from "../engine/element";
import {
  lookup2digit,
  lookup3digit,
  analyzePhoneNumber,
  artifactElement,
  digitSumReduce,
} from "../engine/numerology";

// ---------------------------------------------------------------------------
// ชนิดข้อมูลของ "แผน"
// ---------------------------------------------------------------------------

/** ฟังก์ชันที่เปิดให้ AI เรียกได้ในเฟส 1 — ทั้งหมดไม่ต้องใช้วันเกิด (§16) */
export const PLAN_FN_NAMES = [
  "lookup2digit",
  "lookup3digit",
  "analyzePhoneNumber",
  "artifactElement",
  "digitSumReduce",
  "wuXingScore",
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
  check: (args: Record<string, unknown>) => ArgCheck;
  run: (args: Record<string, unknown>) => unknown;
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
    caveat:
      "ตารางเลข 3 หลักมีแค่ 14 แถวตัวอย่าง เลขที่ไม่อยู่ในตารางจะวิเคราะห์รายหลักแทน (fallback ที่ออกแบบเอง ไม่ใช่สูตรต้นฉบับ)",
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
      "สูตรวิเคราะห์เบอร์โทรเป็นแนวทางที่ออกแบบเสริมเอง ยังไม่ verify กับเอกสารต้นฉบับ KRUTH",
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
    caveat:
      'ตาราง digit→element ของ Logic 2 มีแค่ 4 ธาตุไทย (ไฟ/ดิน/ลม/น้ำ) — ผลลัพธ์จึง**ไม่มีวันเป็น "ทอง"** เป็นข้อจำกัดของตารางต้นฉบับ ไม่ใช่บั๊ก',
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
};

// ---------------------------------------------------------------------------
// missingInputs — ชื่อ input ที่ระบบรู้จัก (ใช้เรนเดอร์คำถามกลับไปหาผู้ใช้)
// ---------------------------------------------------------------------------

export const MISSING_INPUT_LABELS: Record<string, string> = {
  birthDate: "วันเดือนปีเกิด (ค.ศ.)",
  birthTime: "เวลาเกิด",
  birthProvince: "จังหวัดที่เกิด",
  dayOfWeek: "วันในสัปดาห์ที่เกิด",
  gender: "เพศ",
  phone: "เบอร์โทรศัพท์",
  plateNumber: "เลขทะเบียน",
  targetNumber: "ตัวเลขที่อยากให้ดู",
  userElement: "ธาตุประจำตัว (ต้องคำนวณจากวันเกิดก่อน)",
};

/** ข้อความถามข้อมูลที่ขาด — ถามตรงๆ ดีกว่ารันแล้วเดา */
export function missingInputPrompt(missing: string[]): string {
  const items = missing.map((k) => `• ${MISSING_INPUT_LABELS[k] ?? k}`).join("\n");
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

export function executePlan(plan: ChatPlan): PlanExecution {
  const results: CallResult[] = plan.calls.map((c) => {
    const spec = PLAN_ALLOWLIST[c.fn];
    return {
      fn: c.fn,
      args: c.args,
      label: c.label ?? spec.defaultLabel(c.args),
      output: spec.run(c.args),
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
