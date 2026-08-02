// AI Chat แบบยืดหยุ่น — เฟส 2: ต่อ AI จริงเข้ากับ "แผน JSON" ของ plan.ts (CLAUDE.md §16)
//
// โครง 3 จังหวะ (ห้ามสลับ):
//   1. planner  (Claude Haiku, role "router")  → คืน JSON "แผน"        ~฿0.05
//   2. server   → validateChatPlan → executePlan (ตัวเลขจริงจาก engine)  ฿0
//   3. narrator (gpt-5.5, role "ai2")           → เล่าจากตัวเลขจริง       ~฿0.30
//
// 🔴 เส้นแบ่งที่ห้ามข้าม: AI เลือก "ว่าจะเรียกฟังก์ชันไหนด้วยค่าอะไร" เท่านั้น
//    ตัวเลขทุกตัวมาจาก engine — planner ไม่คำนวณ, narrator ไม่แต่งเลข (จุดขาย §0)
//
// ไฟล์นี้เรียก AI ได้ (ต่างจาก plan.ts ที่ต้องบริสุทธิ์) แต่แยกส่วน "ตีความผลของ planner"
// ออกเป็นฟังก์ชัน pure เพื่อให้เทสต์ตรรกะได้โดยไม่ต้องยิง AI จริง

import { generate, type GenerateResult } from "@/lib/ai";
import { LALA_PERSONA } from "@/lib/ai/persona";
import { calculateElementSeed } from "@/lib/engine/element";
import { thaiDayOfWeek } from "@/lib/engine/card-id";
import {
  validateChatPlan,
  executePlan,
  planRequiresProfile,
  describeAllowlistForPrompt,
  missingInputPrompt,
  MAX_CALLS_PER_PLAN,
  type PlanExecution,
  type ChatPlan,
  type PlanProfileContext,
} from "./plan";

// ---------------------------------------------------------------------------
// สร้างบริบทโปรไฟล์ (ธาตุประจำตัว) จากวันเกิดที่บันทึกไว้ — ใช้กับ fn "ของฉัน"
// pure: รับวันเกิด (ค.ศ. 'YYYY-MM-DD') → คำนวณ ElementSeed ครั้งเดียว
// 🔴 AI ไม่เคยเห็นวันเกิด — server เรียกตัวนี้แล้วส่ง context เข้า executePlan เท่านั้น
// ---------------------------------------------------------------------------

const ZODIAC_ANIMALS = [
  "ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง",
  "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน",
];
const zodiacAnimalFromYear = (yearAd: number) => ZODIAC_ANIMALS[(((yearAd - 2020) % 12) + 12) % 12];

export function buildProfileContext(birthDate: string | null | undefined): PlanProfileContext | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const year = Number(birthDate.slice(0, 4));
  const month = Number(birthDate.slice(5, 7));
  const day = Number(birthDate.slice(8, 10));
  // กัน พ.ศ./ปีเสีย (บทเรียน data-quality §5.1) — ข้อมูลเสียถือว่าไม่มีโปรไฟล์
  const nowYear = new Date().getUTCFullYear();
  if (year < 1900 || year > nowYear || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const seed = calculateElementSeed({
    day_of_week: thaiDayOfWeek(birthDate),
    birth_month: month,
    birth_year_ad: year,
    birth_day: day,
    zodiac_year_animal: zodiacAnimalFromYear(year),
  });
  // ธาตุ 4-bucket (Fire/Earth/Wood/Water) เป็นสับเซ็ตของ Element5 อยู่แล้ว — ไม่มีทางเป็น Metal
  return { dominant: seed.dominant, missing: seed.missing, seed };
}

// ---------------------------------------------------------------------------
// System prompts — สร้างคำอธิบายฟังก์ชันจาก allowlist จริง (drift ไม่ได้)
// ---------------------------------------------------------------------------

