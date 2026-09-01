// คำนวณเลขการ์ด Master Energy 00-99 (Track A)
// พอร์ตจาก legacy-artifacts/intake_form.html (ฟังก์ชัน computeCardId ในแท็ก <script>)
//
// ⚠️ สูตรนี้เป็น "การตัดสินใจสำคัญ" ตาม CLAUDE.md §4.1 — ห้ามเปลี่ยนเองเด็ดขาด
//
//   ใช้ "สูตร A" = BirthPower + DayPower + TimePower + NamePower  (Prompt_Lala_Lucky)
//   ผู้ใช้ยืนยันเลือกสูตรนี้ (ก.ค. 2569) ตามข้อยกเว้นใน §4.1: ระบบเดิมที่ deploy อยู่ใช้สูตรนี้
//   และผลออกมาดี จึงคงไว้ให้การ์ดของผู้ใช้เดิมไม่เปลี่ยน
//
//   🔴 อัปเดต 6 ส.ค. 2569 (ผู้ใช้ตัดสิน): NamePower นับสระ/วรรณยุกต์ด้วยตามตารางทางการ
//   Calculation_Constants + สเปก ง.2 "แปลงตัวอักษรทั้งหมด" — จุดนี้ทำให้ค่า namePower
//   ต่างจาก prototype ใน intake_form.html (ซึ่งนับเฉพาะพยัญชนะ+อังกฤษ) โดยเจตนา
//   ผู้ใช้รับทราบแล้วว่าการ์ดของผู้ใช้เดิมที่ชื่อมีสระจะเปลี่ยนใบ
//
//   (ทางเลือกที่ไม่ได้ใช้: "สูตร B" = BirthPower ล้วน ตามที่ตำราภาคผนวกระบุ —
//    ให้ผลต่างกันคนละใบ เช่น 1986-10-07 → สูตร A ได้ 84, สูตร B ได้ 32)
//
// หมายเหตุ: การ์ด 00-99 เป็น archetype/เรื่องราวเท่านั้น **ไม่ใช่ตัวกำหนดธาตุ** (§4.3)
// ธาตุจริงมาจาก calculateElementSeed() ใน element.ts

const CHAR_GROUPS: Record<number, string> = {
  1: "กดถทภฤAJS", 2: "ขชบปงBKT", 3: "ฆตฑฒCLU", 4: "คธรญษDMV",
  5: "ฉณฌนมหฎฮฬENW", 6: "จลวอFOX", 7: "ซศสGPY", 8: "ยผฝพฟHQZ", 9: "ฏฐIR",
};

// ค่าสระ/วรรณยุกต์ตามตารางทางการ Calculation_Constants (Name_Numerology) — ผู้ใช้ตัดสิน
// 6 ส.ค. 2569 ให้ "นับสระทุกจุด" ตามสเปก ง.2 ("แปลงตัวอักษรทั้งหมด") — ยอมรับว่าการ์ด
// ของผู้ใช้เดิมเปลี่ยนใบ เพราะยังช่วงเปิดตัว ผู้ใช้น้อย เปลี่ยนตอนนี้เจ็บน้อยสุด
// ✅ อักขระที่ตารางเดิมไม่มี เจ้าของตำราให้ค่ามาแล้ว 7 ตัว (7 ส.ค. 2569 — จัดตามตระกูลฐานสระ
//    และลำดับวรรณยุกต์): ี ึ = ตระกูลสระอิ (3) · ื = ตระกูลสระเอือ (2) · ะ = ตระกูลสระอา (1) ·
//    ็ = ตระกูลไม้หันอากาศ (6) · ๊ ไม้ตรี = ลำดับที่ 3 · ๋ ไม้จัตวา = ลำดับที่ 4
// ⚠️ สระประสม (เ-ือ / เ-ีย) ยังตีความเป็น "รายอักขระ" — เจ้าของตำราให้ค่า ื = 2 โดยอนุมานจาก
//    รายการ "เือ = 2" ในตาราง และระบุว่าการนับ เ-ีย แบบแยกรูป (เ+ี+ย) เป็นทางที่ยอมรับได้
//    → ระบบจึงนับทุกอักขระตามค่าของตัวเอง (เ4 + ื2 ...) ไม่ยุบเป็นค่าเดียว
const VOWEL_VALUES: Record<string, number> = {
  "ุ": 1, "า": 1, "ำ": 1, "้": 1, "ะ": 1, // สระอุ สระอา สระอำ ไม้โท สระอะ
  "ู": 2, "่": 2, "ื": 2, // สระอู ไม้เอก สระอือ
  "ิ": 3, "ี": 3, "ึ": 3, "๊": 3, // สระอิ สระอี สระอึ ไม้ตรี
  "โ": 4, "เ": 4, "แ": 4, "๋": 4, // สระโอ สระเอ สระแอ ไม้จัตวา
  "ใ": 6, "ั": 6, "็": 6, // ไม้ม้วน ไม้หันอากาศ ไม้ไต่คู้
  "ไ": 9, "์": 9, // ไม้มลาย การันต์
};

