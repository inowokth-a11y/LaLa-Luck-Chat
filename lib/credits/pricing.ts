// เรทเครดิต — แหล่งความจริงเดียวของราคาทุกฟังก์ชัน (โมเดลซื้อเครดิต หักตามการใช้ แบบ Higgsfield)
//
// 🔴 กฎกำไรที่ผู้ใช้ตั้ง: กำไรขั้นต่ำ 500% = ราคาขาย ≥ 6× ต้นทุน (MIN_PROFIT_MULTIPLIER)
// 🔴 คิดเครดิตต่อ action จาก "ค่าเครดิตที่ถูกที่สุด" (แพ็กใหญ่สุด) → ทุกแพ็กการันตี ≥500%
//    (ถ้าคิดจากราคาป้าย แพ็กที่มีโบนัสจะทำให้ของแพงหลุดต่ำกว่า 500%)
//
// ต้นทุนต่อ action = วัดจริงจาก API (CLAUDE.md §15) · รูปภาพ = ราคา fal จริง (Recraft V3 / FLUX)
// ⚠️ ต้นทุน AI เปลี่ยนได้ตามเรต/โมเดล — ทบทวนเรทเมื่อราคาต้นทางขยับ

export const USD_THB = 36;
/** กำไรขั้นต่ำ 500% → ราคาขายต้อง ≥ 6 เท่าของต้นทุน */
export const MIN_PROFIT_MULTIPLIER = 6;

export interface ActionRate {
  key: string;
  label: string;
  /** ต้นทุนจริงต่อครั้ง (บาท) */
  costThb: number;
  /** หักกี่เครดิต (0 = ฟรี — แม่เหล็กดึงผู้ใช้ §12) */
  credits: number;
  category: "free" | "chat" | "oracle" | "logo" | "dream";
  note?: string;
}

// ต้นทุนอ้างอิงของฝันตอนปลุก AI-1 — ไม่ใช่ราคาขายต่อคน แต่คือ "ต้นทุนสร้างคลังความรู้"
// (พอค้นเสร็จ แคชถาวรให้ทุกคนที่ถามคำเดียวกัน) → ฝันคิดเรทตามต้นทุนแคช ไม่ใช่ตัวนี้ (§12)
export const DREAM_AI1_BUILD_COST_THB = 7.46;

export const ACTION_RATES: ActionRate[] = [
  // ---- ฟรี: ต้นทุน ฿0 (ไม่ใช้ AI) — แม่เหล็กดึงผู้ใช้ ----
  { key: "profile", label: "โปรไฟล์พลังงาน", costThb: 0, credits: 0, category: "free" },
  { key: "fortune", label: "ดวงของฉัน", costThb: 0, credits: 0, category: "free" },
  { key: "compatibility", label: "ข่ายความสัมพันธ์", costThb: 0, credits: 0, category: "free" },
  { key: "fengshui", label: "ฮวงจุ้ย", costThb: 0, credits: 0, category: "free" },
  { key: "naming_text", label: "ตั้งชื่อ/คำ prompt โลโก้ (ข้อความ)", costThb: 0, credits: 0, category: "free", note: "engine ล้วน ไม่ใช้ AI" },

  // ---- แชท: หักต่อคำถาม ----
  { key: "chat_question", label: "ถามแชท 1 คำถาม (ทุกฟังก์ชัน)", costThb: 0.18, credits: 1, category: "chat",
    note: "วัดใหม่ 3 ส.ค. 2569 หลังสลับผู้เล่าเรื่องเป็น Gemini Flash (ทาง ค): planner Haiku ฿0.14 + Flash ฿0.04 · เดิม gpt-5.5 รวม ฿0.76 หลุดกฎ 500%" },

  // ---- Oracle: หมวดแยก ----
  { key: "oracle", label: "เสี่ยงทายวงแหวนคู่", costThb: 0.76, credits: 2, category: "oracle" },

  // ---- ฝัน ----
  { key: "dream", label: "ทำนายฝัน", costThb: 0.69, credits: 2, category: "dream",
    note: "คิดตามต้นทุนแคช · AI-1 ที่ปลุกครั้งแรกถือเป็นต้นทุนสร้างคลัง (แคชถาวร)" },

  // ---- โลโก้: หมวดแยก ----
  { key: "logo_preview", label: "โลโก้ตัวอย่าง (FLUX)", costThb: 0.22, credits: 1, category: "logo" },
  { key: "logo_vector", label: "โลโก้เวกเตอร์ SVG (Recraft V3)", costThb: 2.88, credits: 7, category: "logo",
    note: "เวกเตอร์ ขยายไม่แตก ใช้เชิงพาณิชย์ได้" },
  { key: "label_artwork", label: "พื้นหลังฉลาก AI (Recraft V3)", costThb: 2.88, credits: 7, category: "logo",
    note: "ต้นทุนเดียวกับโลโก้เวกเตอร์ (Recraft V3) จึงเรทเท่ากัน" },
  { key: "vision_motif", label: "อ่านลวดลาย/รูปทรงจากภาพ (AI vision)", costThb: 0.08, credits: 1, category: "logo",
    note: "Haiku 4.5 วัดจริง 30 ก.ค. 2569: ฿0.051 (in 1,084/out 69, ภาพ ~370px) → ตั้ง 0.08 เผื่อภาพเต็ม 768px · แคช hash = ซ้ำฟรี" },
];

