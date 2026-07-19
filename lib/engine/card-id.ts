// คำนวณเลขการ์ด Master Energy 00-99 (Track A)
// พอร์ตจาก legacy-artifacts/intake_form.html (ฟังก์ชัน computeCardId ในแท็ก <script>)
//
// ⚠️ สูตรนี้เป็น "การตัดสินใจสำคัญ" ตาม CLAUDE.md §4.1 — ห้ามเปลี่ยนเองเด็ดขาด
//
//   ใช้ "สูตร A" = BirthPower + DayPower + TimePower + NamePower  (Prompt_Lala_Lucky)
//   ผู้ใช้ยืนยันเลือกสูตรนี้ (ก.ค. 2569) ตามข้อยกเว้นใน §4.1: ระบบเดิมที่ deploy อยู่ใช้สูตรนี้
//   และผลออกมาดี จึงคงไว้ให้การ์ดของผู้ใช้เดิมไม่เปลี่ยน
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

const CHAR_TO_VAL: Record<string, number> = {};
for (const g of Object.keys(CHAR_GROUPS).map(Number).sort((a, b) => a - b)) {
  for (const ch of CHAR_GROUPS[g]) CHAR_TO_VAL[ch] = g;
}

/** ผลรวมค่าประจำตัวอักษร (อักษรที่ไม่อยู่ในตารางถูกข้าม เช่น สระ/วรรณยุกต์) */
export function namePower(name: string): number {
  let sum = 0;
  for (const ch of name.toUpperCase()) {
    if (CHAR_TO_VAL[ch] !== undefined) sum += CHAR_TO_VAL[ch];
  }
  return sum;
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
 * สูตร A: BirthPower + DayPower + TimePower + NamePower → reduce เหลือ 0-99
 * - BirthPower = digitSum(วัน) + digitSum(เดือน) + digitSum(ปี ค.ศ.)
 * - DayPower   = วันในสัปดาห์ (อาทิตย์=1 ... เสาร์=7)
 * - TimePower  = digitSum(ชม.) + digitSum(นาที)  (0 ถ้าไม่ระบุเวลา)
 * - NamePower  = ผลรวมค่าอักษรของ ชื่อ+นามสกุล
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
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) timePower = digitSum(hh) + digitSum(mm);
  }

  const nPower = namePower(input.firstName + input.lastName);
  return reduceTo99(birthPower + dayPower + timePower + nPower);
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
