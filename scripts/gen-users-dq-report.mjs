// สร้าง Data Quality Report จากไฟล์ export ตาราง users ของ Platform D
// ใช้: node scripts/gen-users-dq-report.mjs "<path/to/users_rows.csv>"
// ผลลัพธ์: data/sensitive/users_data_quality_report.md (โฟลเดอร์นี้ถูก .gitignore ไว้แล้ว
//          เพราะรายงานมี dvjId + วันเกิดของผู้ใช้จริง)

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
  console.error("ระบุ path ของ users_rows.csv เช่น:\n  node scripts/gen-users-dq-report.mjs ~/Downloads/users_rows.csv");
  process.exit(1);
}

// --- CSV parser รองรับ quoted field ---
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const rows = parseCsv(readFileSync(src, "utf-8"));

const TH_DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]; // Mon..Sun
const DAY_ELEMENT = { อังคาร: "ไฟ", อาทิตย์: "ไฟ", จันทร์: "น้ำ", ศุกร์: "น้ำ", พุธ: "ลม", เสาร์: "ดิน" };
const CN_BY_DIGIT = { 6: "ไฟ", 7: "ไฟ", 8: "ดิน", 9: "ดิน", 4: "ไม้", 5: "ไม้", 2: "น้ำ", 3: "น้ำ", 0: "ทอง", 1: "ทอง" };

const parseCE = (dob) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || "");
  if (!m) return null;
  const y = +m[1];
  if (y > 2400) return null; // พ.ศ.
  const d = new Date(Date.UTC(y, +m[2] - 1, +m[3]));
  return isNaN(d) ? null : d;
};

// ---- รวบรวมปัญหา ----
const beRows = [], corruptRows = [], negAge = [], dupMap = new Map();
const cnMismatch = [], thMismatch = [], pctOff = [];
let thursday = 0, ceOk = 0;

for (const r of rows) {
  const dob = r.dob || "";
  const ym = /^(\d+)-/.exec(dob);
  if (ym) {
    const y = +ym[1];
    if (y > 2600) corruptRows.push(r);
    else if (y > 2400) beRows.push(r);
  }
  if (r.age && Number(r.age) < 0) negAge.push(r);
  dupMap.set(r.full_name, (dupMap.get(r.full_name) || 0) + 1);

  const d = parseCE(dob);
  if (d) {
    ceOk++;
    const exp = CN_BY_DIGIT[d.getUTCFullYear() % 10];
    const got = (r.chinese_element || "").replace("ธาตุ", "").split(" ")[0].trim();
    if (got !== exp) cnMismatch.push({ ...r, _y: d.getUTCFullYear(), _got: got, _exp: exp, _month: d.getUTCMonth() + 1 });
  }
  if (r.day_of_week === "พฤหัสบดี") thursday++;
  else {
    const exp = DAY_ELEMENT[r.day_of_week];
    const got = (r.thai_element || "").replace("ธาตุ", "").trim();
    if (exp && got !== exp) thMismatch.push(r);
  }
  const s = ["name_fire_pct", "name_earth_pct", "name_wind_pct", "name_water_pct"]
    .reduce((a, c) => a + (Number(r[c]) || 0), 0);
  if (s !== 100) pctOff.push({ id: r.id, sum: s });
}

const dups = [...dupMap.entries()].filter(([, n]) => n > 1);
const emptyCols = Object.keys(rows[0]).filter((c) => rows.every((r) => !r[c]));
const zodiacFilled = rows.filter((r) => r.zodiac_animal).length;

const list = (arr, f, n = 20) => arr.slice(0, n).map(f).join("\n");

const md = `# Data Quality Report — ตาราง \`users\` (Platform D)

> สร้างอัตโนมัติโดย \`scripts/gen-users-dq-report.mjs\` · ตรวจ ${rows.length} แถว
> ⚠️ ไฟล์นี้มี dvjId + วันเกิดของผู้ใช้จริง — อยู่ใน \`data/sensitive/\` ซึ่ง .gitignore กันไว้แล้ว **ห้าม commit**

## สรุปผู้บริหาร

| # | ปัญหา | จำนวน | ความรุนแรง | ต้องแก้ที่ |
|---|---|---|---|---|
| 1 | \`dob\` เก็บเป็น **พ.ศ.** ปนกับ ค.ศ. | ${beRows.length}/${rows.length} | 🔴 วิกฤต | **Platform D** |
| 2 | \`dob\` เสียหาย (ปีไม่สมเหตุผล) | ${corruptRows.length}/${rows.length} | 🔴 วิกฤต | **Platform D** |
| 3 | \`age\` ติดลบ (ผลจาก #1, #2) | ${negAge.length}/${rows.length} | 🟠 สูง | **Platform D** (คำนวณใหม่) |
| 4 | \`zodiac_animal\` ว่าง | ${rows.length - zodiacFilled}/${rows.length} | 🟠 สูง | **Platform D** |
| 5 | ข้อมูลซ้ำ (คนเดียวหลายแถว) | ${rows.length} แถว = ${dupMap.size} คน | 🟡 กลาง | **Platform D** |
| 6 | \`name_*_pct\` รวมไม่ครบ 100 | ${pctOff.length}/${rows.length} | 🟢 ต่ำ | (ปัดเศษ — ยอมรับได้) |
| 7 | คอลัมน์ว่างทั้งตาราง | ${emptyCols.length} คอลัมน์ | 🟢 ต่ำ | ตรวจว่ายังใช้ไหม |
| 8 | \`chinese_element\` ต่างจากสูตรของเรา | ${cnMismatch.length}/${ceOk} | 🔴 วิกฤต | **Platform E (เรา)** ← ดู §B |
| 9 | \`thai_element\` ไม่ใช่ธาตุประจำวัน | ${thMismatch.length}/${rows.length - thursday} | 🟠 สูง | **ต้องสอบถามนิยาม** |

---

## A. ปัญหาที่ต้องแก้ที่ต้นทาง (Platform D)

### A1. 🔴 \`dob\` ปน พ.ศ. กับ ค.ศ. — ${beRows.length} แถว

ผู้ใช้บางคนกรอกปีเกิดเป็นพุทธศักราช แต่ระบบเก็บลงคอลัมน์เดียวกับ ค.ศ. โดยไม่แปลง

${list(beRows, (r) => `- \`${r.id}\` → \`${r.dob}\` (age = ${r.age})`)}