export function buildPlannerSystem(): string {
  return `คุณคือ "ตัววางแผน" ของ KRUTH ELEMENT หน้าที่เดียวของคุณคือ **แปลงคำถามผู้ใช้เป็นแผน JSON**
เพื่อสั่งให้ระบบเรียกฟังก์ชันคำนวณจริง — **คุณห้ามคำนวณเอง ห้ามเดาตัวเลข ห้ามตอบเป็นภาษาคน**

ตอบกลับเป็น JSON object เดียวเท่านั้น (ไม่มีข้อความอื่นนอก JSON) รูปแบบ:
{
  "calls": [ { "fn": "ชื่อฟังก์ชัน", "args": { ... }, "label": "ป้ายสั้นๆ (ไม่บังคับ)" } ],
  "chart": { "type": "bar|radar|table|scale", "label": "หัวข้อกราฟ", "series": "ชื่อฟังก์ชัน" },
  "missingInputs": [ "ชื่อข้อมูลที่ยังขาด" ]
}

ฟังก์ชันที่เรียกได้ (มีเท่านี้ ห้ามคิดชื่ออื่น):
${describeAllowlistForPrompt()}

กฎเหล็ก:
1. ใช้ได้เฉพาะ fn ในรายการข้างบน — คิดชื่อฟังก์ชันเองไม่ได้
2. args ต้องตรงชนิด: เลขเป็นเลข (ไม่ใส่เครื่องหมายคำพูด), ธาตุใช้ไทย (ไฟ/ดิน/ลม/น้ำ/ทอง) หรืออังกฤษ
3. ค่าต้องอยู่ในบริบทถูกต้อง: lookup2digit รับ 0-99, lookup3digit รับ 0-999
   — **ห้ามเอาปีเกิด/ปี พ.ศ. ไปใส่ตารางเลขการ์ด**
4. คำถามเกี่ยวกับ **ธาตุประจำตัวของผู้ใช้เอง** (ธาตุฉัน/ดวงฉัน/ฉันธาตุอะไร) → ใช้ myElementSeed
   คำถามเทียบธาตุตัวเองกับธาตุอื่น (ธาตุฉันเข้ากับ [ธาตุ] ไหม) → ใช้ myWuXingVsElement
   คำถามว่า **เลขชุดหนึ่งส่งผลต่อตัวผู้ใช้ยังไง** (ทะเบียนรถ/บ้านเลขที่/เลขของฉัน) → ใช้ myNumberScore
   ต่อเลขละ 1 call · ถ้ามีหลายเลขให้ใส่ chart {"type":"bar","series":"myNumberScore"} เทียบคะแนนกัน
   🔴 **ห้ามใส่ "birthDate"/วันเกิด ใน missingInputs เด็ดขาด** — ระบบมีวันเกิดของผู้ใช้อยู่แล้ว
   ถ้าผู้ใช้ยังไม่ได้ให้ ระบบจะจัดการเอง · หน้าที่คุณคือแค่ **เลือก myElementSeed/myWuXingVsElement**
   (args ของ myElementSeed = {} เสมอ ห้ามใส่วันเกิด)
   ใช้ missingInputs เฉพาะข้อมูลที่ "ไม่ใช่วันเกิด" และไม่มีฟังก์ชันรองรับจริงๆ เท่านั้น
5. ใส่ "chart" เมื่อผู้ใช้ถามเชิงเปรียบเทียบหลายรายการเท่านั้น และทุก call ต้องเป็น fn เดียวกับ series
   — เทียบข้ามฟังก์ชันในกราฟเดียวไม่ได้ · **ถ้าแผนมีหลาย fn ต่างชนิด ห้ามใส่ chart เลย (ละทิ้งไป)**
6. จำนวน calls ไม่เกิน ${MAX_CALLS_PER_PLAN}
7. ถ้าคำถามไม่เกี่ยวกับสิ่งที่ฟังก์ชันเหล่านี้ทำได้เลย → คืน {"calls": []} (ระบบจะจัดการเอง)`;
}

