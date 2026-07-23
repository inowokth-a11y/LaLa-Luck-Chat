// โควตาคำถาม AI Chat ต่อฟังก์ชัน — ตรรกะล้วน ไม่แตะ cookie/network (เทสต์ได้ตรงๆ)
//
// 🔴 ข้อจำกัดที่ต้องรู้ก่อนใช้จริง:
//    ตอนนี้ยังไม่มีระบบสมาชิก (CLAUDE.md §12) จึงนับโควตาจาก **cookie ต่อเบราว์เซอร์**
//    ผู้ใช้ล้าง cookie แล้วได้โควตาใหม่ทันที — พอสำหรับตัวทดลอง แต่**กันคนตั้งใจเลี่ยงไม่ได้**
//    เมื่อทำระบบสมาชิกแล้วต้องย้ายไปนับที่ `users` + `ai_usage_log` ฝั่ง DB แทน
//    (ตอนนั้นถึงจะขายเครดิตเติมเงินได้จริงตามที่ตั้งใจ)

/** จำนวนคำถามฟรีต่อ 1 ฟังก์ชัน ในเฟสทดลอง */
export const FREE_QUESTIONS_PER_LOGIC = 2;

/** Logic ที่เปิดให้ถามได้ — ต้องตรงกับหน้าที่มีจริง (LIFF 6 หน้า) */
export const CHAT_ENABLED_LOGICS: readonly number[] = [1, 4, 7, 8, 20, 21];

export const CHAT_LOGIC_NAMES: Record<number, string> = {
  1: "โปรไฟล์พลังงาน",
  4: "ทำนายฝัน",
  7: "ฮวงจุ้ย",
  8: "ดวงของฉัน",
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

/** อ่านสภาพโควตาจากสตริง (เนื้อ cookie) — ค่าพังต้องไม่ทำให้ระบบล่ม */
export function parseQuota(raw: string | undefined | null): QuotaState {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (o === null || typeof o !== "object" || Array.isArray(o)) return {};
    const out: QuotaState = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const n = typeof v === "number" ? v : Number(v);
      // ค่าติดลบ/NaN = พยายามปลอมให้ได้โควตาเพิ่ม → ปัดเป็น 0 ไม่ใช่เชื่อตาม
      if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeQuota(state: QuotaState): string {
  return JSON.stringify(state);
}

/** ตรวจว่าถามได้อีกไหม — ไม่แก้ state */
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

/** เพิ่มยอดใช้ไป 1 — คืน state ใหม่ (ไม่แก้ของเดิม) */
export function consumeQuota(state: QuotaState, logicId: number): QuotaState {
  const key = String(logicId);
  return { ...state, [key]: (state[key] ?? 0) + 1 };
}

/** ข้อความบอกผู้ใช้เมื่อโควตาหมด — ตรงไปตรงมา ไม่หลอกว่าจะได้เพิ่มฟรี */
export function quotaExhaustedMessage(logicId: number): string {
  const name = CHAT_LOGIC_NAMES[logicId] ?? "ฟังก์ชันนี้";
  return `คุณใช้คำถามฟรีของ "${name}" ครบ ${FREE_QUESTIONS_PER_LOGIC} คำถามแล้วค่ะ 🙏\n\nช่วงทดลองนี้ให้ถามได้ฟังก์ชันละ ${FREE_QUESTIONS_PER_LOGIC} คำถาม — เร็ว ๆ นี้จะเปิดให้เติมเครดิตเพื่อถามต่อได้ไม่จำกัดค่ะ`;
}
