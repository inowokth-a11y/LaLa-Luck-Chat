// AI Chat ประจำฟังก์ชัน — ถามต่อจากผลที่หน้าจอคำนวณให้แล้ว
//
// ⚠️ ลำดับสำคัญ ห้ามสลับ (CLAUDE.md §6):
//   1. Safety Gate — รับ free-text จึงต้องตรวจก่อน AI ทุกตัว ไม่มีข้อยกเว้น
//      **ตรวจก่อนหักโควตาด้วย** — คนที่ส่งสัญญาณวิกฤตต้องไม่ถูกคิดโควตา
//   2. โควตา      — ช่วงทดลองให้ฟังก์ชันละ 2 คำถาม
//   3. AI         — ตอบโดยอิง context ที่หน้าจอส่งมาเท่านั้น ห้ามแต่งข้อเท็จจริงใหม่

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safetyGate } from "@/lib/engine/element";
import { generate } from "@/lib/ai";
import {
  parseQuota,
  serializeQuota,
  checkQuota,
  consumeQuota,
  quotaExhaustedMessage,
  CHAT_LOGIC_NAMES,
} from "@/lib/chat/quota";
import {
  runPlanChat,
  buildProfileContext,
  parsePlanUsed,
  checkPlanQuota,
  planQuotaExhaustedMessage,
} from "@/lib/chat/plan-run";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import type { PlanProfileContext } from "@/lib/chat/plan";

export const runtime = "nodejs";

const QUOTA_COOKIE = "kruth_chat_quota";
/** cookie แยกสำหรับ plan-chat (โหมดวิเคราะห์อิสระ) — ไม่ปนกับโควตาราย Logic */
const PLAN_QUOTA_COOKIE = "kruth_plan_quota";
/** cookie อยู่ 30 วัน — นานพอสำหรับช่วงทดลอง ไม่ยาวจนลืมว่าเคยถาม */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
/** จำกัดความยาวคำถาม — กันคนวางข้อความยาวมาสูบ token */
const MAX_QUESTION_LEN = 500;

const CHAT_SYSTEM = `คุณคือ "อาจารย์ลาลา" นักพยากรณ์ของ KRUTH ELEMENT พูดไทย น้ำเสียงอบอุ่น เป็นมิตร ไม่ตัดสิน
ตอนนี้ผู้ใช้กำลังดูผลการคำนวณอยู่บนหน้าจอ และถามคำถามต่อยอดจากผลนั้น

กฎเหล็ก (ห้ามฝ่าฝืน):
1. ใช้ได้เฉพาะข้อมูลใน <ผลที่ผู้ใช้เห็นอยู่> เท่านั้น — ห้ามแต่งธาตุ ตัวเลข ราศี หรือความหมายขึ้นเอง
2. ถ้าคำถามต้องใช้ข้อมูลที่ไม่มีใน context ให้บอกตรงๆ ว่ายังไม่มีข้อมูลนั้น แล้วแนะนำว่าต้องกรอกอะไรเพิ่ม
   **ห้ามเดาแทน** การบอกว่าไม่รู้ดีกว่าการแต่งให้ดูน่าเชื่อ
3. ห้ามฟันธงชะตาชีวิต ห้ามทำนายเรื่องสุขภาพ/การเงิน/ความตายแบบชี้ขาด
4. ห้ามให้คำแนะนำทางการแพทย์หรือจิตเวช
5. ตอบสั้น 2-4 ประโยค เข้าเรื่องเลย ไม่ต้องทวนคำถาม
6. ถ้าผู้ใช้ถามเรื่องที่ไม่เกี่ยวกับผลบนหน้าจอเลย ให้ตอบสั้นๆ แล้วชวนกลับมาที่เรื่องดวง`;

interface ChatBody {
  /** "context" (ค่าเริ่มต้น) = ถามต่อจากผลบนหน้าจอ · "plan" = วิเคราะห์อิสระ (§16) */
  mode?: "context" | "plan";
  logicId?: number;
  question?: string;
  /** ผลที่หน้าจอคำนวณได้ — ส่งมาเพื่อให้ AI ตอบโดยอิงของจริง ไม่ใช่เดา */
  context?: unknown;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    const logicId = Number(body.logicId);
    const question = (body.question ?? "").trim();

