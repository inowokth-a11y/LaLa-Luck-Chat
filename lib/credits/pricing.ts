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
  { key: "chat_question", label: "ถามแชท 1 คำถาม (ทุกฟังก์ชัน)", costThb: 0.35, credits: 1, category: "chat" },

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
export const CREDIT_PACKAGES: CreditPackage[] = [
  { priceThb: 15, credits: 5, label: "เริ่มต้น" }, // ฿3.00/เครดิต
  { priceThb: 50, credits: 18, label: "คุ้ม" }, // ฿2.78/เครดิต (+7%)
  { priceThb: 100, credits: 40, label: "คุ้มสุด" }, // ฿2.50/เครดิต (+20%) ← ค่าเครดิตต่ำสุด (floor)
];

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
