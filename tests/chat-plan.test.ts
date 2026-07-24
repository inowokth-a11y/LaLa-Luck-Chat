// เทสต์ "แผน JSON" ของ AI Chat แบบยืดหยุ่น (lib/chat/plan.ts) — CLAUDE.md §16
// ⚠️ ไม่ใช่ golden parity — ตรรกะใหม่ ไม่มีต้นฉบับ Python
//
// 🔴 เทสต์ชุดนี้สำคัญกว่าเทสต์ AI: มันคือด่านเดียวที่กั้นระหว่าง "AI พูด" กับ "ระบบรัน"
//    ถ้าด่านนี้รั่ว = AI สั่งคำนวณด้วยค่ามั่วได้ ซึ่งขัดจุดขาย "คำนวณจริง ไม่ใช่การเดา" (§0)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  validateChatPlan,
  executePlan,
  missingInputPrompt,
  describeAllowlistForPrompt,
  PLAN_ALLOWLIST,
  PLAN_FN_NAMES,
  MAX_CALLS_PER_PLAN,
  MISSING_INPUT_LABELS,
  type ChatPlan,
} from "../lib/chat/plan";

/** ช่วยอ่านเทสต์: บังคับให้แผนต้องผ่าน แล้วคืนแผนที่ validate แล้ว */
function mustPass(raw: unknown): ChatPlan {
  const v = validateChatPlan(raw);
  assert.equal(v.ok, true, `ควรผ่านแต่ไม่ผ่าน: ${JSON.stringify(v)}`);
  return (v as { ok: true; plan: ChatPlan }).plan;
}

function mustFail(raw: unknown): string[] {
  const v = validateChatPlan(raw);
  assert.equal(v.ok, false, `ควรถูกปฏิเสธแต่ผ่าน: ${JSON.stringify(raw)}`);
  assert.equal((v as { kind: string }).kind, "invalid");
  return (v as { errors: string[] }).errors;
}

// ---------------------------------------------------------------------------
// กฎ 1 — fn ต้องอยู่ใน allowlist
// ---------------------------------------------------------------------------

test("แผนพื้นฐานผ่าน validate และรันได้ผลจริงจาก engine", () => {
  const plan = mustPass({ calls: [{ fn: "lookup2digit", args: { num: 99 } }] });
  const ex = executePlan(plan);
  assert.equal(ex.results.length, 1);
  const out = ex.results[0].output as { input: string; found: boolean; element: string };
  assert.equal(out.input, "99");
  assert.equal(out.found, true, "การ์ด 99 ต้องมีจริงในตาราง 00-99");
});

test("🔴 fn นอก allowlist ถูกปฏิเสธ (ไม่ใช่ eval เรียกอะไรก็ได้)", () => {
  for (const bad of ["eval", "calculateElementSeed", "process.exit", "", "LOOKUP2DIGIT"]) {
    const errs = mustFail({ calls: [{ fn: bad, args: {} }] });
    assert.ok(errs.join(" ").includes("allowlist"), `"${bad}" ควรถูกปฏิเสธเพราะไม่อยู่ใน allowlist`);
  }
});

test("🔴 ฟังก์ชันที่ต้องใช้วันเกิดยังไม่เปิดในเฟส 1", () => {
  // เฟส 1 เปิดเฉพาะตัวที่ไม่ต้องใช้วันเกิด — ต้องมี missingInputs ทำงานก่อนถึงจะเปิดได้ (§16)
  for (const later of ["calculateElementSeed", "dailyPrediction", "analyzeFengShui", "checkFullAuspiciousTime"]) {
    assert.ok(!(PLAN_FN_NAMES as readonly string[]).includes(later), `${later} ยังไม่ควรอยู่ใน allowlist เฟส 1`);
  }
  assert.equal(PLAN_FN_NAMES.length, 6, "เฟส 1 มี 6 ฟังก์ชันตามที่ตกลงไว้ใน §16");
});

