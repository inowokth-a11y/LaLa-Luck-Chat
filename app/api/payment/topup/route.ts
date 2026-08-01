// /api/payment/topup — เติมเครดิตผ่าน Omise PromptPay (§12)
//
// POST { priceThb }   → สร้าง charge + คืน QR (ต้องล็อกอิน — ยอด/เครดิตอ่านจาก CREDIT_PACKAGES
//                       ฝั่ง server เท่านั้น ไม่เชื่อตัวเลขจาก client)
// GET  ?chargeId=...  → เช็คสถานะ + settle ถ้าจ่ายแล้ว (polling จากหน้าเว็บ — คู่กับ webhook)

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/auth-server";
import { CREDIT_PACKAGES, PROMPTPAY_MIN_THB } from "@/lib/credits/pricing";
import { isOmiseAvailable, omiseTestMode, createPromptPayCharge, getCharge } from "@/lib/payment/omise";
import { settleTopupCharge } from "@/lib/payment/settle";
import { getCreditBalance } from "@/lib/credits/wallet";

export const runtime = "nodejs";

async function sessionUid(): Promise<string | null> {
  try {
    const supabase = await createSupabaseServer();
    return (await supabase.auth.getUser()).data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** ผู้เยี่ยมชม (anonymous) เติมเงินไม่ได้ — เงินจริงต้องอยู่กับบัญชีที่กู้คืนได้ (กติกา 1 ส.ค. 2569) */
async function isGuestSession(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServer();
    return Boolean((await supabase.auth.getUser()).data.user?.is_anonymous);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    if (!isOmiseAvailable()) {
      return NextResponse.json({ error: "ระบบชำระเงินยังไม่พร้อม (ยังไม่ได้ตั้งคีย์ Omise)" }, { status: 503 });
    }
    const uid = await sessionUid();
    if (!uid) return NextResponse.json({ needsLogin: true, error: "กรุณาเข้าสู่ระบบก่อนเติมเครดิต" }, { status: 401 });
    if (await isGuestSession()) {
      return NextResponse.json(
        { needsLogin: true, needsUpgrade: true, error: "ผูกบัญชีถาวรก่อนเติมเครดิตค่ะ 🐾 — เงินจริงต้องอยู่กับบัญชีที่กู้คืนได้เสมอ (ล้างเบราว์เซอร์แล้วเครดิตต้องไม่หาย)" },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { priceThb?: number };
    const pkg = CREDIT_PACKAGES.find((p) => p.priceThb === Number(body.priceThb));
    if (!pkg) {
      return NextResponse.json(
        { error: "ไม่รู้จักแพ็กนี้", packages: CREDIT_PACKAGES },
        { status: 400 }
      );
    }
    // ขั้นต่ำ PromptPay ฝั่ง Omise — ตรวจฝั่ง server เสมอแม้ UI จะซ่อนแพ็กนี้แล้ว
    if (pkg.priceThb < PROMPTPAY_MIN_THB) {
      return NextResponse.json(
        { error: `แพ็กนี้ต่ำกว่าขั้นต่ำของ PromptPay (฿${PROMPTPAY_MIN_THB}) — กรุณาเลือกแพ็กอื่น` },
        { status: 400 }
      );
    }

    const charge = await createPromptPayCharge({
      amountSatang: pkg.priceThb * 100,
      authUid: uid,
      packageThb: pkg.priceThb,
      credits: pkg.credits,
    });

    const qr = charge.source?.scannable_code?.image?.download_uri ?? null;
    if (!qr) {
      console.error("[topup] charge สร้างได้แต่ไม่มี QR", charge.id, charge.status);
      return NextResponse.json({ error: "สร้าง QR ไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });
    }

    return NextResponse.json({
      chargeId: charge.id,
      qrUri: qr,
      amountThb: pkg.priceThb,
      credits: pkg.credits,
      testMode: omiseTestMode(), // UI โชว์ป้าย "โหมดทดสอบ ไม่มีเงินจริง"
    });
  } catch (err) {
    console.error("[topup] create error", err);
    return NextResponse.json({ error: "สร้างรายการเติมเงินไม่สำเร็จ" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    if (!isOmiseAvailable()) return NextResponse.json({ error: "ระบบชำระเงินยังไม่พร้อม" }, { status: 503 });
    const uid = await sessionUid();
    if (!uid) return NextResponse.json({ needsLogin: true }, { status: 401 });

    const chargeId = new URL(req.url).searchParams.get("chargeId") ?? "";
    if (!/^chrg_[a-z0-9_]+$/i.test(chargeId)) {
      return NextResponse.json({ error: "chargeId ไม่ถูกต้อง" }, { status: 400 });
    }

    // เจ้าของเท่านั้นที่ poll ได้ — charge ผูก auth_uid ไว้ใน metadata ตอนสร้าง
    const charge = await getCharge(chargeId);
    if (charge.metadata?.auth_uid !== uid) {
      return NextResponse.json({ error: "ไม่ใช่รายการของคุณ" }, { status: 403 });
    }

    const result = await settleTopupCharge(chargeId);
    if (result.status === "granted") {
      return NextResponse.json({ status: "paid", credits: result.balance, added: result.credits });
    }
    if (result.status === "already") {
      // เติมไปแล้ว (เช่น webhook ตัดหน้า) — คืนยอดปัจจุบันให้ UI อัปเดตได้เลย
      return NextResponse.json({ status: "paid", credits: await getCreditBalance(uid) });
    }
    if (result.status === "pending") return NextResponse.json({ status: "pending" });
    return NextResponse.json({ status: "failed", reason: result.reason });
  } catch (err) {
    console.error("[topup] status error", err);
    return NextResponse.json({ error: "ตรวจสถานะไม่สำเร็จ" }, { status: 500 });
  }
}
