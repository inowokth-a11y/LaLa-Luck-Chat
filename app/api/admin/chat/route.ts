// ผู้ช่วย AI สำหรับแอดมิน — สรุป + ถามข้อมูลแดชบอร์ด (§12)
// 🔒 gate เฉพาะแอดมิน (ADMIN_EMAILS) · query ข้อมูลด้วย service role · AI ตอบจาก context เท่านั้น

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminEmails, isAdminEmail } from "@/lib/admin/access";
import { computeUsageStats, type UsageRow } from "@/lib/admin/usage-stats";
import { summarizeQuestions, type QuestionRow } from "@/lib/admin/question-stats";
import { buildAdminContext, buildAssistantInput, ADMIN_ASSISTANT_SYSTEM } from "@/lib/admin/assistant";
import { generate, isRoleAvailable } from "@/lib/ai";

export const runtime = "nodejs";

const MAX_Q = 400;

export async function POST(req: Request) {
  try {
    // ---- gate แอดมิน ----
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!isAdminEmail(data.user?.email ?? null, getAdminEmails())) {
      return NextResponse.json({ error: "เฉพาะแอดมิน" }, { status: 403 });
    }
    if (!isRoleAvailable("router")) {
      return NextResponse.json({ error: "AI ไม่พร้อมใช้งาน" }, { status: 503 });
    }

    const body = (await req.json()) as { question?: string };
    const question = (body.question ?? "").trim().slice(0, MAX_Q);
    if (!question) return NextResponse.json({ error: "กรุณาพิมพ์คำถาม" }, { status: 400 });

    // ---- ดึงข้อมูล + รวมสถิติ (service role) ----
    const svc = createServiceClient();
    const [{ data: uRows }, { data: qRows }] = await Promise.all([
      svc.from("ai_usage_log").select("user_id,channel,logic_id,ai_role,provider,model,used_fallback,cost_thb,cache_hit,ok,created_at").order("created_at", { ascending: false }).limit(5000),
      svc.from("chat_question_log").select("question,status,fns,created_at").order("created_at", { ascending: false }).limit(2000),
    ]);
    const context = buildAdminContext(
      computeUsageStats((uRows as UsageRow[] | null) ?? []),
      summarizeQuestions((qRows as QuestionRow[] | null) ?? [])
    );

    // ---- AI (Haiku ถูก) — ตอบจาก context เท่านั้น ----
    const ai = await generate({
      role: "router",
      channel: "admin",
      logicId: 0,
      system: ADMIN_ASSISTANT_SYSTEM,
      input: buildAssistantInput(context, question),
      maxTokens: 700,
    });

    return NextResponse.json({ reply: ai.text, via: `${ai.provider}/${ai.model}${ai.usedFallback ? " (สำรอง)" : ""}` });
  } catch (err) {
    console.error("[admin/chat] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