test("รูปร่างแผนที่พังต้องไม่ throw และไม่ผ่าน", () => {
  for (const bad of [null, 42, "แผน", [], {}, { calls: [] }, { calls: {} }, { calls: [null] }, { calls: [{ fn: "lookup2digit" }] }]) {
    assert.doesNotThrow(() => validateChatPlan(bad));
    assert.equal(validateChatPlan(bad).ok, false, `${JSON.stringify(bad)} ไม่ควรผ่าน`);
  }
});

// ---------------------------------------------------------------------------
// กฎ 2 — args ต้องตรง type
// ---------------------------------------------------------------------------

test("🔴 เลขที่ส่งมาเป็นสตริงถือว่าผิด type ไม่ใช่แปลงให้", () => {
  const errs = mustFail({ calls: [{ fn: "lookup2digit", args: { num: "99" } }] });
  assert.ok(errs[0].includes("จำนวนเต็ม"));
});

test("ค่าตัวเลขเพี้ยน (ทศนิยม/NaN/Infinity/ติดลบ) ถูกปฏิเสธ", () => {
  for (const bad of [1.5, NaN, Infinity, -1, 1e999]) {
    mustFail({ calls: [{ fn: "lookup2digit", args: { num: bad } }] });
  }
});

test("🔴 ธาตุที่ไม่มีจริงถูกปฏิเสธ — AI แต่งชื่อธาตุเองไม่ได้", () => {
  const errs = mustFail({
    calls: [{ fn: "wuXingScore", args: { userElement: "Lightning", objectElement: "Fire" } }],
  });
  assert.ok(errs[0].includes("ไม่ใช่ธาตุที่มีจริง"));
  mustFail({
    calls: [{ fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Fire", userMissingElements: ["ปอบ"] } }],
  });
});

test("ธาตุภาษาไทยถูก normalize เป็นชื่อจริงของ engine (รวม ลม = Wood)", () => {
  const plan = mustPass({
    calls: [{ fn: "wuXingScore", args: { userElement: "ไฟ", objectElement: "ลม", userMissingElements: ["น้ำ", "น้ำ"] } }],
  });
  assert.deepEqual(plan.calls[0].args, {
    userElement: "Fire",
    objectElement: "Wood",
    userMissingElements: ["Water"], // ซ้ำถูกตัดออก
  });
});

test("wuXingScore รันแล้วได้ตัวเลขจาก engine ตัวจริง (Productive Clash ทำงาน)", () => {
  const plan = mustPass({
    calls: [{ fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Metal", userMissingElements: ["Metal"] } }],
  });
  const out = executePlan(plan).results[0].output as { raw_score: number; final_score: number; productive_clash: boolean };
  assert.equal(out.raw_score, -2);
  assert.equal(out.final_score, 2, "ธาตุที่ขาดต้องพลิกเป็น +2");
  assert.equal(out.productive_clash, true);
});

test("เบอร์โทรต้องเป็นสตริงที่มีแต่อักขระเบอร์ และยาว 3-15 หลัก", () => {
  mustPass({ calls: [{ fn: "analyzePhoneNumber", args: { phone: "081-234-5678" } }] });
  mustFail({ calls: [{ fn: "analyzePhoneNumber", args: { phone: 812345678 } }] });
  mustFail({ calls: [{ fn: "analyzePhoneNumber", args: { phone: "โทรมาสิ" } }] });
  mustFail({ calls: [{ fn: "analyzePhoneNumber", args: { phone: "12" } }] });
  mustFail({ calls: [{ fn: "analyzePhoneNumber", args: { phone: "1234567890123456" } }] });
});

test("stopAt ของ digitSumReduce เป็น optional และตรวจช่วงค่า", () => {
  assert.equal(executePlan(mustPass({ calls: [{ fn: "digitSumReduce", args: { n: 8899 } }] })).results[0].output, 7);
  assert.equal(
    executePlan(mustPass({ calls: [{ fn: "digitSumReduce", args: { n: 8899, stopAt: 99 } }] })).results[0].output,
    34,
    "stopAt=99 ต้องหยุดที่ 2 หลัก"
  );
  mustFail({ calls: [{ fn: "digitSumReduce", args: { n: 10, stopAt: 0 } }] });
  mustFail({ calls: [{ fn: "digitSumReduce", args: { n: 10, stopAt: "9" } }] });
});

// ---------------------------------------------------------------------------
// กฎ 3 — ห้ามใช้ฟังก์ชันข้ามบริบท
// ---------------------------------------------------------------------------

test("🔴 เอาปีเกิดไปเปิดตารางเลข 2 หลักไม่ได้ (ข้ามบริบท)", () => {
  const errs = mustFail({ calls: [{ fn: "lookup2digit", args: { num: 1990 } }] });
  assert.ok(errs[0].includes("0-99"), "ต้องบอกช่วงที่ถูกต้อง");
  assert.ok(errs[0].includes("ปีเกิด"), "ต้องอธิบายว่าเป็นคนละบริบท");
});

test("lookup3digit รับได้ถึง 999 เท่านั้น", () => {
  mustPass({ calls: [{ fn: "lookup3digit", args: { num: 999 } }] });
  mustFail({ calls: [{ fn: "lookup3digit", args: { num: 2569 } }] });
});

// ---------------------------------------------------------------------------
// กฎ 4 — missingInputs ไม่ว่าง → ถามผู้ใช้ ห้ามรันแล้วเดา
// ---------------------------------------------------------------------------

test("🔴 missingInputs ไม่ว่าง → ไม่รันแผน แม้จะมี calls มาด้วย", () => {
  const v = validateChatPlan({
    calls: [{ fn: "lookup2digit", args: { num: 7 } }],
    missingInputs: ["birthDate"],
  });
  assert.equal(v.ok, false);
  assert.equal((v as { kind: string }).kind, "needs_input");
  assert.deepEqual((v as { missingInputs: string[] }).missingInputs, ["birthDate"]);
});

test("missingInputs ว่าง/ไม่ใช่ array → ถือว่าไม่ขาดอะไร รันได้ตามปกติ", () => {
  mustPass({ calls: [{ fn: "lookup2digit", args: { num: 7 } }], missingInputs: [] });
  mustPass({ calls: [{ fn: "lookup2digit", args: { num: 7 } }], missingInputs: "birthDate" });
});

test("ข้อความถามข้อมูลที่ขาดต้องอ่านรู้เรื่องเป็นภาษาคน", () => {
  const m = missingInputPrompt(["birthDate", "unknownKey"]);
  assert.ok(m.includes(MISSING_INPUT_LABELS.birthDate));
  assert.ok(m.includes("unknownKey"), "คีย์ที่ไม่รู้จักต้องไม่หายไปเงียบๆ");
});

// ---------------------------------------------------------------------------
// กฎ 5 — จำกัดจำนวน calls
// ---------------------------------------------------------------------------

test("🔴 แผนบวมเกิน 5 calls ถูกปฏิเสธ (กันสูบ token)", () => {
  const calls = Array.from({ length: MAX_CALLS_PER_PLAN + 1 }, (_, i) => ({
    fn: "lookup2digit",
    args: { num: i },
  }));
  const errs = mustFail({ calls });
  assert.ok(errs[0].includes(String(MAX_CALLS_PER_PLAN)));
  mustPass({ calls: calls.slice(0, MAX_CALLS_PER_PLAN) });
});

// ---------------------------------------------------------------------------
// กฎกราฟ — จุดที่พลาดง่ายที่สุด (§16)
// ---------------------------------------------------------------------------

test("กราฟ bar ที่เทียบ engine เดียวกันผ่าน และตัวเลขมาจาก engine", () => {
  const plan = mustPass({
    calls: [
      { fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Wood" }, label: "บ้าน A" },
      { fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Water" }, label: "บ้าน B" },
    ],
    chart: { type: "bar", label: "เทียบบ้าน 2 หลัง", series: "wuXingScore" },
  });
  const ex = executePlan(plan);
  assert.ok(ex.chart && ex.chart.type === "bar");
  const chart = ex.chart as { points: { label: string; value: number }[]; scale: [number, number] };
  assert.deepEqual(chart.scale, [-2, 2]);
  assert.deepEqual(chart.points.map((p) => p.label), ["บ้าน A", "บ้าน B"]);
  // ไฟให้กำเนิด? ไม้ให้กำเนิดไฟ → ไฟ→ไม้ คือย้อนวงจร; ค่าที่ถูกต้องต้องมาจาก engine ไม่ใช่เดาในเทสต์
  assert.deepEqual(
    chart.points.map((p) => p.value),
    plan.calls.map((c) => (PLAN_ALLOWLIST.wuXingScore.run(c.args) as { final_score: number }).final_score)
  );
});

test("🔴 กราฟเทียบข้าม engine/Logic ถูกปฏิเสธ (ละเมิด §4 ข้อ 5)", () => {
  const errs = mustFail({
    calls: [
      { fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Wood" } },
      { fn: "digitSumReduce", args: { n: 8899 } },
    ],
    chart: { type: "bar", label: "ดวงงาน vs ฮวงจุ้ย", series: "wuXingScore" },
  });
  assert.ok(errs[0].includes("ข้าม"), "ต้องบอกว่าเทียบข้าม engine ไม่ได้");
  assert.ok(errs[0].includes("digitSumReduce"), "ต้องบอกว่าตัวไหนปนมา");
});

test("🔴 engine ที่ไม่ได้คืนคะแนน ทำกราฟที่มีแกนตัวเลขไม่ได้", () => {
  const base = {
    calls: [
      { fn: "lookup2digit", args: { num: 12 } },
      { fn: "lookup2digit", args: { num: 71 } },
    ],
  };
  for (const type of ["bar", "radar", "scale"]) {
    assert.equal(
      validateChatPlan({ ...base, chart: { type, label: "x", series: "lookup2digit" } }).ok,
      false,
      `${type} ไม่ควรผ่านเพราะ lookup2digit ไม่ใช่คะแนน`
    );
  }
  // table ไม่ได้อ้างว่ามีสเกลร่วมกัน จึงใช้ได้
  const plan = mustPass({ ...base, chart: { type: "table", label: "เทียบ 2 เลข", series: "lookup2digit" } });
  const ex = executePlan(plan);
  assert.ok(ex.chart && ex.chart.type === "table");
  assert.equal((ex.chart as { rows: unknown[] }).rows.length, 2);
});

test("จำนวนจุดข้อมูลขั้นต่ำต่อชนิดกราฟ", () => {
  const one = [{ fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Wood" } }];
  const two = [...one, { fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Water" } }];
  assert.equal(validateChatPlan({ calls: one, chart: { type: "bar", label: "x", series: "wuXingScore" } }).ok, false);
  assert.equal(validateChatPlan({ calls: two, chart: { type: "radar", label: "x", series: "wuXingScore" } }).ok, false);
  // scale = มาตรวัดค่าเดียว จุดเดียวมีความหมาย
  assert.equal(validateChatPlan({ calls: one, chart: { type: "scale", label: "x", series: "wuXingScore" } }).ok, true);
});

test("chart ที่รูปร่างพัง (type/series มั่ว) ถูกปฏิเสธ", () => {
  const calls = [
    { fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Wood" } },
    { fn: "wuXingScore", args: { userElement: "Fire", objectElement: "Water" } },
  ];
  mustFail({ calls, chart: { type: "pie3d", label: "x", series: "wuXingScore" } });
  mustFail({ calls, chart: { type: "bar", label: "x", series: "drawSvg" } });
  mustFail({ calls, chart: "bar" });
  // ไม่มี chart เลย = ตอบเป็นข้อความอย่างเดียว ถือว่าปกติ
  mustPass({ calls });
});

test("ป้ายชื่อจาก AI ถูกตัดความยาว/ช่องว่างเกิน และมีค่าสำรองเสมอ", () => {
  const plan = mustPass({
    calls: [
      { fn: "lookup2digit", args: { num: 7 }, label: "  ทะเบียน   ก   " },
      { fn: "lookup2digit", args: { num: 8 }, label: "ก".repeat(200) },
      { fn: "lookup2digit", args: { num: 9 } },
    ],
  });
  assert.equal(plan.calls[0].label, "ทะเบียน ก");
  assert.equal(plan.calls[1].label!.length, 60);
  const ex = executePlan(plan);
  assert.equal(ex.results[2].label, "09", "ไม่มี label จาก AI → server สร้างเองจาก args");
});

// ---------------------------------------------------------------------------
// caveat — ข้อจำกัดต้องไหลถึงผู้ใช้ ไม่ถูกกลืนหาย (§5)
// ---------------------------------------------------------------------------

test("🔴 สูตรที่ยังไม่ verify ต้องแนบ caveat มาด้วยเสมอ", () => {
  const ex = executePlan(mustPass({ calls: [{ fn: "analyzePhoneNumber", args: { phone: "0812345678" } }] }));
  assert.ok(ex.results[0].caveat, "เบอร์โทรเป็นสูตรออกแบบเอง ต้องมี caveat");
  assert.ok(ex.caveats.length === 1 && ex.caveats[0].includes("verify"));
});

test('caveat ของ artifactElement ต้องเตือนว่าไม่มีวันได้ "ทอง"', () => {
  const ex = executePlan(mustPass({ calls: [{ fn: "artifactElement", args: { num: 8899 } }] }));
  assert.ok(ex.caveats[0].includes("ทอง"));
  assert.notEqual(ex.results[0].output, "Metal", "ตาราง 4 ธาตุคืน Metal ไม่ได้");
});

test("caveat ซ้ำถูกยุบเหลืออันเดียว และ engine ที่ verify แล้วไม่ต้องมี caveat", () => {
  const ex = executePlan(
    mustPass({
      calls: [
        { fn: "lookup3digit", args: { num: 111 } },
        { fn: "lookup3digit", args: { num: 222 } },
      ],
    })
  );
  assert.equal(ex.caveats.length, 1);
  assert.equal(PLAN_ALLOWLIST.wuXingScore.caveat, null, "wuXingScore ผ่าน golden test แล้ว");
  assert.equal(PLAN_ALLOWLIST.lookup2digit.caveat, null, "ตาราง 2 หลักตรง 100%");
});

// ---------------------------------------------------------------------------
// prompt สร้างจาก allowlist ตรงๆ — drift จากของจริงไม่ได้
// ---------------------------------------------------------------------------

test("คำอธิบายสำหรับ prompt ครอบคลุมทุกฟังก์ชันใน allowlist", () => {
  const desc = describeAllowlistForPrompt();
  for (const fn of PLAN_FN_NAMES) {
    assert.ok(desc.includes(fn), `prompt ไม่ได้บอกถึง ${fn}`);
  }
});

test("ทุก fn ใน allowlist มี spec ครบและระบุ Logic ต้นสังกัด", () => {
  for (const fn of PLAN_FN_NAMES) {
    const s = PLAN_ALLOWLIST[fn];
    assert.ok(s, `${fn} ไม่มี spec`);
    assert.ok(typeof s.logic === "number", `${fn} ไม่ได้ระบุ Logic ต้นสังกัด`);
    assert.ok(s.description && s.argsHint, `${fn} ไม่มีคำอธิบาย/argsHint`);
  }
});
