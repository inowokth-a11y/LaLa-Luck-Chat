// รหัสลิงก์แอฟฟิลิเอต + ค่าคงที่ cookie — ตรรกะล้วน (ใช้ได้ทั้ง client/server/เทสต์)

/** cookie เก็บรหัสลิงก์ที่ผู้เยี่ยมชมคลิกมา (httpOnly — ตั้งโดย /api/affiliate/visit) */
export const REF_COOKIE = "kruth_ref";
export const REF_COOKIE_MAX_AGE_S = 30 * 24 * 3600; // first-touch มีอายุ 30 วัน

/**
 * ผูกลิงก์เฉพาะบัญชีที่เพิ่งสร้าง (อายุ < 24 ชม. ณ ตอนล็อกอินผ่าน callback)
 * เหตุผล: ถ้าผูกบัญชีเก่าได้ พันธมิตรจะ "เคลมผู้ใช้เดิมของระบบ" ด้วยการส่งลิงก์ให้คนที่ใช้อยู่แล้ว
 * (สอดคล้อง §12: จ่ายตามรายได้จริงของผู้ใช้ที่พามาใหม่ ไม่ใช่ยอดคลิก/สมัคร)
 */
export const REF_ATTRIBUTION_WINDOW_HOURS = 24;

/** รูปแบบรหัสที่ยอมรับ: ตัวพิมพ์เล็ก/ตัวเลข ขึ้นต้นด้วยตัวอักษรหรือเลข คั่นขีดกลางได้ ยาว 3-32 */
const CODE_RE = /^[a-z0-9][a-z0-9-]{2,31}$/;

export function isValidCode(s: unknown): s is string {
  return typeof s === "string" && CODE_RE.test(s);
}

/**
 * แปลงรหัสที่แอดมินพิมพ์เอง → รูปแบบมาตรฐาน (ตัดวรรค→ขีด, พิมพ์เล็ก) · ผิดรูป = null
 * ไม่พยายาม "ซ่อม" เกินนี้ (เช่น ทับศัพท์ไทย) — ให้แอดมินเห็นตรงๆ ว่ารหัสใช้ไม่ได้
 */
export function normalizeCodeInput(s: string): string | null {
  const norm = s.trim().toLowerCase().replace(/\s+/g, "-");
  return isValidCode(norm) ? norm : null;
}

// ตัดอักขระที่อ่านสับสน (0/o, 1/l/i) — รหัสถูกส่งต่อปากเปล่า/พิมพ์ตามได้
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** สุ่มรหัสลิงก์ 8 ตัว — ไม่ใช่ความลับเชิง security (แค่กันเดา/กันชนกัน) */
export function randomCode(len = 8): string {
  let out = "";
  const buf = new Uint32Array(len);
  // crypto มีทั้ง browser และ Node ≥19 — fallback Math.random เผื่อ runtime แปลก
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * ALPHABET.length);
  }
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}
