// Golden fixtures สำหรับ card-id engine
//
// 🔴 อัปเดต 6 ส.ค. 2569: namePower เปลี่ยนเป็นตารางทางการ Calculation_Constants (นับสระ/
// วรรณยุกต์ด้วย — ผู้ใช้ตัดสิน "นับสระทุกจุด") จึง **เลิก parity กับ prototype ใน
// intake_form.html สำหรับ namePower/computeCardId โดยเจตนา** (prototype นับเฉพาะพยัญชนะ)
// — ไฟล์นี้มี implementation อิสระของตารางทางการ (เขียนแยกจาก lib/engine/card-id.ts)
//   ใช้เป็น cross-check ว่าสอง implementation ตีความตาราง+กฎ "อ" ตรงกัน
// — digitSum/reduceTo99 ยังเทียบกับ prototype เดิม (สูตรไม่เปลี่ยน)
// รัน: node tests/fixtures/gen_cardid_fixtures.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = readFileSync(join(ROOT, "legacy-artifacts", "intake_form.html"), "utf-8");

// prototype เดิม — ใช้เฉพาะ digitSum/reduceTo99 (namePower ของมันล้าสมัยแล้ว)
const start = html.indexOf("const CHAR_GROUPS");
const endMarker = "// ---- L2 entity list ----";
const end = html.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error("หาบล็อก computeCardId ใน intake_form.html ไม่เจอ");
const factory = new Function(`${html.slice(start, end)}; return { digitSum, reduceTo99 };`);
const proto = factory();

// ---- implementation อิสระของตารางทางการ (Calculation_Constants — Name_Numerology) ----
const VALUES = {};
const groups = {
  1: "กดถทภฤAJSุาำ้", 2: "ขชบปงBKTู่", 3: "ฆตฑฒCLUิ", 4: "คธรญษDMVโเแ",
  5: "ฉณฌนมหฎฮฬENW", 6: "จลวอFOXใั", 7: "ซศสGPY", 8: "ยผฝพฟHQZ", 9: "ฏฐIRไ์",
};
for (const [g, chars] of Object.entries(groups)) for (const ch of chars) VALUES[ch] = Number(g);

const LEADING = new Set("เแโใไ");
const MARKS = new Set("ัิีึืุู่้๊๋็์ำ");
const isThai = (ch) => ch >= "ก" && ch <= "๛";

function namePowerOfficial(name) {
  const chars = [...name.toUpperCase()];
  let sum = 0;
  chars.forEach((ch, i) => {
    if (ch === "อ") {
      const prev = i > 0 ? chars[i - 1] : "";
      const next = i + 1 < chars.length ? chars[i + 1] : "";
      if (prev === "ื") return;
      sum += i === 0 || !isThai(prev) || LEADING.has(prev) || MARKS.has(next) ? 6 : 4;
    } else if (VALUES[ch] !== undefined) sum += VALUES[ch];
  });
  return sum;
}

const digitSum = (n) => String(Math.abs(Math.round(n))).split("").reduce((a, d) => a + Number(d), 0);
const reduceTo99 = (n) => { let x = Math.abs(Math.round(n)); while (x > 99) x = digitSum(x); return x; };

function computeCardIdOfficial({ firstName, lastName, birthDate, birthTime }) {
  const [y, mo, da] = birthDate.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1, da));
  const birthPower = digitSum(da) + digitSum(mo) + digitSum(y);
  const dayPower = d.getUTCDay() + 1;
  let timePower = 0;
  if (birthTime) {
    const [hh, mm] = birthTime.split(":").map(Number);
    if (!Number.isNaN(hh) && !Number.isNaN(mm)) timePower = digitSum(hh) + digitSum(mm);
  }
  return reduceTo99(birthPower + dayPower + timePower + namePowerOfficial(firstName + lastName));
}

const cases = [
  { firstName: "วุฒิ์ธิระ", lastName: "ครุฑขุนทด", birthDate: "1986-10-07", birthTime: "09:30" },
  { firstName: "เบญจมาศ", lastName: "แต้มพุดซา", birthDate: "1988-12-31", birthTime: "" },
  { firstName: "ธิดารัตน์", lastName: "คิม", birthDate: "2003-10-21", birthTime: "14:00" },
  { firstName: "Nirawit", lastName: "Ridngam", birthDate: "2001-07-07", birthTime: "" },
  { firstName: "กชกร", lastName: "บุญเรือง", birthDate: "1988-08-29", birthTime: "23:59" },
  { firstName: "ก", lastName: "ก", birthDate: "2000-01-01", birthTime: "00:00" },
];

const fix = {
  card_ids: cases.map((c) => ({ input: c, expected: computeCardIdOfficial(c) })),
  name_power: {
    // ครอบทั้งสระ + กฎ "อ" ทุกบริบท (พยัญชนะต้นคำ/หลังสระหน้า/มีรูปเกาะ/สระออ/หลัง ื)
    "วุฒิ์ธิระครุฑขุนทด": namePowerOfficial("วุฒิ์ธิระครุฑขุนทด"),
    NirawitRidngam: namePowerOfficial("NirawitRidngam"),
    สมชาย: namePowerOfficial("สมชาย"),
    อร: namePowerOfficial("อร"),
    เอก: namePowerOfficial("เอก"),
    อ่าน: namePowerOfficial("อ่าน"),
    สมอ: namePowerOfficial("สมอ"),
    นอน: namePowerOfficial("นอน"),
    มือ: namePowerOfficial("มือ"),
    "": namePowerOfficial(""),
  },
  digit_sum: { 1986: proto.digitSum(1986), 0: proto.digitSum(0), 99: proto.digitSum(99) },
  reduce_to_99: { 100: proto.reduceTo99(100), 999: proto.reduceTo99(999), 42: proto.reduceTo99(42) },
};

writeFileSync(join(ROOT, "tests", "fixtures", "cardid.fixture.json"), JSON.stringify(fix, null, 2), "utf-8");
console.log("✅ wrote cardid.fixture.json (ตารางทางการ + cross-check อิสระ)");
console.log("   ตัวอย่าง:", fix.card_ids.map((c) => `${c.input.firstName}=${c.expected}`).join(", "));
console.log("   name_power:", JSON.stringify(fix.name_power));
