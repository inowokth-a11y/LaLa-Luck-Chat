// Logic 0 — Router: จำแนกว่าข้อความผู้ใช้ควรไป Logic ไหน
//
// ⚠️ ลำดับสำคัญ ห้ามสลับ (CLAUDE.md §6):
//   1. Safety Gate       — deterministic, ก่อน AI ทุกตัว ไม่มีข้อยกเว้น
//   2. Keyword matching  — deterministic, ฟรี ไม่เสีย token
//   3. AI classification — เฉพาะเมื่อ keyword ไม่โดน (แทน claude_classify_stub() ของ Python)
//
// หมายเหตุ: route นี้ "บอกปลายทาง" เท่านั้น ยังไม่ได้ต่อสายเรียก Logic ปลายทางจริง
// (Logic 1/4/8-11/19/20/21 ยังเป็น endpoint แยกกันอยู่) — การต่อสายเป็นงานของ LINE webhook

import { NextResponse } from "next/server";
import {
  routeByKeyword,
  validateAiClassification,
  getRouterSystemPrompt,
  LOGIC_NAMES,
  RESPONSE_MODE,
  FALLBACK_LOGIC_ID,
  type RouteResult,
} from "@/lib/engine/router";
import { generate, extractJson, isRoleAvailable } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { message?: string };
    const message = (body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "กรุณาส่งข้อความที่ต้องการจำแนก" }, { status: 400 });
    }

    // ---- 1 + 2: Safety Gate แล้วต่อด้วย keyword (deterministic ทั้งคู่) ----
    const base = routeByKeyword(message);

    // โดน Safety Gate หรือ keyword ชัดเจนแล้ว → จบตรงนี้ ไม่ต้องจ่ายค่า AI
    if (base.method !== "fallback_no_keyword_match") {
      return NextResponse.json({ ...base, via: "engine" });
    }

    // ---- 3: keyword ไม่โดน → ให้ AI ช่วยจำแนก ----
    if (!isRoleAvailable("router")) {
      // ไม่มี AI ให้ใช้ → ยอมรับ fallback 18 ตามสเปกเดิม (degrade แบบตั้งใจ ไม่ใช่ error)
      return NextResponse.json({ ...base, via: "engine" });
    }

    let result: RouteResult = base;
    let via = "engine";
    try {
      const ai = await generate({
        role: "router",
        channel: "web",
        system: getRouterSystemPrompt(),
        input: message,
        maxTokens: 300, // ตอบแค่ JSON สั้นๆ — กันไม่ให้ร่ายยาวเสียเงินฟรี
      });

      const valid = validateAiClassification(extractJson(ai.text));
      if (valid) {
        result = {
          logic_id: valid.logic_id,
          logic_name: LOGIC_NAMES[valid.logic_id],
          confidence: valid.confidence,
          method: "ai",
          response_mode: RESPONSE_MODE[valid.logic_id] ?? "chat",
        };
        via = `${ai.provider}/${ai.model}${ai.usedFallback ? " (สำรอง)" : ""}`;
      } else {
        // AI ตอบมาแต่ใช้ไม่ได้ (logic_id ไม่มีจริง / JSON พัง) → คงค่า fallback 18 ไว้
        result = { ...base, note: "AI ตอบในรูปแบบที่ใช้ไม่ได้ — ใช้ค่า fallback แทน" };
      }
    } catch (e) {
      // AI ล่ม ไม่ใช่เหตุให้ทั้ง request พัง — 18 เป็นปลายทางที่ยอมรับได้ตามสเปก
      console.warn("[router] AI classification ล้มเหลว — ใช้ fallback 18", e);
      result = { ...base, note: "AI ไม่พร้อมใช้งาน — ใช้ค่า fallback แทน" };
    }

    return NextResponse.json({ ...result, via });
  } catch (err) {
    console.error("[router] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

/** GET = health check เบาๆ ดูว่า Router พร้อมและมี AI ให้ใช้ไหม (ไม่เสียค่า AI) */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ai_available: isRoleAvailable("router"),
    fallback_logic_id: FALLBACK_LOGIC_ID,
  });
}
