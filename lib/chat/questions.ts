// "ถังคำถามฟรี" รวมทั้งระบบ — ตรรกะล้วน (ผู้ใช้ตัดสิน 1 ส.ค. 2569 แทนโควตาแยกราย Logic)
//
// โมเดลที่เคาะแล้ว (4 บรรทัดนี้คือทั้งระบบ):
//   ฟีเจอร์คำนวณ (โปรไฟล์/ดวง/ฮวงจุ้ย/...) = ฟรีไม่จำกัด (฿0 ไม่ใช้ AI)
//   ทดลองพิธี (ฝัน/เสี่ยงทาย)             = 2 ครั้ง/คน (bucket logic:4/21 เดิม — จงใจแยกถัง
//                                            เพราะต้นทุนคนละโลก: ฝันปลุก AI-1 ได้ ฿7.46)
//   คำถามแชท (ทุกหน้า)                    = ถังเดียว: 1 ฟรี +2 จากแชร์ (bonus) ← ไฟล์นี้
//   เกินนั้น                               = เครดิต (1 เครดิต/คำถาม)
//
// 🔴 ต้องล็อกอินเท่านั้น — ไม่มี cookie fallback อีกแล้ว (ปิดรูรั่วล้าง cookie ทั้งระบบ)
//    นับที่ chat_usage_e bucket "questions" (+ bonus จากรางวัลแชร์/คอมเมนต์ ผ่าน add_chat_bonus)

/** คำถามฟรีเริ่มต้นต่อบัญชี — ผูกกับโมเมนต์เปิดการ์ด Logic 1 ครั้งแรก */
export const FREE_QUESTIONS_TOTAL = 1;

/** bucket เดียวของคำถามแชททุกหน้า (แทน "plan" และ "logic:<id>" เดิมสำหรับแชท) */
export const QUESTIONS_BUCKET = "questions";

export interface QuestionPoolCheck {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number; // FREE + bonus
}

/** ตรวจถังคำถามฟรี — bonus มาจากรางวัล (แชร์ +2, คอมเมนต์ ฯลฯ) */
export function checkQuestionPool(used: number, bonus = 0): QuestionPoolCheck {
  const u = Math.max(0, Math.floor(Number.isFinite(used) ? used : 0));
  const b = Math.max(0, Math.floor(Number.isFinite(bonus) ? bonus : 0));
  const limit = FREE_QUESTIONS_TOTAL + b;
  const remaining = Math.max(0, limit - u);
  return { allowed: remaining > 0, used: u, remaining, limit };
}

/** ข้อความเมื่อคำถามฟรีหมด — ตรงไปตรงมา บอกทางไปต่อ (เครดิต/เติมเงิน) · UI แสดงปุ่มไป /account เอง */
export function questionPoolExhaustedMessage(): string {
  return "คำถามฟรีของคุณหมดแล้วค่ะ 🙏 ถามต่อได้ด้วยเครดิต (คำถามละ 1 เครดิต) — เติมเครดิตได้ที่หน้าบัญชี";
}

/** ข้อความเมื่อยังไม่ล็อกอิน — คำถามแชทต้องมีบัญชีเสมอ (ถังนับต่อคน) */
export function questionNeedsLoginMessage(): string {
  return `เข้าสู่ระบบเพื่อรับคำถามฟรี ${FREE_QUESTIONS_TOTAL} ข้อจากแม่หมอลาลา ลักกี้ค่ะ 🐾`;
}
