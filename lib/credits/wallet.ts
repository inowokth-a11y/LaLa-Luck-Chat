// กระเป๋าเครดิตฝั่ง DB (migration 027) — อ่าน/หัก/เติมด้วย service role
// route เป็นคนยืนยัน auth_uid จาก session มาแล้ว (แพทเทิร์นเดียวกับ lib/chat/usage-db.ts)
//
// 🔴 ไม่ import เข้า client component — service key ต้องไม่หลุด browser
// 🔴 อ่านพัง → คืน 0 (ไม่ใช่ให้ใช้ฟรี) · หักพัง → คืน error ให้ route ตัดสินใจ

import { createServiceClient } from "@/lib/supabase/server";

/** ยอดเครดิตคงเหลือ (0 ถ้ายังไม่มีกระเป๋า/อ่านล้มเหลว) */
export async function getCreditBalance(authUid: string): Promise<number> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("credit_wallet_e")
      .select("balance")
      .eq("auth_uid", authUid)
      .maybeSingle();
    if (error) {
      console.warn("[wallet] อ่านยอดเครดิตไม่สำเร็จ — ถือว่า 0", error.message);
      return 0;
    }
    return data?.balance ?? 0;
  } catch (e) {
    console.warn("[wallet] อ่านยอดเครดิต error — ถือว่า 0", e);
    return 0;
  }
}

export type SpendResult =
  | { ok: true; balance: number }
  | { ok: false; reason: "insufficient" | "error" };

/**
 * หักเครดิตแบบ atomic (RPC spend_credits) — คืนยอดใหม่
 * "insufficient" = ยอดไม่พอ ณ วินาทีหัก (เช่น race สองแท็บ) — route ควร log ไว้ ไม่ต้องยึดคำตอบคืน
 */
export async function spendCredits(
  authUid: string,
  amount: number,
  action: string,
  ref?: string
): Promise<SpendResult> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("spend_credits", {
      p_auth_uid: authUid,
      p_amount: amount,
      p_action: action,
      p_ref: ref ?? null,
    });
    if (error || typeof data !== "number" || data === -2) {
      console.warn("[wallet] spend_credits ไม่สำเร็จ", error?.message ?? data);
      return { ok: false, reason: "error" };
    }
    if (data === -1) return { ok: false, reason: "insufficient" };
    return { ok: true, balance: data };
  } catch (e) {
    console.warn("[wallet] spend_credits error", e);
    return { ok: false, reason: "error" };
  }
}

/** เติมเครดิต (แอดมิน/รางวัล/ชำระเงินอนาคต) — คืนยอดใหม่ หรือ null ถ้าล้มเหลว */
export async function grantCredits(
  authUid: string,
  amount: number,
  action: string,
  ref?: string
): Promise<number | null> {
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.rpc("grant_credits", {
      p_auth_uid: authUid,
      p_amount: amount,
      p_action: action,
      p_ref: ref ?? null,
    });
    if (error || typeof data !== "number" || data < 0) {
      console.warn("[wallet] grant_credits ไม่สำเร็จ", error?.message ?? data);
      return null;
    }
    return data;
  } catch (e) {
    console.warn("[wallet] grant_credits error", e);
    return null;
  }
}
