// AI Chat — คำถามถึง "อาจารย์ลาลา ลักกี้" (ทั้งถามต่อจากผลบนจอ และวิเคราะห์อิสระ §16)
//
// ⚠️ ลำดับสำคัญ ห้ามสลับ (CLAUDE.md §6):
//   1. Safety Gate — รับ free-text ต้องตรวจก่อน AI ทุกตัว **และก่อน gate ล็อกอิน/โควตา**
//      (คนส่งสัญญาณวิกฤตต้องได้ข้อความช่วยเหลือเสมอ ไม่ติดล็อกอิน ไม่ถูกคิดโควตา)
//   2. เลขเด็ด/หวย — นโยบายไม่ทำนาย (ก่อน AI ไม่คิดเงิน)
//   3. gate ล็อกอิน + ถังคำถามรวม (1 ส.ค. 2569 — แทนโควตาราย Logic/cookie เดิมทั้งหมด)
//   4. AI → หักหลังตอบสำเร็จเท่านั้น (ฟรี → bump ถัง · หมดฟรี → เครดิต 1/คำถาม)

import { NextResponse } from "next/server";
import { safetyGate } from "@/lib/engine/element";
import { generate } from "@/lib/ai";
import { CHAT_LOGIC_NAMES, CHAT_ENABLED_LOGICS } from "@/lib/chat/quota";
import {
  FREE_QUESTIONS_TOTAL,
  QUESTIONS_BUCKET,
  checkQuestionPool,
  questionPoolExhaustedMessage,
  questionNeedsLoginMessage,
} from "@/lib/chat/questions";
import { runPlanChat, buildProfileContext } from "@/lib/chat/plan-run";
import {
  questionSuggestsComputation,
  CONSULT_TOPIC_KEY,
  CONSULT_TOPIC_SUGGESTIONS,
  WORK_PATTERN_KEY,
  WORK_PATTERN_SUGGESTIONS,
} from "@/lib/chat/plan";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { getDbUsageBonus, bumpDbUsage } from "@/lib/chat/usage-db";
import { decideCharge, creditCost, chargeDeniedMessage } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { LALA_PERSONA } from "@/lib/ai/persona";
import { FIGURE_TONE_PROMPT } from "@/lib/share";
import { lotteryIntercept } from "@/lib/chat/lottery";
import { chatRedirectIntercept } from "@/lib/chat/redirects";
import { logQuestion } from "@/lib/chat/question-log";
import { getMemoryBlock, rememberEvent } from "@/lib/memory";

export const runtime = "nodejs";

/** จำกัดความยาวคำถาม — กันคนวางข้อความยาวมาสูบ token */
const MAX_QUESTION_LEN = 500;

const CHAT_SYSTEM = `${LALA_PERSONA}

ตอนนี้ผู้ใช้กำลังดูผลการคำนวณอยู่บนหน้าจอ และถามคำถามต่อยอดจากผลนั้น

กฎเหล็ก (ห้ามฝ่าฝืน):
1. ใช้ได้เฉพาะข้อมูลใน <ผลที่ผู้ใช้เห็นอยู่> เท่านั้น — ห้ามแต่งธาตุ ตัวเลข ราศี หรือความหมายขึ้นเอง
2. ถ้าคำถามต้องใช้ข้อมูลที่ไม่มีใน context ให้บอกตรงๆ ว่ายังไม่มีข้อมูลนั้น แล้วแนะนำว่าต้องกรอกอะไรเพิ่ม
   **ห้ามเดาแทน** การบอกว่าไม่รู้ดีกว่าการแต่งให้ดูน่าเชื่อ
3. ห้ามฟันธงชะตาชีวิต ห้ามทำนายเรื่องสุขภาพ/การเงิน/ความตายแบบชี้ขาด
4. ห้ามให้คำแนะนำทางการแพทย์หรือจิตเวช
5. ตอบสั้น 2-4 ประโยค เข้าเรื่องเลย ไม่ต้องทวนคำถาม
6. ถ้าผู้ใช้ถามเรื่องที่ไม่เกี่ยวกับผลบนหน้าจอเลย ให้ตอบสั้นๆ แล้วชวนกลับมาที่เรื่องดวง

${FIGURE_TONE_PROMPT}`;