export function buildNarratorSystem(): string {
  return `${LALA_PERSONA}

ระบบได้ **คำนวณผลจริงด้วย engine มาให้แล้ว** หน้าที่คุณคือเรียบเรียงผลนั้นให้ผู้ใช้เข้าใจ มีสีสัน

กฎเหล็ก (ห้ามฝ่าฝืน):
1. ใช้ได้เฉพาะตัวเลข/ธาตุ/ความหมายใน <ผลการคำนวณ> เท่านั้น — **ห้ามแต่งตัวเลขหรือธาตุขึ้นเอง**
   ถ้า engine ได้ 78 ห้ามพูด 73 เด็ดขาด (คนเชื่อกราฟ/ตัวเลขมากกว่าคำพูด การแต่งเลขคือหลอกลวง)
2. ถ้ามี "ข้อควรระวัง" (caveat) แนบมา **ต้องบอกผู้ใช้เสมอ** ไม่กลบไว้ — แต่เล่าใหม่สั้นๆ
   เป็นคำที่คนทั่วไปเข้าใจ ไม่ต้องยกข้อความเทคนิคมาทั้งดุ้น
3. ถ้ามีการเปรียบเทียบหลายรายการ ให้ชี้ว่าตัวไหนเด่น/ควรระวัง โดยอิงตัวเลขที่ให้มา
4. ห้ามฟันธงชะตาชีวิต ห้ามทำนายสุขภาพ/การเงิน/ความตายแบบชี้ขาด ห้ามให้คำแนะนำทางการแพทย์
5. ตอบกระชับ 2-5 ประโยค เข้าเรื่องเลย ไม่ต้องทวนคำถาม ไม่ต้องอธิบายว่าคำนวณยังไง
6. **พูดภาษาคนทั่วไปเท่านั้น** — ห้ามใช้ศัพท์ภายในระบบเด็ดขาด: "Logic", "engine", "ตาราง",
   "digit→element", "fallback", "verify", "บั๊ก", ชื่อฟังก์ชันภาษาอังกฤษ ฯลฯ
   ผู้ใช้คือคนดูดวง ไม่ใช่โปรแกรมเมอร์`;
}

// ---------------------------------------------------------------------------
// ตีความผลของ planner — pure (เทสต์ได้โดยไม่ต้องยิง AI)
// ---------------------------------------------------------------------------

export type PlanInterpretation =
  | { status: "answered"; plan: ChatPlan; execution: PlanExecution }
  | { status: "needs_input"; missingInputs: string[]; message: string }
  | { status: "unclear"; errors: string[] };

/**
 * แยก JSON ของ "แผน" ออกจากข้อความ planner
 * ⚠️ ไม่ใช้ extractJson ของ lib/ai — ตัวนั้นหยิบ "{" ตัวท้ายสุด (เหมาะกับ router ที่ JSON
 *    ไม่ซ้อน) แต่แผนมี object ซ้อน (chart) จะโดนหยิบผิดเป็น chart แทนทั้งแผน
 *    ตัวนี้เอา object ก้อน **นอกสุด/แรกสุด** ซึ่งคือตัวแผนจริง
 */
