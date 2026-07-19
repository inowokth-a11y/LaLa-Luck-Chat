// Golden fixtures สำหรับ card-id engine — สกัด JS ต้นฉบับจาก legacy-artifacts/intake_form.html
// มารันจริง แล้วเก็บผลเป็น fixture (แหล่งอ้างอิงคือ artifact ไม่ใช่ Python เหมือน engine อื่น)
// รัน: node tests/fixtures/gen_cardid_fixtures.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const html = readFileSync(join(ROOT, "legacy-artifacts", "intake_form.html"), "utf-8");

// ตัดเอาเฉพาะบล็อกฟังก์ชันที่เกี่ยวกับการคำนวณเลขการ์ด (CHAR_GROUPS ... computeCardId)
const start = html.indexOf("const CHAR_GROUPS");
const endMarker = "// ---- L2 entity list ----";
const end = html.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error("หาบล็อก computeCardId ใน intake_form.html ไม่เจอ");
const src = html.slice(start, end);

// รันโค้ดต้นฉบับใน scope แยก แล้วดึงฟังก์ชันออกมา
const factory = new Function(`${src}; return { computeCardId, namePower, digitSum, reduceTo99 };`);
const proto = factory();

const cases = [
  { firstName: "วุฒิ์ธิระ", lastName: "ครุฑขุนทด", birthDate: "1986-10-07", birthTime: "09:30" },
  { firstName: "เบญจมาศ", lastName: "แต้มพุดซา", birthDate: "1988-12-31", birthTime: "" },
  { firstName: "ธิดารัตน์", lastName: "คิม", birthDate: "2003-10-21", birthTime: "14:00" },
  { firstName: "Nirawit", lastName: "Ridngam", birthDate: "2001-07-07", birthTime: "" },
  { firstName: "กชกร", lastName: "บุญเรือง", birthDate: "1988-08-29", birthTime: "23:59" },
  { firstName: "ก", lastName: "ก", birthDate: "2000-01-01", birthTime: "00:00" },
];

const fix = {
  card_ids: cases.map((c) => ({ input: c, expected: proto.computeCardId(c) })),
  name_power: {
    "วุฒิ์ธิระครุฑขุนทด": proto.namePower("วุฒิ์ธิระครุฑขุนทด"),
    NirawitRidngam: proto.namePower("NirawitRidngam"),
    "": proto.namePower(""),
  },
  digit_sum: { 1986: proto.digitSum(1986), 0: proto.digitSum(0), 99: proto.digitSum(99) },
  reduce_to_99: { 100: proto.reduceTo99(100), 999: proto.reduceTo99(999), 42: proto.reduceTo99(42) },
};

writeFileSync(join(ROOT, "tests", "fixtures", "cardid.fixture.json"), JSON.stringify(fix, null, 2), "utf-8");
console.log("✅ wrote cardid.fixture.json (สกัดจาก intake_form.html โดยตรง)");
console.log("   ตัวอย่าง:", fix.card_ids.map((c) => `${c.input.firstName}=${c.expected}`).join(", "));
