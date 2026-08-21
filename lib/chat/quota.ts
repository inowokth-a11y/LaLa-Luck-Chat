// สิทธิ์ทดลอง "พิธี" ต่อฟังก์ชัน — ตรรกะล้วน ไม่แตะ cookie/network (เทสต์ได้ตรงๆ)
//
// บทบาทปัจจุบัน (1 ส.ค. 2569 — หลังรวมถังคำถามแชทเป็น lib/chat/questions.ts):
//   ไฟล์นี้เหลือหน้าที่เดียว = สิทธิ์ทดลองของ **ฝัน (logic:4) / เสี่ยงทาย (logic:21)**
//   ซึ่งจงใจแยกจากถังคำถามแชท เพราะต้นทุนคนละโลก (ฝันปลุก AI-1 ได้ ฿7.46)
//   นับที่ DB (chat_usage_e bucket logic:<id>) — routes เป็นคนสร้าง state สังเคราะห์ส่งเข้ามา

/** จำนวนครั้งทดลองฟรีต่อ 1 พิธี ต่อบัญชี — ผู้ใช้ตัดสิน 6 ส.ค. 2569: ฝัน 1 ครั้ง (เดิม 2 —
 *  ต้นทุนสูงสุดของระบบ ปลุก AI-1 ได้ ฿7.46) · เสี่ยงทาย/อื่นๆ คง 2 */
export const FREE_QUESTIONS_PER_LOGIC = 2;
// 4: ฝันฟรี 1 ครั้ง (ต้นทุน AI-1 สูงสุด — ผู้ใช้ตัดสิน 6 ส.ค. 2569)
// 17: เนื้อคู่ฟรี 1 ครั้ง แล้วครั้งต่อไป 20 เครดิต (ผู้ใช้ตัดสิน 21 ส.ค. 2569)
const FREE_OVERRIDES: Record<number, number> = { 4: 1, 17: 1 };

export function freeLimitForLogic(logicId: number): number {
  return FREE_OVERRIDES[logicId] ?? FREE_QUESTIONS_PER_LOGIC;
}

/** Logic ที่เปิดให้ถามได้ — ต้องตรงกับหน้าที่มีจริง */
export const CHAT_ENABLED_LOGICS: readonly number[] = [1, 4, 7, 8, 16, 17, 20, 21];

export const CHAT_LOGIC_NAMES: Record<number, string> = {
  1: "โปรไฟล์พลังงาน",
  4: "ทำนายฝัน",
  7: "ฮวงจุ้ย",
  8: "ดวงของฉัน",
  16: "ดูแลสุขภาวะ",
  17: "ความรักและเนื้อคู่",
  20: "ข่ายความสัมพันธ์",
  21: "เสี่ยงทาย",
};

/** สภาพโควตา: จำนวนที่ใช้ไปแล้ว แยกตาม logic */
export type QuotaState = Record<string, number>;

export interface QuotaCheck {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
  reason?: "logic_not_enabled" | "quota_exhausted";
}

/** ตรวจว่าใช้สิทธิ์ทดลองได้อีกไหม — ไม่แก้ state */
export function checkQuota(state: QuotaState, logicId: number): QuotaCheck {
  const limit = freeLimitForLogic(logicId);
  if (!CHAT_ENABLED_LOGICS.includes(logicId)) {
    return { allowed: false, used: 0, remaining: 0, limit, reason: "logic_not_enabled" };
  }
  const used = state[String(logicId)] ?? 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    used,
    remaining,
    limit,
    ...(remaining > 0 ? {} : { reason: "quota_exhausted" as const }),
  };
}

/** ข้อความบอกผู้ใช้เมื่อโควตาหมด — ตรงไปตรงมา ไม่หลอกว่าจะได้เพิ่มฟรี
 *  creditCost = เครดิตต่อครั้งของฟังก์ชันนั้น (แชท 1 · ฝัน/เสี่ยงทาย 2 — ดู lib/credits/pricing.ts) */
export function quotaExhaustedMessage(logicId: number, creditCost = 1): string {
  const name = CHAT_LOGIC_NAMES[logicId] ?? "ฟังก์ชันนี้";
  return `คุณใช้สิทธิ์ฟรีของ "${name}" ครบ ${freeLimitForLogic(logicId)} ครั้งแล้วค่ะ 🙏 ใช้ต่อได้ด้วยเครดิต (ครั้งละ ${creditCost} เครดิต)`;
}
