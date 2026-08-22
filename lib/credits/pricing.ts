// เรทเครดิต — แหล่งความจริงเดียวของราคาทุกฟังก์ชัน (โมเดลซื้อเครดิต หักตามการใช้ แบบ Higgsfield)
//
// 🔴 กฎกำไรที่ผู้ใช้ตั้ง: กำไรขั้นต่ำ 500% = ราคาขาย ≥ 6× ต้นทุน (MIN_PROFIT_MULTIPLIER)
// 🔴 คิดเครดิตต่อ action จาก "ค่าเครดิตที่ถูกที่สุด" (แพ็กใหญ่สุด) → ทุกแพ็กการันตี ≥500%
//    (ถ้าคิดจากราคาป้าย แพ็กที่มีโบนัสจะทำให้ของแพงหลุดต่ำกว่า 500%)
//
// ต้นทุนต่อ action = วัดจริงจาก API (CLAUDE.md §15) · รูปภาพ = ราคา fal จริง (Recraft V3 / FLUX)
// ⚠️ ต้นทุน AI เปลี่ยนได้ตามเรต/โมเดล — ทบทวนเรทเมื่อราคาต้นทางขยับ

// 🔴 หน่วยเครดิต ×10 (ผู้ใช้ตัดสิน 7 ส.ค. 2569): แพ็กและอัตราหักคูณสิบพร้อมกันทั้งระบบ
//    เหตุผลเชิงจิตวิทยาราคา — "จ่าย ฿29 ได้ 90 เครดิต" รู้สึกได้มากกว่าเงินที่จ่าย
//    ⚠️ อัตราส่วนเงิน:ของ ไม่เปลี่ยนเลย (ค่าเครดิตลดลง 10 เท่าพร้อมกัน) กำไรทุกรายการเท่าเดิม
//    เพิ่มแพ็ก/เรทใหม่ต้องอยู่ในหน่วยเดียวกันนี้ (มีเทสต์ล็อกกำไร ≥500% คอยจับ)
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
  { key: "compatibility", label: "ทำนายแบบองค์รวม", costThb: 0, credits: 0, category: "free" },
  { key: "fengshui", label: "ฮวงจุ้ย", costThb: 0, credits: 0, category: "free" },
  { key: "naming_text", label: "ตั้งชื่อ/คำ prompt โลโก้ (ข้อความ)", costThb: 0, credits: 0, category: "free", note: "engine ล้วน ไม่ใช้ AI" },

  // ---- แชท: หักต่อคำถาม ----
  { key: "chat_question", label: "ถามแชท 1 คำถาม (ทุกฟังก์ชัน)", costThb: 0.35, credits: 10, category: "chat",
    note: "วัดใหม่ 4 ส.ค. 2569: prompt planner โต ~6k token (allowlist 19 fn) → เปิด prompt caching (แคชอุ่น ฿0.04 / เย็น ฿0.33) + Flash ฿0.28 คำตอบโครงเต็ม → เฉลี่ย ~฿0.35" },

  // ---- Oracle: หมวดแยก ----
  { key: "oracle", label: "เสี่ยงทายวงแหวนคู่", costThb: 0.76, credits: 20, category: "oracle" },

  // ---- ทำนายแบบองค์รวม (Logic 20 — ผู้ใช้เคาะ 22 ส.ค. 2569: ฟรี 2 สิ่งรอบตัว · เกิน = คิดต่อครั้ง) ----
  { key: "holistic_network", label: "ทำนายแบบองค์รวม เกิน 2 สิ่งรอบตัว (สูงสุด 10)", costThb: 0, credits: 20, category: "oracle",
    note: "engine ฿0 ล้วน (ขายมูลค่า ไม่ใช่ต้นทุน) · หักครั้งเดียวต่อเซสชันเบราว์เซอร์ — ปรับรายการแล้วทำนายซ้ำไม่หักซ้ำ" },

  // ---- เนื้อคู่ (Logic 17 v1 — ผู้ใช้เคาะราคา 21 ส.ค. 2569: ฟรีครั้งแรก แล้ว 20 เครดิต) ----
  { key: "soulmate", label: "คำทำนายเนื้อคู่", costThb: 0.5, credits: 20, category: "chat",
    note: "engine ฿0 (ลัคนา→ราศีที่ 7 + ข.2) + narrator ~฿0.3-0.5 · ฟรีครั้งแรกผ่าน bucket logic:17" },
  { key: "soulmate_images", label: "ชุดภาพเนื้อคู่ 3 รูป (FLUX)", costThb: 0.66, credits: 30, category: "logo",
    note: "FLUX schnell ฿0.22×3 · ภาพจินตนาการจาก AI มีป้ายกำกับบังคับ ไม่ใช่บุคคลจริง" },

  // ---- ฝัน ----
  { key: "dream", label: "ทำนายฝัน", costThb: 0.69, credits: 20, category: "dream",
    note: "คิดตามต้นทุนแคช · AI-1 ที่ปลุกครั้งแรกถือเป็นต้นทุนสร้างคลัง (แคชถาวร)" },

  // ---- โลโก้: หมวดแยก ----
  { key: "logo_preview", label: "โลโก้ตัวอย่าง (FLUX)", costThb: 0.22, credits: 10, category: "logo" },
  { key: "logo_vector", label: "โลโก้เวกเตอร์ SVG (Recraft V3)", costThb: 2.88, credits: 70, category: "logo",
    note: "เวกเตอร์ ขยายไม่แตก ใช้เชิงพาณิชย์ได้" },
  { key: "label_artwork", label: "พื้นหลังฉลาก AI (Recraft V3)", costThb: 2.88, credits: 70, category: "logo",
    note: "ต้นทุนเดียวกับโลโก้เวกเตอร์ (Recraft V3) จึงเรทเท่ากัน" },
  { key: "vision_motif", label: "อ่านลวดลาย/รูปทรงจากภาพ (AI vision)", costThb: 0.08, credits: 10, category: "logo",
    note: "Haiku 4.5 วัดจริง 30 ก.ค. 2569: ฿0.051 (in 1,084/out 69, ภาพ ~370px) → ตั้ง 0.08 เผื่อภาพเต็ม 768px · แคช hash = ซ้ำฟรี" },
  { key: "face_card", label: "ภาพฉันในบทบาทการ์ด (FLUX PuLID)", costThb: 1.55, credits: 40, category: "logo",
    note: "ฟรี 1 ครั้ง/บัญชีถาวร · เจนซ้ำ 40 เครดิต (ผู้ใช้เคาะ) · ⚠️ costThb ประมาณจากเรท fal ~$0.04/ภาพ + vision ตรวจหน้า ฿0.08 — ยังไม่ verify ราคา fal จริง วัดจาก dashboard fal หลังยิงจริง" },
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
  { priceThb: 29, credits: 90, label: "เริ่มต้น" }, // ฿0.322/เครดิต
  { priceThb: 59, credits: 210, label: "โปร" }, // ฿0.281/เครดิต (−13%)
  { priceThb: 129, credits: 510, label: "พรีเมียม" }, // ฿0.253/เครดิต (−21%) ← floor (ต้อง ≥ ~฿0.247 ไม่งั้นฉลาก/โลโก้เวกเตอร์หลุด 500%)
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
