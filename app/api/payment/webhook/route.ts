// /api/payment/webhook — รับ event จาก Omise (ตั้ง URL ใน dashboard → Settings → Webhooks)
//
// 🔴 Omise ไม่เซ็นลายเซ็น webhook — payload จึงเป็นแค่ "สัญญาณให้ไปตรวจ" เท่านั้น
//    settleTopupCharge fetch charge จริงจาก API ด้วย secret key เสมอ → payload ปลอม
//    ทำอะไรไม่ได้นอกจากทำให้เรา fetch ฟรีหนึ่งครั้ง (เครดิตเข้าเฉพาะ charge ที่จ่ายจริง
//    ยอดตรงแพ็ก และยังไม่เคยเติม — unique index กันซ้ำอีกชั้น)
//
// คืน 200 เสมอ (ยกเว้นระบบยังไม่พร้อม) — คืน 5xx แล้ว Omise จะ retry ถี่โดยไม่จำเป็น
// เพราะ polling ฝั่งหน้าเว็บเป็นทางสำรองที่ settle ได้เหมือนกันอยู่แล้ว

import { NextResponse } from "next/server";
import { isOmiseAvailable } from "@/lib/payment/omise";
import { settleTopupCharge } from "@/lib/payment/settle";

export const runtime = "nodejs";

interface OmiseEvent {
  object?: string;
  key?: string; // เช่น "charge.complete"
  data?: { object?: string; id?: string; metadata?: Record<string, unknown> };
}

export async function POST(req: Request) {
  if (!isOmiseAvailable()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  let event: OmiseEvent;
  try {
    event = (await req.json()) as OmiseEvent;
  } catch {
    return NextResponse.json({ ok: true, note: "ignored: bad json" });
  }

  const chargeId = event.data?.object === "charge" ? event.data.id : undefined;
  const isChargeEvent = event.object === "event" && (event.key ?? "").startsWith("charge.");
  // สนใจเฉพาะ charge ของระบบเติมเครดิตเรา — event อื่น (โอนเงิน ฯลฯ) ข้ามเงียบๆ
  const isTopup = event.data?.metadata?.kruth_topup === true;

  if (!isChargeEvent || !chargeId || !isTopup) {
    return NextResponse.json({ ok: true, note: "ignored" });
  }

  try {
    const result = await settleTopupCharge(chargeId);
    console.log(`[topup-webhook] ${chargeId} → ${result.status}`);
    return NextResponse.json({ ok: true, result: result.status });
  } catch (err) {
    // ไม่คืน 5xx — polling เป็นทางสำรอง และ Omise retry ไม่ช่วยอะไรถ้า charge id เพี้ยน
    console.error("[topup-webhook] settle error", err);
    return NextResponse.json({ ok: true, note: "settle error (จะถูกเก็บตกด้วย polling)" });
  }
}
