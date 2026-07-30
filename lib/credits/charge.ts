// ตัวตัดสินว่า request นี้ "ฟรี / หักเครดิต / ปฏิเสธ" — ตรรกะล้วน ไม่แตะ DB/cookie (เทสต์ตรงๆ ได้)
//
// ลำดับที่ตกลงไว้ (§12–13): สิทธิ์ฟรีก่อนเสมอ → หมดแล้วถึงใช้เครดิต (ต้องล็อกอิน) → ไม่พอ = ปฏิเสธ
// 🔴 หลักความยุติธรรมเดิมของระบบโควตา: ตรวจยอดก่อนเรียก AI แต่ **หักหลังสำเร็จเท่านั้น**
//    (AI ล่มแล้วยังเสียเครดิตถือว่าไม่ยุติธรรม — route เป็นคนคุมลำดับนี้)

import { actionRate } from "./pricing";

export type ChargeDecision =
  | { mode: "free" }
  | { mode: "credits"; cost: number }
  | { mode: "denied"; reason: "need_login" | "insufficient_credits"; cost: number; balance: number };

/** เครดิตที่ action นี้ต้องใช้ — key ต้องมีจริงใน ACTION_RATES (สะกดผิด = throw ตอน dev ทันที) */
export function creditCost(actionKey: string): number {
  const rate = actionRate(actionKey);
  if (!rate) throw new Error(`ไม่รู้จัก action "${actionKey}" ใน ACTION_RATES — ตรวจ lib/credits/pricing.ts`);
  return rate.credits;
}

export function decideCharge(opts: {
  /** สิทธิ์ฟรีคงเหลือ (โควตา/trial) — >0 = ยังใช้ฟรีได้ */
  freeRemaining: number;
  loggedIn: boolean;
  /** เครดิตคงเหลือ (0 ถ้าไม่ล็อกอิน/อ่านไม่ได้ — อ่านพังต้องไม่กลายเป็นได้ใช้ฟรี) */
  balance: number;
  /** เครดิตที่ action นี้ต้องใช้ (>0 — action ฟรีไม่ต้องเรียกตัวนี้) */
  cost: number;
}): ChargeDecision {
  if (opts.freeRemaining > 0) return { mode: "free" };
  if (!opts.loggedIn) return { mode: "denied", reason: "need_login", cost: opts.cost, balance: 0 };
  if (opts.balance >= opts.cost) return { mode: "credits", cost: opts.cost };
  return { mode: "denied", reason: "insufficient_credits", cost: opts.cost, balance: opts.balance };
}

/** ข้อความบอกผู้ใช้เมื่อถูกปฏิเสธ — ตรงไปตรงมา บอกทางไปต่อจริง ไม่หลอกว่าจะได้ฟรีเพิ่ม */
export function chargeDeniedMessage(d: Extract<ChargeDecision, { mode: "denied" }>): string {
  if (d.reason === "need_login") {
    return `สิทธิ์ฟรีครบแล้วค่ะ 🙏 เข้าสู่ระบบเพื่อใช้เครดิตต่อได้เลย (ครั้งละ ${d.cost} เครดิต)`;
  }
  return `เครดิตไม่พอค่ะ — ต้องใช้ ${d.cost} เครดิต แต่คงเหลือ ${d.balance} เครดิต\nระบบเติมเครดิตกำลังจะเปิดเร็ว ๆ นี้ค่ะ`;
}