const CHAR_TO_VAL: Record<string, number> = {};
for (const g of Object.keys(CHAR_GROUPS).map(Number).sort((a, b) => a - b)) {
  for (const ch of CHAR_GROUPS[g]) CHAR_TO_VAL[ch] = g;
}
Object.assign(CHAR_TO_VAL, VOWEL_VALUES);

/** สระหน้า (นำหน้าพยัญชนะต้นของพยางค์) */
const LEADING_VOWELS = new Set(["เ", "แ", "โ", "ใ", "ไ"]);
/** รูปสระ/วรรณยุกต์ที่เกาะพยัญชนะ (ใช้ตัดสินบริบทของ "อ") */
const DEPENDENT_MARKS = new Set(["ั", "ิ", "ี", "ึ", "ื", "ุ", "ู", "่", "้", "๊", "๋", "็", "์", "ำ"]);
const isThaiChar = (ch: string) => ch >= "ก" && ch <= "๛";

/**
 * ค่าประจำอักขระรายตำแหน่ง (null = ข้าม) — ตารางทางการมี "อ" สองบทบาท:
 * พยัญชนะอ่าง = 6 · สระออ = 4 · กฎแยกบริบท (deterministic, ประกาศไว้ตรงๆ):
 *   - อ ตามหลัง "ื" → ข้าม (เป็นรูปเดียวกับสระอือ ซึ่งนับค่าไปแล้วที่ "ื" = 2)
 *   - อ ต้นคำ / ตามหลังอักขระที่ไม่ใช่ไทย / ตามหลังสระหน้า (เ แ โ ใ ไ) /
 *     มีรูปสระ-วรรณยุกต์เกาะตามหลัง → พยัญชนะ (6) เช่น อร เอก อ่าน
 *   - นอกนั้น (ตามหลังพยัญชนะ) → สระออ (4) เช่น สมอ นอน
 */
export function officialCharValues(name: string): { ch: string; value: number | null }[] {
  const chars = [...name.toUpperCase()];
  return chars.map((ch, i) => {
    if (ch === "อ") {
      const prev = i > 0 ? chars[i - 1] : "";
      const next = i + 1 < chars.length ? chars[i + 1] : "";
      if (prev === "ื") return { ch, value: null };
      const isConsonant =
        i === 0 || !isThaiChar(prev) || LEADING_VOWELS.has(prev) || DEPENDENT_MARKS.has(next);
      return { ch, value: isConsonant ? 6 : 4 };
    }
    return { ch, value: CHAR_TO_VAL[ch] ?? null };
  });
}

/** ผลรวมค่าประจำตัวอักษรตามตารางทางการ (รวมสระ/วรรณยุกต์ — อักขระที่ตารางไม่มีค่าถูกข้าม) */
export function namePower(name: string): number {
  return officialCharValues(name).reduce((s, c) => s + (c.value ?? 0), 0);
}

export function digitSum(n: number): number {
  return String(Math.abs(Math.round(n)))
    .split("")
    .reduce((a, d) => a + Number(d), 0);
}

/** ลดทอนจนเหลือ 0-99 (หยุดที่ 2 หลัก ไม่ลดต่อเป็นหลักเดียว) */
export function reduceTo99(n: number): number {
  let x = Math.abs(Math.round(n));
  while (x > 99) x = digitSum(x);
  return x;
}

export interface CardIdInput {
  firstName: string;
  lastName: string;
  /** รูปแบบ YYYY-MM-DD */
  birthDate: string;
  /** รูปแบบ HH:MM (ไม่บังคับ — ถ้าไม่ทราบเวลาเกิด timePower = 0) */
  birthTime?: string | null;
}

