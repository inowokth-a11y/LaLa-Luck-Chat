// /api/feedback — รับความเห็นจากผู้ใช้ (เปิดกว้าง + ให้ดาว + ตอบคำถามที่แอดมินตั้ง)
// เขียนผ่าน service role (ตาราง feedback ไม่มี policy) · เปิดให้ทุกคน (anon + ล็อกอิน)

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { validateFeedback } from "@/lib/feedback/validate";
import { addDbBonus, planBucket } from "@/lib/chat/usage-db";

export const runtime = "nodejs";

// รางวัลคอมเมนต์ = 1 เครดิต (โบนัสโควตา plan-chat)
// 🔴 กันฟาร์ม: ให้เฉพาะ "ตอบคำถามที่แอดมินตั้ง" (มี promptId = บอทถามก่อน) + ครั้งเดียวต่อคำถามต่อคน
const REWARD_CREDITS = 1;

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

    // ---- รางวัล: เฉพาะล็อกอิน + ตอบคำถามที่แอดมินตั้ง (promptId) + ยังไม่เคยตอบคำถามนี้ ----
    let rewarded = 0;
    if (userId && v.promptId) {
      // นับ feedback ของ user+prompt นี้ (รวมแถวที่เพิ่ง insert) — ครั้งแรก = 1
      const { count } = await svc
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("prompt_id", v.promptId);
      if (count === 1) {
        const ok = await addDbBonus(userId, planBucket(), REWARD_CREDITS);
        if (ok !== null) rewarded = REWARD_CREDITS;
      }
    }

    const message = rewarded
      ? `ขอบคุณค่ะ 🙏 รับ ${rewarded} เครดิตฟรีแล้ว — ใช้ถามในแชทวิเคราะห์อิสระได้เลยค่ะ 🎁`
      : "ขอบคุณสำหรับความเห็นค่ะ 🙏";
    return NextResponse.json({ ok: true, message, rewarded });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