**ผลกระทบ:** Platform E ทุกเอนจินรับ \`birth_year_ad\` (ค.ศ.) — ป้อนปี พ.ศ. เข้าไปจะได้
ธาตุ/ลัคนา/ดวงผิดทั้งหมด **แบบไม่ error** (คำนวณได้ปกติแต่ค่าผิด) เป็นความผิดพลาดชนิดที่ตรวจจับยากที่สุด

**เสนอให้แก้:**
1. ต้นทาง: validate ตอนรับ input — ถ้าปี > 2400 ให้ลบ 543 หรือให้ผู้ใช้ยืนยัน
2. ย้อนหลัง: แปลง ${beRows.length} แถวนี้ (ปี − 543) แล้วคำนวณ \`age\` ใหม่
3. ป้องกัน: ใส่ CHECK constraint ว่าปีต้องอยู่ในช่วง 1900–ปีปัจจุบัน

### A2. 🔴 \`dob\` เสียหาย — ${corruptRows.length} แถว

${list(corruptRows, (r) => `- \`${r.id}\` → \`${r.dob}\` (age = ${r.age}) ← ปีไม่สมเหตุผล`)}

### A3. 🟠 \`age\` ติดลบ — ${negAge.length} แถว
ช่วงค่า ${Math.min(...negAge.map((r) => +r.age))} ถึง ${Math.max(...negAge.map((r) => +r.age))} — เป็นผลพลอยจาก A1/A2
ควรคำนวณ \`age\` จาก \`dob\` ใหม่หลังแก้ (หรือเลิกเก็บ แล้วคำนวณตอน query แทน)

### A4. 🟠 \`zodiac_animal\` ว่าง ${rows.length - zodiacFilled}/${rows.length} แถว
Element Seed ของ Platform E ใช้ปีนักษัตรเป็น **Source 4 จาก 5 แหล่ง** — ถ้าไม่มี ระบบจะข้าม
ทำให้คะแนนธาตุมาจาก 4 แหล่งแทน 5 (ผลลัพธ์ยังใช้ได้แต่หยาบกว่า)
ปีนักษัตรคำนวณจาก \`dob\` ได้อยู่แล้ว — ควร backfill

### A5. 🟡 ข้อมูลซ้ำ — ${rows.length} แถว แต่มีแค่ ${dupMap.size} ชื่อไม่ซ้ำ
${list(dups.sort((a, b) => b[1] - a[1]), ([n, c]) => `- ซ้ำ ${c} ครั้ง (ชื่อถูกปกปิดในรายงานนี้)`, 10)}
น่าจะเป็นการทดสอบซ้ำ — ควรมี dedupe strategy (เช่น unique key ที่ full_name + dob) ก่อนนำไปวิเคราะห์สถิติ

### A6. 🟢 คอลัมน์ที่ว่างทั้ง ${rows.length} แถว
\`${emptyCols.join("`, `")}\`
ถ้าไม่ได้ใช้แล้วควรถอดออกจาก schema; ถ้ายังต้องใช้แสดงว่า pipeline ไม่ได้เก็บค่า

---

## B. 🔴 ปัญหาที่ต้องแก้ฝั่งเรา (Platform E) — ไม่ใช่ความผิดของ D

### B1. \`chineseWuxingByYearEndDigit()\` ไม่ได้คิดขอบเขต "ตรุษจีน"

เอนจินเรา (\`lib/engine/element.ts\` / \`kruth_element_engine.py\`) หาธาตุจีนจาก **เลขท้ายปี ค.ศ.** ตรงๆ
แต่ปีจีนไม่ได้เริ่ม 1 ม.ค. — เริ่มที่**ตรุษจีน** (ปลาย ม.ค.–กลาง ก.พ.) คนเกิดก่อนตรุษจีนต้องใช้ธาตุของ**ปีก่อนหน้า**

พบไม่ตรงกัน ${cnMismatch.length} แถว และ**ทุกแถวเป็นคนเกิดเดือนมกราคม**:

${list(cnMismatch, (r) => `- \`${r.id}\` เกิด ${r.dob} → D เก็บ \`${r._got}\` · สูตรเรา \`${r._exp}\``)}