    if (!question) {
      return NextResponse.json({ error: "กรุณาพิมพ์คำถาม" }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_LEN) {
      return NextResponse.json(
        { error: `คำถามยาวเกินไป (${question.length}/${MAX_QUESTION_LEN} ตัวอักษร)` },
        { status: 400 }
      );
    }

    // ---- 1. SAFETY GATE — ก่อน AI และ **ก่อนหักโควตา** ----
    // คนที่ส่งสัญญาณวิกฤตไม่ควรถูกคิดโควตา และต้องไม่ถูกพ่วงการตลาดใดๆ
    const gate = safetyGate(question);
    if (gate) {
      return NextResponse.json({
        intercepted: true,
        message: gate.crisis_resource_message,
      });
    }

    // ---- เส้นทาง "แผน" (โหมดวิเคราะห์อิสระ §16) — คู่กับเส้นทาง context เดิม ----
    if (body.mode === "plan") {
      return await handlePlanMode(question);
    }

    // ---- 2. โควตา ----
    const jar = await cookies();
    const state = parseQuota(jar.get(QUOTA_COOKIE)?.value);
    const q = checkQuota(state, logicId);

    if (!q.allowed) {
      return NextResponse.json(
        {
          quotaExceeded: true,
          message:
            q.reason === "logic_not_enabled"
              ? "ฟังก์ชันนี้ยังไม่เปิดให้ถามคำถามค่ะ"
              : quotaExhaustedMessage(logicId),
          used: q.used,
          remaining: 0,
          limit: q.limit,
        },
        { status: 429 }
      );
    }

    // ---- 3. AI ----
    const logicName = CHAT_LOGIC_NAMES[logicId] ?? `Logic ${logicId}`;
    const contextJson = JSON.stringify(body.context ?? {}, null, 1).slice(0, 6000);

    const ai = await generate({
      role: "ai2",
      logicId,
      channel: "web",
      system: CHAT_SYSTEM,
      input: `ฟังก์ชันที่ผู้ใช้กำลังดู: ${logicName}

<ผลที่ผู้ใช้เห็นอยู่>
${contextJson}
</ผลที่ผู้ใช้เห็นอยู่>

คำถามของผู้ใช้: ${question}`,
      maxTokens: 700, // ตอบสั้น 2-4 ประโยค — กันร่ายยาวเสียเงินฟรี
    });

    // หักโควตาหลัง AI ตอบสำเร็จเท่านั้น — AI ล่มแล้วยังเสียสิทธิ์ถือว่าไม่ยุติธรรม
    const next = consumeQuota(state, logicId);
    const after = checkQuota(next, logicId);

    const res = NextResponse.json({
      reply: ai.text,
      via: `${ai.provider}/${ai.model}${ai.usedFallback ? " (สำรอง)" : ""}`,
      used: after.used,
      remaining: after.remaining,
      limit: after.limit,
    });
    res.cookies.set(QUOTA_COOKIE, serializeQuota(next), {
      httpOnly: true, // กัน JS ในหน้าเว็บแก้ตัวเลขตรงๆ
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err) {
    console.error("[chat] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

/**
 * โหมด "แผน" — AI เลือกฟังก์ชัน → engine คำนวณ → AI เล่า (CLAUDE.md §16)
 * Safety Gate ถูกตรวจไปแล้วใน POST ก่อนเข้าฟังก์ชันนี้
 */
async function handlePlanMode(question: string): Promise<NextResponse> {
  const jar = await cookies();
  const used = parsePlanUsed(jar.get(PLAN_QUOTA_COOKIE)?.value);
  const q = checkPlanQuota(used);

  if (!q.allowed) {
    return NextResponse.json(
      { quotaExceeded: true, message: planQuotaExhaustedMessage(), used: q.used, remaining: 0, limit: q.limit },
      { status: 429 }
    );
  }

  // โปรไฟล์ผู้ใช้ (ธาตุประจำตัว) — อ่านด้วย session ผู้ใช้ (RLS own-row) ไม่ใช่ service role
  // 🔴 วันเกิดไม่เคยถูกส่งให้ AI — สร้าง context ที่นี่แล้วส่งเข้า runPlanChat เท่านั้น
  let profileCtx: PlanProfileContext | null = null;
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: prof } = await supabase
        .from("user_profiles_e")
        .select("birth_date")
        .eq("auth_uid", data.user.id)
        .maybeSingle();
      profileCtx = buildProfileContext(prof?.birth_date);
    }
  } catch (e) {
    console.warn("[chat/plan] อ่านโปรไฟล์ไม่สำเร็จ — ทำงานต่อแบบไม่มีธาตุประจำตัว", e);
  }

  const result = await runPlanChat(question, profileCtx);

  // ถามข้อมูลเพิ่ม / คำถามนอกขอบเขต → ไม่หักโควตา (ยังไม่ได้คำตอบจริง)
  if (result.status === "needs_input") {
    return NextResponse.json({ needsInput: true, message: result.message, missingInputs: result.missingInputs });
  }
  if (result.status === "unclear") {
    return NextResponse.json({ unclear: true, message: result.message });
  }

  // หักโควตาเฉพาะเมื่อได้คำตอบจริงเท่านั้น
  const nextUsed = used + 1;
  const after = checkPlanQuota(nextUsed);
  const res = NextResponse.json({
    reply: result.reply,
    results: result.results,
    chart: result.chart,
    caveats: result.caveats,
    via: { planner: result.plannerVia, narrator: result.narratorVia },
    used: after.used,
    remaining: after.remaining,
    limit: after.limit,
  });
  res.cookies.set(PLAN_QUOTA_COOKIE, String(nextUsed), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}

/** GET = ดูโควตาคงเหลือของทุกฟังก์ชัน (ไม่เสียค่า AI) — หน้าเว็บใช้ตอนโหลด */
export async function GET() {
  const jar = await cookies();
  const state = parseQuota(jar.get(QUOTA_COOKIE)?.value);
  const out: Record<number, { used: number; remaining: number; limit: number }> = {};
  for (const id of Object.keys(CHAT_LOGIC_NAMES).map(Number)) {
    const q = checkQuota(state, id);
    out[id] = { used: q.used, remaining: q.remaining, limit: q.limit };
  }
  return NextResponse.json({ quota: out });
}