export function parsePlannerJson(raw: string): unknown | null {
  const t = raw.trim();
  // 1) ทั้งก้อนเป็น JSON ล้วน (กรณีปกติ เพราะสั่งให้ตอบ JSON อย่างเดียว)
  try {
    return JSON.parse(t);
  } catch {
    /* ลองวิธีถัดไป */
  }
  // 2) มี ```json fence — เอาเนื้อในทั้งก้อน
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* ลองวิธีถัดไป */
    }
  }
  // 3) มี prose ปนหน้า/หลัง — จับ object ก้อนแรกที่วงเล็บสมดุล (นอกสุด)
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(t.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** ข้อความชวนล็อกอิน/กรอกข้อมูล เมื่อแผนต้องใช้ธาตุประจำตัวแต่ยังไม่มีโปรไฟล์ */
export const NEEDS_PROFILE_MESSAGE =
  "คำถามนี้ต้องใช้ธาตุประจำตัวของคุณ ซึ่งคำนวณจากวันเกิด 🙏\n\n" +
  "กรุณาเข้าสู่ระบบแล้วกรอกข้อมูลพื้นฐาน (วันเกิด) ก่อน แล้วลาลาจะคำนวณให้ได้เลยค่ะ";

/**
 * รับข้อความดิบจาก planner → JSON → validate → (ถ้าผ่าน) execute
 * profileCtx = โปรไฟล์ผู้ใช้ (ธาตุประจำตัว) ที่ server เติม — null ถ้าไม่ล็อกอิน/ยังไม่กรอก
 * แยกจาก runPlanChat เพื่อเทสต์ได้ทุกสาขาโดยไม่ต้องมี AI จริง
 */
export function interpretPlannerOutput(
  rawText: string,
  profileCtx?: PlanProfileContext | null
): PlanInterpretation {
  const json = parsePlannerJson(rawText);
  if (json === null) {
    return { status: "unclear", errors: ["planner ไม่ได้คืน JSON ที่อ่านได้"] };
  }

  let v = validateChatPlan(json);
  if (!v.ok && v.kind === "needs_input") {
    return { status: "needs_input", missingInputs: v.missingInputs, message: missingInputPrompt(v.missingInputs) };
  }
  // แผนผิดเฉพาะส่วนกราฟ (เช่น series ปนหลาย fn) → ตัดกราฟทิ้งแล้ว validate ใหม่
  // ไม่ใช่การหย่อนกฎ (§16 ห้าม): กราฟผิดกฎยังไม่มีวันถูกวาด — แค่ไม่ล้มผลคำนวณทั้งแผนไปด้วย
  if (!v.ok && typeof json === "object" && json !== null && "chart" in json) {
    const retry = validateChatPlan({ ...(json as Record<string, unknown>), chart: undefined });
    if (retry.ok) v = retry;
  }
  if (!v.ok) {
    return { status: "unclear", errors: v.errors };
  }

  // แผนต้องใช้ธาตุประจำตัว แต่ยังไม่มีโปรไฟล์ → ถามให้ล็อกอิน/กรอกข้อมูล ห้ามเดา
  if (planRequiresProfile(v.plan) && !profileCtx) {
    return { status: "needs_input", missingInputs: ["birthProfile"], message: NEEDS_PROFILE_MESSAGE };
  }

  // ตัวเลขทุกตัวเกิดตรงนี้ — จาก engine ล้วน planner ไม่ได้แตะ (profileCtx เติมวันเกิดให้ fn "ของฉัน")
  return { status: "answered", plan: v.plan, execution: executePlan(v.plan, profileCtx ?? undefined) };
}

/** สร้าง input ให้ narrator จากผลจริง — คุมสิ่งที่ AI เห็นให้แคบที่สุด */
export function buildNarratorInput(question: string, execution: PlanExecution): string {
  // ส่งเฉพาะสิ่งจำเป็น: label/fn/args/output + caveat — ไม่ปล่อย field ภายในรก
  const rows = execution.results.map((r) => ({
    รายการ: r.label,
    ฟังก์ชัน: r.fn,
    ค่าที่ใช้: r.args,
    ผลลัพธ์: r.output,
    ...(r.caveat ? { ข้อควรระวัง: r.caveat } : {}),
  }));

  const chartNote = execution.chart
    ? `\nมีกราฟเปรียบเทียบชนิด "${execution.chart.type}" หัวข้อ "${execution.chart.label}" — ช่วยชี้ว่ารายการไหนเด่น/ควรระวังจากตัวเลขที่ให้มา`
    : "";

  const caveatNote = execution.caveats.length
    ? `\n\nข้อควรระวังที่ต้องบอกผู้ใช้ (ห้ามข้าม):\n${execution.caveats.map((c) => `- ${c}`).join("\n")}`
    : "";

  return `คำถามของผู้ใช้: ${question}

<ผลการคำนวณ>
${JSON.stringify(rows, null, 1)}
</ผลการคำนวณ>${chartNote}${caveatNote}`;
}

// ---------------------------------------------------------------------------
// runPlanChat — orchestration เต็ม (เรียก AI 2 จังหวะ)
// ---------------------------------------------------------------------------

export interface PlanChatAnswered {
  status: "answered";
  reply: string;
  results: PlanExecution["results"];
  chart: PlanExecution["chart"];
  caveats: string[];
  plannerVia: string;
  narratorVia: string;
}
export interface PlanChatNeedsInput {
  status: "needs_input";
  message: string;
  missingInputs: string[];
}
export interface PlanChatUnclear {
  status: "unclear";
  message: string;
}

export type PlanChatResult = PlanChatAnswered | PlanChatNeedsInput | PlanChatUnclear;

const via = (r: GenerateResult) => `${r.provider}/${r.model}${r.usedFallback ? " (สำรอง)" : ""}`;

// 🔴 คำถามที่ยังไม่มี engine รองรับ — สื่อว่า "กำลังพัฒนา" (อบอุ่น + ตั้งความคาดหวัง) ไม่ใช่แค่ปฏิเสธ
//    (คำถามพวกนี้ถูกเก็บไว้ที่ chat_question_log → แอดมินดูแล้วจัดลำดับสร้าง engine ต่อ §16)
const UNCLEAR_MESSAGE =
  "ตอนนี้ลาลายังไม่มีโหมดสำหรับคำทำนายแบบนี้ แต่ทีมงานกำลังพัฒนาเพิ่มอยู่นะคะ 🙏 " +
  "ระหว่างนี้ลองถามเรื่องที่ลาลาคำนวณได้: เลขการ์ด (00-99) · เลขทะเบียน/เบอร์โทร · ธาตุประจำตัว · เทียบธาตุของสิ่งของ ดูก่อนได้ค่ะ";

export async function runPlanChat(
  question: string,
  profileCtx?: PlanProfileContext | null,
  /** บล็อกความจำแม่หมอ (เฟส 3) — แนบให้ narrator เท่านั้น (planner ไม่ต้องใช้) */
  memoryBlock?: string | null,
  /**
   * ผลที่แสดงบนหน้าจอผู้ใช้ (JSON string) — เส้น hybrid จากโหมด context (2 ส.ค. 2569):
   * narrator เห็นทั้งผลคำนวณใหม่จาก engine และผลบนหน้า จึงเชื่อมโยงสองอย่างได้
   * (planner ไม่เห็น — หน้าที่มันคือแปลงคำถามเป็นแผน ไม่เกี่ยวกับผลบนจอ)
   */
  pageContext?: string | null
): Promise<PlanChatResult> {
  // ---- จังหวะ 1: planner ----
  const planner = await generate({
    role: "router", // Claude Haiku — ถูกและพอสำหรับงานวางแผน JSON
    channel: "web",
    logicId: 0,
    system: buildPlannerSystem(),
    input: question,
    maxTokens: 500, // แค่ JSON สั้นๆ
  });

  const interp = interpretPlannerOutput(planner.text, profileCtx);

  if (interp.status === "needs_input") {
    return { status: "needs_input", message: interp.message, missingInputs: interp.missingInputs };
  }
  if (interp.status === "unclear") {
    console.warn("[plan-chat] แผนใช้ไม่ได้:", interp.errors);
    return { status: "unclear", message: UNCLEAR_MESSAGE };
  }

  // ---- จังหวะ 3: narrator (จังหวะ 2 = execute เกิดใน interpret แล้ว) ----
  const pageBlock = pageContext
    ? `<ผลบนหน้าจอของผู้ใช้>\n${pageContext}\n</ผลบนหน้าจอของผู้ใช้>\n(เชื่อมโยงผลคำนวณใหม่กับผลบนหน้าจอได้ แต่ใช้ได้เฉพาะข้อมูลจากสองแหล่งนี้ ห้ามแต่งเพิ่ม)\n\n`
    : "";
  const narrator = await generate({
    role: "ai2", // gpt-5.5 — สีสันดีกว่า
    channel: "web",
    logicId: 0,
    system: buildNarratorSystem(),
    input: (memoryBlock ? `${memoryBlock}\n\n` : "") + pageBlock + buildNarratorInput(question, interp.execution),
    // 1100 ไม่ใช่ 700 — gpt-5.5 ใช้ reasoning token ร่วมโควตานี้ input ยาว (hybrid มี pageContext)
    // เคยกินจนเนื้อความว่าง (2 ส.ค. 2569) · เผื่อแล้ว ตัวว่างยัง throw ที่ provider ให้ fallback ต่อ
    maxTokens: 1100,
  });

  return {
    status: "answered",
    reply: narrator.text,
    results: interp.execution.results,
    chart: interp.execution.chart,
    caveats: interp.execution.caveats,
    plannerVia: via(planner),
    narratorVia: via(narrator),
  };
}

// หมายเหตุ (1 ส.ค. 2569): โควตา plan-chat แบบ cookie ถูกถอดออกแล้ว — คำถามแชททุกโหมด
// ใช้ "ถังคำถามรวม" ที่ lib/chat/questions.ts (นับที่ DB ต้องล็อกอิน) ตามที่ผู้ใช้ตัดสิน