/**
 * สูตร A (= "พลังงานส่วนบุคคล" สูตรรวมทุกโหมด — ผู้ใช้เคาะ 31 ส.ค. 2569 หลังมีผู้ทดลองยืนยัน):
 * BirthPower + DayPower + TimePower + NamePower → reduce เหลือ 0-99
 * - BirthPower = digitSum(วัน) + digitSum(เดือน) + digitSum(ปี ค.ศ.)
 * - DayPower   = วันในสัปดาห์ (อาทิตย์=1 ... เสาร์=7)
 * - TimePower  = digitSum(ชม.) + digitSum(นาที) **ลดทอนเหลือหลักเดียว** (0 ถ้าไม่ระบุเวลา)
 *   (เปลี่ยน 31 ส.ค. 2569 — เดิมไม่ลดทอน: 18:30 เคยได้ 12 ตอนนี้ได้ 3 → การ์ดบางคนเปลี่ยนใบ)
 * - NamePower  = ผลรวมค่าอักษรของ ชื่อ+นามสกุล (ตาราง Calculation_Constants ที่ verify แล้ว)
 * - ไม่มีข้อยกเว้นเลขตอง/Master Number (ผู้ใช้เคาะ: ลดทอนปกติ — 11/22/33 อยู่ในช่วง 00-99 อยู่แล้ว)
 * - องค์ประกอบที่ไม่มีข้อมูล = 0 (ใช้ผ่าน personalEnergyNumber ในโหมดที่มีแค่วันเกิด)
 */
export function computeCardId(input: CardIdInput): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate);
  if (!m) throw new Error(`birthDate ต้องเป็นรูปแบบ YYYY-MM-DD (ได้รับ: ${input.birthDate})`);
  const [y, mo, da] = [Number(m[1]), Number(m[2]), Number(m[3])];

  // ใช้ UTC เพื่อให้ผลคงที่ทุก timezone (ต้นฉบับใช้ local midnight ซึ่งให้ค่าเดียวกัน)
  const d = new Date(Date.UTC(y, mo - 1, da));
  const birthPower = digitSum(da) + digitSum(mo) + digitSum(y);
  const dayPower = d.getUTCDay() + 1; // อาทิตย์=1 ... เสาร์=7

  let timePower = 0;
  if (input.birthTime) {
    const [hh, mm] = input.birthTime.split(":").map(Number);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) {
      timePower = digitSum(hh) + digitSum(mm);
      while (timePower > 9) timePower = digitSum(timePower); // ลดทอนเหลือหลักเดียว (31 ส.ค. 2569)
    }
  }

  const nPower = namePower(input.firstName + input.lastName);
  return reduceTo99(birthPower + dayPower + timePower + nPower);
}

/**
 * พลังงานส่วนบุคคล 00-99 — สูตรเดียวกับ computeCardId แต่รับข้อมูลเท่าที่มี (ส่วนที่ไม่มี = 0):
 * ใช้กับโหมดที่มีแค่วันเกิด (เลขตัวตนในองค์รวม/บุคคลที่สาม) ตามมติผู้ใช้ 31 ส.ค. 2569
 * "สูตรเดียวทุกโหมด" (แทนที่นิยาม BirthPower ล้วนเดิมของ §4 ข้อ 1)
 */
export function personalEnergyNumber(
  birthDate: string,
  opts?: { name?: string | null; birthTime?: string | null }
): number {
  return computeCardId({
    firstName: opts?.name ?? "",
    lastName: "",
    birthDate,
    birthTime: opts?.birthTime ?? null,
  });
}

/** คืนเลขการ์ดเป็นสองหลักเสมอ ("00"-"99") พร้อมใช้กับ cardImageUrl() */
export function computeCardIdString(input: CardIdInput): string {
  return String(computeCardId(input)).padStart(2, "0");
}

const JS_DAY_TO_THAI = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** วันในสัปดาห์ภาษาไทยจากวันเกิด (ใช้ป้อน Element Seed / Kalakini) */
export function thaiDayOfWeek(birthDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) throw new Error(`birthDate ต้องเป็นรูปแบบ YYYY-MM-DD (ได้รับ: ${birthDate})`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return JS_DAY_TO_THAI[d.getUTCDay()];
}
