// เกตทำนายแบบองค์รวมเกิน 2 สิ่งรอบตัว (Logic 20 — ผู้ใช้เคาะ 22 ส.ค. 2569)
//
// ฟรี ≤2 สิ่งรอบตัว (client คำนวณเอง ฿0 ไม่ต้องล็อกอิน — คงหน้าที่แม่เหล็ก §12) ·
// เกิน 2 (สูงสุด 10) = 20 เครดิต/การปลดล็อก — client จำการปลดล็อกไว้ต่อเซสชันเบราว์เซอร์
// (sessionStorage) จึงปรับรายการแล้วทำนายซ้ำได้โดยไม่หักซ้ำ
//
// ⚠️ ข้อจำกัดที่ยอมรับ (จดไว้ตรงๆ): engine ของโหมดนี้อยู่ใน client bundle อยู่แล้วเพราะ
//    เส้นฟรีใช้ร่วมกัน — เกตนี้คุมการใช้งานผ่าน UI ปกติ ไม่ใช่กันคนแกะ bundle
//    (ระดับเดียวกับการที่สูตรทุกตัวเป็น JS สาธารณะอยู่แล้ว)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { decideCharge, creditCost, chargeDeniedMessage, freeLaunchMode } from "@/lib/credits/charge";
import { getCreditBalance, spendCredits } from "@/lib/credits/wallet";
import { FREE_NETWORK_PARTS, MAX_NETWORK_PARTS } from "@/lib/engine/network-holistic";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { count?: number };
    const count = Number(body.count);
    if (!Number.isInteger(count) || count <= FREE_NETWORK_PARTS || count > MAX_NETWORK_PARTS) {
      return NextResponse.json(
        { error: `จำนวนสิ่งรอบตัวต้องอยู่ระหว่าง ${FREE_NETWORK_PARTS + 1}-${MAX_NETWORK_PARTS} (ไม่เกิน ${FREE_NETWORK_PARTS} รายการใช้ฟรีได้เลย)` },
        { status: 400 }
      );
    }

    let userId: string | null = null;
    let isGuest = false;
    try {
      const supabase = await createSupabaseServer();
      const u = (await supabase.auth.getUser()).data.user;
      userId = u?.id ?? null;
      isGuest = Boolean(u?.is_anonymous);
    } catch (e) {
      console.warn("[holistic] อ่าน session ไม่สำเร็จ — ถือว่าไม่ล็อกอิน", e);
    }
    if (!userId) {
      return NextResponse.json(
        { needsLogin: true, error: `ทำนายเกิน ${FREE_NETWORK_PARTS} สิ่งรอบตัว ต้องเข้าสู่ระบบก่อนค่ะ (ใช้ ${creditCost("holistic_network")} เครดิต/ครั้ง)` },
        { status: 401 }
      );
    }
    if (isGuest) {
      return NextResponse.json(
        { needsLogin: true, needsUpgrade: true, error: "โหมดข่ายใหญ่เปิดให้บัญชีถาวรค่ะ 🐾 ผูกบัญชี (ฟรี ไม่กี่วินาที) แล้วใช้เครดิตได้เลย — ข้อมูลเดิมไม่หาย" },
        { status: 401 }
      );
    }

    const cost = creditCost("holistic_network");
    const balance = await getCreditBalance(userId);
    const charge = decideCharge({ freeRemaining: 0, loggedIn: true, balance, cost, freeLaunch: freeLaunchMode() });
    if (charge.mode === "denied") {
      return NextResponse.json(
        { quotaExceeded: true, message: chargeDeniedMessage(charge), credits: charge.balance, creditCost: charge.cost },
        { status: 429 }
      );
    }

    // การปลดล็อกคือบริการที่ส่งมอบ ณ จุดนี้ — หักแล้วจึงตอบ ok (spend ล้มเหลว = ไม่ปลดล็อก)
    let creditsLeft: number | null = null;
    if (charge.mode === "credits") {
      const spent = await spendCredits(userId, charge.cost, "holistic_network", `parts:${count}`);
      if (!spent.ok) {
        return NextResponse.json(
          { quotaExceeded: true, message: "หักเครดิตไม่สำเร็จ กรุณาลองใหม่ค่ะ", credits: balance, creditCost: cost },
          { status: 429 }
        );
      }
      creditsLeft = spent.balance;
    }
    return NextResponse.json({
      ok: true,
      ...(charge.mode === "credits" ? { paidWithCredits: true, credits: creditsLeft } : { free: true }),
    });
  } catch (err) {
    console.error("[holistic] error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
