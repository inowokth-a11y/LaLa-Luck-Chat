// สิทธิ์ทดลอง "พิธี" ต่อฟังก์ชัน — ตรรกะล้วน ไม่แตะ cookie/network (เทสต์ได้ตรงๆ)
//
// บทบาทปัจจุบัน (1 ส.ค. 2569 — หลังรวมถังคำถามแชทเป็น lib/chat/questions.ts):
//   ไฟล์นี้เหลือหน้าที่เดียว = สิทธิ์ทดลองของ **ฝัน (logic:4) / เสี่ยงทาย (logic:21)**
//   ซึ่งจงใจแยกจากถังคำถามแชท เพราะต้นทุนคนละโลก (ฝันปลุก AI-1 ได้ ฿7.46)
//   นับที่ DB (chat_usage_e bucket logic:<id>) — routes เป็นคนสร้าง state สังเคราะห์ส่งเข้ามา

/** จำนวนครั้งทดลองฟรีต่อ 1 พิธี (ฝัน/เสี่ยงทาย) ต่อบัญชี */
export const FREE_QUESTIONS_PER_LOGIC = 2;

/** Logic ที่เปิดให้ถามได้ — ต้องตรงกับหน้าที่มีจริง */
export const CHAT_ENABLED_LOGICS: readonly number[] = [1, 4, 7, 8, 16, 20, 21];

export const CHAT_LOGIC_NAMES: Record<number, string> = {
  1: "โปรไฟล์พลังงาน",
  4: "ทำนายฝัน",
  7: "ฮวงจุ้ย",
  8: "ดวงของฉัน",
  16: "ดูแลสุขภาวะ",
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
  const limit = FREE_QUESTIONS_PER_LOGIC;
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
  return `คุณใช้สิทธิ์ฟรีของ "${name}" ครบ ${FREE_QUESTIONS_PER_LOGIC} ครั้งแล้วค่ะ 🙏 ใช้ต่อได้ด้วยเครดิต (ครั้งละ ${creditCost} เครดิต)`;
}
