// /api/feedback — รับความเห็นจากผู้ใช้ (เปิดกว้าง + ให้ดาว + ตอบคำถามที่แอดมินตั้ง)
// เขียนผ่าน service role (ตาราง feedback ไม่มี policy) · เปิดให้ทุกคน (anon + ล็อกอิน)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { validateFeedback } from "@/lib/feedback/validate";
import { addDbBonus, getDbUsage, logicBucket } from "@/lib/chat/usage-db";
import { QUESTIONS_BUCKET } from "@/lib/chat/questions";
import { grantCredits } from "@/lib/credits/wallet";
import {
  MODE_FEEDBACK_REWARD,
  decideModeReward,
  feedbackModeById,
  untriedModes,
} from "@/lib/feedback/mode-reward";

export const runtime = "nodejs";

// รางวัลคอมเมนต์ = 1 เครดิต (โบนัสโควตา plan-chat)
// 🔴 กันฟาร์ม: ให้เฉพาะ "ตอบคำถามที่แอดมินตั้ง" (มี promptId = บอทถามก่อน) + ครั้งเดียวต่อคำถามต่อคน
const REWARD_CREDITS = 1;

/** GET ?logicId=X — คำถามความเห็นของโหมด + สถานะเคลม + โหมดที่ยังไม่ได้ให้ความเห็น (ลิงก์ชวนลอง) */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const logicId = Number(url.searchParams.get("logicId"));
    const mode = feedbackModeById(logicId);
    if (!mode) return NextResponse.json({ prompt: null });

    const svc = createServiceClient();
    const { data: prompt } = await svc
      .from("feedback_prompts")
      .select("id, question, reward_credits")
      .eq("logic_id", logicId)
      .eq("active", true)
      .maybeSingle();
    if (!prompt) return NextResponse.json({ prompt: null });

    let userId: string | null = null;
    let isAnonymous = false;
    try {
      const supabase = await createSupabaseServer();
      const u = (await supabase.auth.getUser()).data.user;
      userId = u?.id ?? null;
      isAnonymous = Boolean(u?.is_anonymous);
    } catch {
      /* anon */
    }

    let claimed = false;
    let claimedLogicIds: number[] = [];
    if (userId) {
      const { data: rows } = await svc
        .from("feedback")
        .select("prompt_id, feedback_prompts!inner(logic_id)")
        .eq("user_id", userId)
        .not("feedback_prompts.logic_id", "is", null);
      claimedLogicIds = (rows ?? [])
        .map((r) => (r.feedback_prompts as unknown as { logic_id: number | null })?.logic_id)
        .filter((x): x is number => typeof x === "number");
      claimed = claimedLogicIds.includes(logicId);
    }

    return NextResponse.json({
      prompt: { id: prompt.id, question: prompt.question, reward: prompt.reward_credits ?? MODE_FEEDBACK_REWARD },
      loggedIn: Boolean(userId),
      isAnonymous,
      claimed,
      untried: untriedModes(claimedLogicIds, logicId).slice(0, 4).map((m) => ({
        labelTh: m.labelTh,
        path: m.path,
        emoji: m.emoji,
      })),
    });
  } catch (err) {
    return NextResponse.json({ prompt: null, error: err instanceof Error ? err.message : "error" });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const v = validateFeedback(body);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    // ผูก user_id ถ้าล็อกอิน (ไม่บังคับ)
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServer();
      userId = (await supabase.auth.getUser()).data.user?.id ?? null;
    } catch {
      /* anon ก็ส่งความเห็นได้ */
    }

    const svc = createServiceClient();
    const { error } = await svc.from("feedback").insert({
      message: v.message,
      rating: v.rating,
      prompt_id: v.promptId,
      user_id: userId,
    });
    if (error) {
      console.error("[feedback] insert error", error.message);
      return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
    }

    // ---- รางวัล: เฉพาะตอบคำถามที่แอดมินตั้ง (promptId) + ยังไม่เคยตอบคำถามนี้ ----
    let rewarded = 0;
    let rewardKind: "questions" | "credits" | null = null;
    let rewardNote: string | null = null;
    let suggestModes: { labelTh: string; path: string; emoji: string }[] = [];
    if (v.promptId) {
      const { data: prompt } = await svc
        .from("feedback_prompts")
        .select("id, logic_id, reward_credits")
        .eq("id", v.promptId)
        .maybeSingle();

      // นับ feedback ของ user+prompt นี้ (รวมแถวที่เพิ่ง insert) — ครั้งแรก = 1
      const { count } = userId
        ? await svc
            .from("feedback")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("prompt_id", v.promptId)
        : { count: null };

      if (prompt?.logic_id && (prompt.reward_credits ?? 0) > 0) {
        // ---- prompt รายโหมด (เครดิตทดลอง — ผู้ใช้เคาะ 6 ก.ย. 2569) ----
        const mode = feedbackModeById(prompt.logic_id);
        const usageOk =
          !mode?.verifiable || (userId ? (await getDbUsage(userId, logicBucket(prompt.logic_id))) > 0 : false);
        let isAnonymous = false;
        try {
          const supabase = await createSupabaseServer();
          isAnonymous = Boolean((await supabase.auth.getUser()).data.user?.is_anonymous);
        } catch {
          /* ไม่มี session = ไม่ล็อกอิน */
        }
        const decision = decideModeReward({
          isLoggedIn: Boolean(userId),
          isAnonymous,
          textLength: v.message.length,
          alreadyClaimed: (count ?? 0) > 1,
          usageOk,
        });
        if (decision.eligible && userId) {
          const bal = await grantCredits(userId, prompt.reward_credits, `feedback:logic:${prompt.logic_id}`);
          if (bal !== null) {
            rewarded = prompt.reward_credits;
            rewardKind = "credits";
          }
        } else if (!decision.eligible) {
          rewardNote = decision.reasonTh;
        }
        // โหมดที่ยังไม่ได้ให้ความเห็น → ลิงก์ชวนลองต่อ (ผู้ใช้เคาะ: ปิดวงจร ได้เครดิตแล้วมีที่ใช้)
        if (userId) {
          const { data: claimedRows } = await svc
            .from("feedback")
            .select("prompt_id, feedback_prompts!inner(logic_id)")
            .eq("user_id", userId)
            .not("feedback_prompts.logic_id", "is", null);
          const claimed = (claimedRows ?? [])
            .map((r) => (r.feedback_prompts as unknown as { logic_id: number | null })?.logic_id)
            .filter((x): x is number => typeof x === "number");
          suggestModes = untriedModes(claimed, prompt.logic_id).slice(0, 4).map((m) => ({
            labelTh: m.labelTh,
            path: m.path,
            emoji: m.emoji,
          }));
        }
      } else if (userId && count === 1) {
        // ---- prompt ทั่วไปแบบเดิม: +1 คำถามฟรีเข้าถังรวม (1 ส.ค. 2569) ----
        const ok = await addDbBonus(userId, QUESTIONS_BUCKET, REWARD_CREDITS);
        if (ok !== null) {
          rewarded = REWARD_CREDITS;
          rewardKind = "questions";
        }
      }
    }

    const message =
      rewardKind === "credits"
        ? `ขอบคุณค่ะ 🙏 รับ ${rewarded} เครดิตแล้ว — เอาไปลองโหมดอื่นต่อได้เลยค่ะ 🎁`
        : rewardKind === "questions"
          ? `ขอบคุณค่ะ 🙏 รับคำถามฟรีเพิ่ม ${rewarded} ข้อแล้ว — ใช้ถามแม่หมอได้ทุกหน้าเลยค่ะ 🎁`
          : rewardNote
            ? `ขอบคุณสำหรับความเห็นค่ะ 🙏 (${rewardNote})`
            : "ขอบคุณสำหรับความเห็นค่ะ 🙏";
    return NextResponse.json({ ok: true, message, rewarded, rewardKind, suggestModes });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
