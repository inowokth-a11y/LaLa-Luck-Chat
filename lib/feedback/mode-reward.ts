// เครดิตทดลองจากความเห็นรายโหมด (ผู้ใช้เคาะ 6 ก.ย. 2569) — ตรรกะล้วน เทสต์ได้
//
// วงจรช่วงทดลอง (ยังเชื่อมจ่ายเงินไม่ได้): ใช้โหมด → ให้ความเห็น → รับ 20 เครดิต →
// ลิงก์พาไปลองโหมดที่ยังไม่ได้ลอง → วนต่อ · เพดานเชิงโครงสร้าง = ครั้งเดียวต่อโหมดต่อบัญชี
// (10 โหมด × 20 = 200 เครดิตสูงสุด ≈ ต้นทุน AI จริง ~฿4-8/คน — งบทดลองที่คุมได้)
//
// กันฟาร์ม: บัญชีถาวรเท่านั้น (guest ชวนผูกบัญชี) · ครั้งเดียวต่อ prompt (unique logic_id
// = ครั้งเดียวต่อโหมด) · ความเห็น ≥ MIN_REWARD_TEXT ตัวอักษร · โหมดที่มีหลักฐานการใช้ฝั่ง
// server (ฝัน/เสี่ยงทาย/เนื้อคู่) ต้องใช้จริงก่อน — โหมดคำนวณฝั่ง client (฿0) ไม่มีบันทึก
// จึงพึ่งชั้นอื่นแทน (ประกาศตรงๆ ไม่แกล้งเช็คสิ่งที่เช็คไม่ได้)

export const MODE_FEEDBACK_REWARD = 20;
export const MIN_REWARD_TEXT = 20;

export interface FeedbackMode {
  logicId: number;
  labelTh: string;
  path: string;
  emoji: string;
  /** มีหลักฐานการใช้ฝั่ง server (chat_usage_e bucket logic:X) — ต้องใช้จริงก่อนรับรางวัล */
  verifiable: boolean;
}

export const FEEDBACK_MODES: readonly FeedbackMode[] = [
  { logicId: 1, labelTh: "โปรไฟล์พลังงาน", path: "/profile", emoji: "🎴", verifiable: false },
  { logicId: 8, labelTh: "ดวงของฉัน", path: "/fortune", emoji: "🔮", verifiable: false },
  { logicId: 4, labelTh: "ทำนายฝัน", path: "/dream", emoji: "🌙", verifiable: true },
  { logicId: 21, labelTh: "เสี่ยงทาย", path: "/oracle", emoji: "🎡", verifiable: true },
  { logicId: 17, labelTh: "ความรักและเนื้อคู่", path: "/soulmate", emoji: "💞", verifiable: true },
  { logicId: 20, labelTh: "ทำนายแบบองค์รวม", path: "/compatibility", emoji: "🕸", verifiable: false },
  { logicId: 7, labelTh: "ฮวงจุ้ย", path: "/fengshui", emoji: "🧭", verifiable: false },
  { logicId: 3, labelTh: "หาฤกษ์ดี", path: "/timing", emoji: "📅", verifiable: false },
  { logicId: 16, labelTh: "ดูแลสุขภาวะ", path: "/wellness", emoji: "🌿", verifiable: false },
  { logicId: 19, labelTh: "สร้างโลโก้", path: "/logo", emoji: "🎨", verifiable: false },
];

export function feedbackModeById(logicId: number): FeedbackMode | null {
  return FEEDBACK_MODES.find((m) => m.logicId === logicId) ?? null;
}

/** โหมดที่ยังไม่ได้ให้ความเห็น (= ยังรับเครดิตได้) — ใช้สร้างลิงก์ชวนลองต่อ */
export function untriedModes(claimedLogicIds: readonly number[], excludeLogicId?: number): FeedbackMode[] {
  return FEEDBACK_MODES.filter(
    (m) => !claimedLogicIds.includes(m.logicId) && m.logicId !== excludeLogicId
  );
}

export type ModeRewardDecision =
  | { eligible: true }
  | { eligible: false; reasonTh: string };

/** ตัดสินสิทธิ์รับรางวัลโหมด — pure (route เป็นคนหาค่า input จาก DB) */
export function decideModeReward(input: {
  isLoggedIn: boolean;
  isAnonymous: boolean;
  textLength: number;
  alreadyClaimed: boolean;
  /** โหมด verifiable: ใช้จริงแล้วหรือยัง (โหมดอื่นส่ง true เสมอ) */
  usageOk: boolean;
}): ModeRewardDecision {
  if (!input.isLoggedIn) return { eligible: false, reasonTh: "ล็อกอินเพื่อรับเครดิต" };
  if (input.isAnonymous)
    return { eligible: false, reasonTh: "ผูกบัญชีถาวรก่อนรับเครดิต (บัญชีผู้เยี่ยมชมรับรางวัลไม่ได้)" };
  if (input.alreadyClaimed) return { eligible: false, reasonTh: "รับเครดิตของโหมดนี้ไปแล้ว" };
  if (input.textLength < MIN_REWARD_TEXT)
    return { eligible: false, reasonTh: `เล่าอีกนิดนะคะ (อย่างน้อย ${MIN_REWARD_TEXT} ตัวอักษร) ถึงรับเครดิตได้` };
  if (!input.usageOk) return { eligible: false, reasonTh: "ลองใช้โหมดนี้ก่อนแล้วค่อยเล่าความเห็นนะคะ" };
  return { eligible: true };
}