interface ChatBody {
  /** "context" (ค่าเริ่มต้น) = ถามต่อจากผลบนหน้าจอ · "plan" = วิเคราะห์อิสระ (§16) */
  mode?: "context" | "plan";
  logicId?: number;
  question?: string;
  /** ผลที่หน้าจอคำนวณได้ — ส่งมาเพื่อให้ AI ตอบโดยอิงของจริง ไม่ใช่เดา */
  context?: unknown;
}

interface PoolState {
  userId: string;
  used: number;
  bonus: number;
  balance: number;
  charge: ReturnType<typeof decideCharge>;
}

/** อ่านสถานะถังคำถาม + เครดิต แล้วตัดสินว่า request นี้ ฟรี/เครดิต/ปฏิเสธ */
async function resolvePool(userId: string): Promise<PoolState> {
  const { used, bonus } = await getDbUsageBonus(userId, QUESTIONS_BUCKET);
  const pool = checkQuestionPool(used, bonus);
  const balance = await getCreditBalance(userId);
  const charge = decideCharge({
    freeRemaining: pool.remaining,
    loggedIn: true,
    balance,
    cost: creditCost("chat_question"),
  });
  return { userId, used, bonus, balance, charge };
}

/** หักหลังตอบสำเร็จ — คืนตัวเลขล่าสุดสำหรับแสดงผล (ถังคำถาม + เครดิต) */
async function settleCharge(p: PoolState): Promise<{ questions: ReturnType<typeof checkQuestionPool>; credits: number | null; paidWithCredits: boolean }> {
  if (p.charge.mode === "credits") {
    const spent = await spendCredits(p.userId, p.charge.cost, "chat_question", QUESTIONS_BUCKET);
    if (!spent.ok) console.warn("[chat] หักเครดิตไม่สำเร็จหลังตอบแล้ว (race/พัง)", spent.reason);
    return {
      questions: checkQuestionPool(p.used, p.bonus),
      credits: spent.ok ? spent.balance : p.balance,
      paidWithCredits: true,
    };
  }
  const bumped = await bumpDbUsage(p.userId, QUESTIONS_BUCKET);
  return {
    questions: checkQuestionPool(bumped ?? p.used + 1, p.bonus),
    credits: p.balance,
    paidWithCredits: false,
  };
}