export interface CreditPackage {
  priceThb: number;
  credits: number;
  label: string;
}

// แพ็กเติมเครดิต — ยิ่งก้อนใหญ่ยิ่งคุ้ม (โบนัส) แต่ค่าเครดิตต่ำสุดต้องไม่ทำให้ของแพงหลุด 500%
// 🔴 ผู้ใช้เลือก "แบบ ก" 30 ก.ค. 2569: ป้ายราคาลงท้าย 9 ทั้งชุด (เริ่มต้น/โปร/พรีเมียม)
//    แพ็ก ฿15 เดิมถูกแทนที่ — ต่ำกว่าขั้นต่ำ PromptPay ฿20 ของ Omise (ยืนยันจาก API จริง)
export const CREDIT_PACKAGES: CreditPackage[] = [
  { priceThb: 29, credits: 9, label: "เริ่มต้น" }, // ฿3.22/เครดิต
  { priceThb: 59, credits: 21, label: "โปร" }, // ฿2.81/เครดิต (−13%)
  { priceThb: 129, credits: 51, label: "พรีเมียม" }, // ฿2.53/เครดิต (−21%) ← floor (ต้อง ≥ ~฿2.47 ไม่งั้นฉลาก/โลโก้เวกเตอร์หลุด 500%)
];

/**
 * ขั้นต่ำของ PromptPay ฝั่ง Omise = ฿20 (ยืนยันจาก API จริง 30 ก.ค. 2569:
 * "amount must be greater than or equal to ฿20 (2000 satangs)")
 * ✅ คลี่คลายแล้ว: ผู้ใช้เลือกแพ็กแบบ ก (เริ่ม ฿29) ทุกแพ็กพ้นขั้นต่ำ — เก็บตัวกรองไว้
 * ใน route/UI เป็นเข็มขัดนิรภัยเผื่อวันหน้ามีคนเพิ่มแพ็กเล็กโดยลืมข้อจำกัดนี้ (มีเทสต์ล็อกด้วย)
 */
export const PROMPTPAY_MIN_THB = 20;

/** ค่าเครดิต (บาท/เครดิต) ของแพ็กหนึ่ง */
export const creditValueThb = (pkg: CreditPackage): number => pkg.priceThb / pkg.credits;

/** ค่าเครดิตที่ถูกที่สุด (แพ็กใหญ่สุด) — ใช้เป็นฐานตรวจกำไร worst-case */
export const cheapestCreditValueThb = (): number =>
  Math.min(...CREDIT_PACKAGES.map(creditValueThb));

export const actionRate = (key: string): ActionRate | undefined =>
  ACTION_RATES.find((r) => r.key === key);

/** รายได้ต่อ action ที่ค่าเครดิตหนึ่ง (บาท) */
export const revenueThb = (rate: ActionRate, valuePerCredit: number): number =>
  rate.credits * valuePerCredit;

/** ตัวคูณกำไร (รายได้ ÷ ต้นทุน) — Infinity ถ้าต้นทุน 0 */
export function profitMultiplier(rate: ActionRate, valuePerCredit: number): number {
  if (rate.costThb <= 0) return Infinity;
  return revenueThb(rate, valuePerCredit) / rate.costThb;
}

/** กำไรเป็น % (เช่น 6 เท่า = 500%) */
export const profitPercent = (rate: ActionRate, valuePerCredit: number): number =>
  Math.round((profitMultiplier(rate, valuePerCredit) - 1) * 100);
