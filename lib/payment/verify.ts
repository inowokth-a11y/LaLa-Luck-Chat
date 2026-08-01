// ตรวจ charge ก่อนเติมเครดิต — ตรรกะล้วน ไม่แตะ network (เทสต์ตรงๆ ได้)
//
// 🔴 หลักความปลอดภัยของเส้นเติมเงิน:
//   1. webhook ของ Omise ไม่มีลายเซ็น → payload เป็นแค่ "สัญญาณ" — ข้อมูลจริงต้อง fetch
//      charge จาก API ด้วย secret key เสมอ (ทำใน route) แล้วค่อยส่งเข้าฟังก์ชันนี้
//   2. จำนวนเครดิตคิดจาก "ยอดเงินจริงของ charge" เทียบกับ CREDIT_PACKAGES ฝั่ง server
//      — ไม่เชื่อ metadata เรื่องจำนวนเครดิต (แม้เราเซ็ตเอง ก็กันพลาดถ้าแพ็กเปลี่ยนราคา)
//   3. ยอดที่ไม่ตรงแพ็กไหนเลย = ปฏิเสธ ไม่ปัดให้ (จ่ายมาจริงแต่ผิดยอด → คืนเงิน/ติดต่อแอดมิน)

import { CREDIT_PACKAGES, type CreditPackage } from "@/lib/credits/pricing";
import type { OmiseCharge } from "./omise";

export interface TopupGrant {
  authUid: string;
  credits: number;
  packageThb: number;
}

export type TopupVerdict =
  | { ok: true; grant: TopupGrant }
  | { ok: false; reason: "not_paid" | "bad_currency" | "unknown_amount" | "no_auth_uid" };

/** หาแพ็กจากยอดสตางค์จริงของ charge — ไม่ตรงเป๊ะ = ไม่รู้จัก */
export function packageForSatang(amountSatang: number): CreditPackage | null {
  return CREDIT_PACKAGES.find((p) => p.priceThb * 100 === amountSatang) ?? null;
}

/** ตัดสินว่า charge นี้เติมเครดิตได้ไหม ให้ใคร เท่าไหร่ */
export function verifyChargeForGrant(charge: OmiseCharge): TopupVerdict {
  if (!charge.paid || charge.status !== "successful") return { ok: false, reason: "not_paid" };
  if ((charge.currency ?? "").toLowerCase() !== "thb") return { ok: false, reason: "bad_currency" };

  const pkg = packageForSatang(charge.amount);
  if (!pkg) return { ok: false, reason: "unknown_amount" };

  const authUid = typeof charge.metadata?.auth_uid === "string" ? charge.metadata.auth_uid : "";
  // UUID v4 คร่าวๆ — auth_uid มาจาก metadata ที่ server เราเซ็ตตอนสร้าง charge
  if (!/^[0-9a-f-]{36}$/i.test(authUid)) return { ok: false, reason: "no_auth_uid" };

  return { ok: true, grant: { authUid, credits: pkg.credits, packageThb: pkg.priceThb } };
}

/** action ใน ledger ของการเติมทาง PromptPay — ต้องขึ้นต้น topup: ให้ unique index (migration 030) คุม */
export const TOPUP_ACTION = "topup:promptpay";