const deniedResponse = (p: PoolState) =>
  NextResponse.json(
    {
      quotaExceeded: true,
      message: `${questionPoolExhaustedMessage()}\n\n${p.charge.mode === "denied" ? chargeDeniedMessage(p.charge) : ""}`.trim(),
      credits: p.balance,
      creditCost: creditCost("chat_question"),
      topupUrl: "/account", // UI ใช้ทำปุ่ม "เติมเครดิต"
    },
    { status: 429 }
  );

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
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

    // ---- 1. SAFETY GATE — ก่อน AI และก่อน gate ล็อกอิน/โควตาเสมอ ----
    const gate = safetyGate(question);
    if (gate) {
      return NextResponse.json({ intercepted: true, message: gate.crisis_resource_message });
    }

    // ---- 2. เลขเด็ด/หวย — นโยบายไม่ทำนาย (ไม่คิดเงิน) ----
    const lottery = lotteryIntercept(question);
    if (lottery) {
      return NextResponse.json({ declined: true, message: lottery.message });
    }

    // ---- 2.5 คำถามการแพทย์ (ปฏิเสธอ่อนโยน) + คำถามที่มีเครื่องมือเฉพาะ (พาไปใช้) — ฿0 ----
    // จาก benchmark 2 ส.ค. 2569: เคสพวกนี้เคยได้ข้อความ "ยังไม่มีโหมด" แบบเมนูขายของ
    const redirect = chatRedirectIntercept(question);
    if (redirect) {
      return NextResponse.json({ declined: true, message: redirect.message });
    }

    // ---- 3. gate ล็อกอิน — คำถามแชทต้องมีบัญชี (ถังนับต่อคน ไม่มี cookie อีกแล้ว) ----
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServer();
      userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    } catch (e) {
      console.warn("[chat] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: questionNeedsLoginMessage() },
        { status: 401 }
      );
    }

    const pool = await resolvePool(userId);
    if (pool.charge.mode === "denied") return deniedResponse(pool);

    // ---- 4. เส้นทาง "แผน" (วิเคราะห์อิสระ §16) ----
    if (body.mode === "plan") {
      return await handlePlanMode(question, pool);
    }

    // ---- เส้นทาง context (ถามต่อจากผลบนจอ) ----
    const logicId = Number(body.logicId);
    if (!CHAT_ENABLED_LOGICS.includes(logicId)) {
      return NextResponse.json({ error: "ฟังก์ชันนี้ยังไม่เปิดให้ถามคำถามค่ะ" }, { status: 400 });
    }

    const logicName = CHAT_LOGIC_NAMES[logicId] ?? `Logic ${logicId}`;
    const contextJson = JSON.stringify(body.context ?? {}, null, 1).slice(0, 6000);
    // ความจำแม่หมอ (เฟส 3) — best-effort: อ่านพัง = ตอบแบบไม่มีความจำ
    const memory = await getMemoryBlock(userId);

    // ---- hybrid (2 ส.ค. 2569): คำถามมีเลข/ทะเบียน/เบอร์ → ลอง planner+engine คำนวณจริงก่อน ----
    // เดิมโหมด context ตอบได้เฉพาะผลบนหน้า → ถามเลขทะเบียนบนหน้าโปรไฟล์ได้แต่ "คำนวณให้ไม่ได้"
    // ทั้งที่ engine มีครบ (feedback ผู้ใช้จริง) · วางแผนไม่ได้ = ตกกลับเส้น context เดิมด้านล่าง
    // ต้นทุนเพิ่มเฉพาะคำถามที่เข้าเกณฑ์: planner ~฿0.05 (heuristic เป็น pure ฿0)
    if (questionSuggestsComputation(question)) {
      let profileCtx = null;
      try {
        const supabase = await createSupabaseServer();
        const { data } = await supabase
          .from("user_profiles_e")
          .select("birth_date")
          .eq("auth_uid", userId)
          .maybeSingle();
        profileCtx = buildProfileContext(data?.birth_date);
      } catch (e) {
        console.warn("[chat/hybrid] อ่านโปรไฟล์ไม่สำเร็จ — ทำงานต่อแบบไม่มีธาตุประจำตัว", e);
      }
      const planned = await runPlanChat(question, profileCtx, memory, contextJson);
      if (planned.status === "answered") {
        logQuestion({ question, status: "answered", fns: [...new Set(planned.results.map((r) => r.fn))], userId });
        void rememberEvent(userId, "chat", { q: question, a: planned.reply, tag: logicName });
        const settled = await settleCharge(pool);
        return NextResponse.json({
          reply: planned.reply,
          results: planned.results,
          chart: planned.chart,
          caveats: planned.caveats,
          questions: settled.questions,
          credits: settled.credits,
          paidWithCredits: settled.paidWithCredits,
          shareTeaser: settled.questions.remaining === 0 && pool.bonus === 0,
        });
      }
      // needs_input/unclear → ไม่หักอะไร ตกไปให้เส้น context ตอบตามข้อมูลบนหน้า (พฤติกรรมเดิม)
    }

    const ai = await generate({
      role: "ai2",
      logicId,
      channel: "web",
      userId,
      system: CHAT_SYSTEM,
      input: `ฟังก์ชันที่ผู้ใช้กำลังดู: ${logicName}
${memory ? `\n${memory}\n` : ""}
<ผลที่ผู้ใช้เห็นอยู่>
${contextJson}
</ผลที่ผู้ใช้เห็นอยู่>

คำถามของผู้ใช้: ${question}`,
      maxTokens: 700, // ตอบสั้น 2-4 ประโยค — กันร่ายยาวเสียเงินฟรี
    });

    // จำเหตุการณ์นี้ (fire-and-forget — ห้ามหน่วง response)
    void rememberEvent(userId, "chat", { q: question, a: ai.text, tag: logicName });

    const settled = await settleCharge(pool);
    return NextResponse.json({
      reply: ai.text,
      via: `${ai.provider}/${ai.model}${ai.usedFallback ? " (สำรอง)" : ""}`,
      questions: settled.questions,
      credits: settled.credits,
      paidWithCredits: settled.paidWithCredits,
      // เฟส 2: หน้าแชร์ + รางวัล +2 — UI โชว์ teaser ได้เมื่อยังไม่เคยรับโบนัสแชร์
      shareTeaser: settled.questions.remaining === 0 && pool.bonus === 0,
    });
  } catch (err) {
    console.error("[chat] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

/** โหมด "แผน" — AI เลือกฟังก์ชัน → engine คำนวณ → AI เล่า (Safety Gate/gate ผ่านมาแล้ว) */
async function handlePlanMode(question: string, pool: PoolState): Promise<NextResponse> {
  // โปรไฟล์ (ธาตุประจำตัว) — วันเกิดไม่เคยถูกส่งให้ AI (§16.3)
  let profileCtx = null;
  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("user_profiles_e")
      .select("birth_date")
      .eq("auth_uid", pool.userId)
      .maybeSingle();
    profileCtx = buildProfileContext(data?.birth_date);
  } catch (e) {
    console.warn("[chat/plan] อ่านโปรไฟล์ไม่สำเร็จ — ทำงานต่อแบบไม่มีธาตุประจำตัว", e);
  }

  // ความจำแม่หมอ (เฟส 3) — แนบให้ narrator
  const memory = await getMemoryBlock(pool.userId);
  const result = await runPlanChat(question, profileCtx, memory);

  // ถามข้อมูลเพิ่ม / นอกขอบเขต → ไม่หัก (ยังไม่ได้คำตอบจริง)
  if (result.status === "needs_input") {
    logQuestion({ question, status: "needs_input", userId: pool.userId });
    return NextResponse.json({
      needsInput: true,
      message: result.message,
      missingInputs: result.missingInputs,
      // ถามกลับเรื่องใจ/ที่ทำงาน → แนบชิปคำตอบสำเร็จรูป ฿0 — จิ้มแล้วเป็นคำถามเต็มทันที
      ...(result.missingInputs.includes(WORK_PATTERN_KEY)
        ? { suggest: WORK_PATTERN_SUGGESTIONS }
        : result.missingInputs.includes(CONSULT_TOPIC_KEY)
        ? { suggest: CONSULT_TOPIC_SUGGESTIONS }
        : {}),
    });
  }
  if (result.status === "unclear") {
    logQuestion({ question, status: "unclear", userId: pool.userId });
    return NextResponse.json({ unclear: true, message: result.message });
  }

  logQuestion({ question, status: "answered", fns: [...new Set(result.results.map((r) => r.fn))], userId: pool.userId });
  void rememberEvent(pool.userId, "chat", { q: question, a: result.reply, tag: "วิเคราะห์อิสระ" });
  const settled = await settleCharge(pool);
  return NextResponse.json({
    reply: result.reply,
    results: result.results,
    chart: result.chart,
    caveats: result.caveats,
    via: { planner: result.plannerVia, narrator: result.narratorVia },
    questions: settled.questions,
    credits: settled.credits,
    paidWithCredits: settled.paidWithCredits,
    shareTeaser: settled.questions.remaining === 0 && pool.bonus === 0,
  });
}

/**
 * GET = สถานะทรัพยากรของผู้ใช้ (ถังคำถาม + เครดิต) — แถบสถานะ/ทุกหน้าเรียกตอนโหลด ฿0
 * ไม่ล็อกอิน → loggedIn:false (UI โชว์ "เข้าสู่ระบบเพื่อรับคำถามฟรี")
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    if (!userId) {
      return NextResponse.json({ loggedIn: false, freeTotal: FREE_QUESTIONS_TOTAL });
    }
    const { used, bonus } = await getDbUsageBonus(userId, QUESTIONS_BUCKET);
    const [questions, credits] = [checkQuestionPool(used, bonus), await getCreditBalance(userId)];
    return NextResponse.json({ loggedIn: true, questions, credits });
  } catch (e) {
    console.warn("[chat] GET status ล้มเหลว", e);
    return NextResponse.json({ loggedIn: false, freeTotal: FREE_QUESTIONS_TOTAL });
  }
}
