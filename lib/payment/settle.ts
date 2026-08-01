// จุด settle เดียวของการเติมเครดิต — ทั้ง webhook และ polling จากหน้าเว็บเรียกฟังก์ชันนี้
// 🔴 server เท่านั้น (service role + secret key)
//
// ลำดับ: fetch charge จาก Omise (แหล่งความจริง — payload webhook ไม่เซ็นลายเซ็น ห้ามเชื่อ)
// → verifyChargeForGrant (pure) → เช็ค ledger ว่าเคยเติมแล้วไหม (fast path)
// → grant_credits (atomic) โดยมี unique index จาก migration 030 เป็นด่านสุดท้ายกัน race
// → ชน index = อีกทางเติมไปแล้วเสี้ยววินาทีก่อนหน้า ถือว่า "already" ไม่ใช่ error

import { createServiceClient } from "@/lib/supabase/server";
import { grantCredits } from "@/lib/credits/wallet";
import { getCharge } from "./omise";
import { verifyChargeForGrant, TOPUP_ACTION } from "./verify";

export type SettleResult =
  | { status: "granted"; balance: number; credits: number; authUid: string }
  | { status: "already"; authUid: string | null }
  | { status: "pending" }
  | { status: "failed"; reason: string };

async function alreadyGranted(chargeId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from("credit_ledger_e")
    .select("id")
    .eq("ref", chargeId)
    .like("action", "topup:%")
    .maybeSingle();
  if (error) {
    console.warn("[topup] เช็ค ledger ไม่สำเร็จ", error.message);
    return false; // ให้ unique index เป็นคนตัดสินแทน
  }
  return Boolean(data);
}

export async function settleTopupCharge(chargeId: string): Promise<SettleResult> {
  const charge = await getCharge(chargeId); // โยน error ถ้า id เพี้ยน/Omise ล่ม — caller จัดการ

  if (!charge.paid) {
    if (charge.expired || charge.status === "failed") {
      return { status: "failed", reason: charge.failure_message ?? charge.status };
    }
    return { status: "pending" };
  }

  const v = verifyChargeForGrant(charge);
  if (!v.ok) {
    // จ่ายแล้วแต่ยอด/สกุล/metadata ไม่ผ่านเกณฑ์ — ห้ามเติมมั่ว ต้องให้แอดมินดูเป็นรายเคส
    console.error(`[topup] charge ${charge.id} จ่ายแล้วแต่ verify ไม่ผ่าน: ${v.reason}`);
    return { status: "failed", reason: v.reason };
  }

  if (await alreadyGranted(charge.id)) {
    return { status: "already", authUid: v.grant.authUid };
  }

  const balance = await grantCredits(v.grant.authUid, v.grant.credits, TOPUP_ACTION, charge.id);
  if (balance === null) {
    // อาจชน unique index เพราะอีกทาง (webhook/polling) เติมตัดหน้า — เช็คซ้ำก่อนตัดสินว่าพัง
    if (await alreadyGranted(charge.id)) return { status: "already", authUid: v.grant.authUid };
    return { status: "failed", reason: "grant_error" };
  }
  console.log(`[topup] เติม ${v.grant.credits} เครดิต (฿${v.grant.packageThb}) ← charge ${charge.id}`);
  return { status: "granted", balance, credits: v.grant.credits, authUid: v.grant.authUid };
}