ส่วนคนเกิดเดือน ก.พ. (หลังตรุษจีน) **ตรงกันทุกแถว** → หลักฐานชี้ชัดว่า **D ถูก เราผิด**

**⚠️ ยังไม่แก้** — ตาม CLAUDE.md §4/§5 ห้ามเปลี่ยนสูตรเองโดยไม่ถามเจ้าของระบบ
ถ้าจะแก้ต้องเพิ่มตารางวันตรุษจีนรายปี (หรือสูตรคำนวณ) เข้าไปในเอนจิน แล้ว regenerate golden fixtures

### B2. ตาราง \`DAY_ELEMENT\` ไม่มี "วันพฤหัสบดี"

\`DAY_ELEMENT\` มีแค่ 6 วัน (อังคาร/อาทิตย์=ไฟ, จันทร์/ศุกร์=น้ำ, พุธ=ลม, เสาร์=ดิน) — **ขาดวันพฤหัสบดี**
ทำให้คนเกิดวันพฤหัสฯ ถูกข้าม Source 1 ของ Element Seed เงียบๆ

ในชุดข้อมูลนี้มีคนเกิดวันพฤหัสบดี **${thursday}/${rows.length} แถว (${((thursday / rows.length) * 100).toFixed(0)}%)** — ไม่ใช่เคสหายาก

**⚠️ ยังไม่แก้** — ต้องตรวจกับตำราต้นฉบับก่อนว่าวันพฤหัสฯ ควรเป็นธาตุอะไร (อย่าเดา)

### B3. 🟠 \`thai_element\` ของ D ≠ ธาตุประจำวันเกิด

ไม่ตรงกัน ${thMismatch.length}/${rows.length - thursday} แถว และคนเกิดวันพฤหัสฯ ก็ได้ค่าหลากหลาย (น้ำ/ดิน/ลม/ไฟ)
→ แปลว่า \`users.thai_element\` ของ D **คำนวณจากกฎอื่น** ไม่ใช่ธาตุประจำวัน

**ต้องสอบถามทีม D ว่านิยามคืออะไร** ก่อนที่ Platform E จะนำฟิลด์นี้ไปใช้ —
ถ้าเอาไปใช้โดยเข้าใจผิดว่าเป็นธาตุประจำวัน จะได้ผลลัพธ์ผิดทันที

---

## C. สิ่งที่ตรวจแล้ว "ถูกต้อง" ✅

- **\`day_of_week\` ตรงกับวันในสัปดาห์ของ \`dob\` ครบ ${ceOk}/${ceOk} แถว** ที่ตรวจได้ — ฟิลด์นี้เชื่อถือได้
- \`chinese_element\` ของ D คิดขอบเขตตรุษจีนถูกต้อง (ดู B1)
- \`pdpa_consent\`, \`is_anonymous\` มีค่าครบทุกแถว

---

## D. ข้อเสนอเชิงระบบ (ไม่ว่าต้นทางจะแก้หรือไม่)

Platform E ควรมี **defensive normalization layer** ก่อนส่งข้อมูลเข้าเอนจิน เพราะข้อมูลเสียอาจไหลเข้ามาอีก:

\`\`\`ts
// lib/normalize-birth.ts (ยังไม่ได้สร้าง — ข้อเสนอ)
// - ปี > 2400 → ลบ 543 (พ.ศ. → ค.ศ.)
// - ปีนอกช่วง 1900..ปีปัจจุบัน → โยน error ไม่คำนวณต่อ (อย่าคำนวณเงียบๆ)
// - zodiac_animal ว่าง → คำนวณจากปีเกิดแทนการข้าม
\`\`\`

หลักการ: **ถ้าข้อมูลเข้าไม่น่าเชื่อถือ ให้ล้มเสียงดัง (fail loudly) ดีกว่าคืนคำทำนายที่ผิดแบบเงียบๆ**
`;

const out = join(ROOT, "data", "sensitive", "users_data_quality_report.md");
writeFileSync(out, md, "utf-8");
console.log("✅ เขียนรายงานแล้ว:", out);
console.log(`   ตรวจ ${rows.length} แถว | ปัญหาต้นทาง(D): A1=${beRows.length} A2=${corruptRows.length} A3=${negAge.length} A4=${rows.length - zodiacFilled}`);
console.log(`   ปัญหาฝั่งเรา(E): B1=${cnMismatch.length} B2=${thursday} แถวได้รับผลกระทบ B3=${thMismatch.length}`);
