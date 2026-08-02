// เทสต์ orchestration ของ AI Chat เฟส 2 (lib/chat/plan-run.ts) — CLAUDE.md §16
// ⚠️ ไม่ยิง AI จริง — เทสต์เฉพาะส่วน pure: ตีความผล planner, สร้าง prompt/input, โควตา
//    คุณภาพคำตอบ AI ทดสอบด้วยการยิงจริง (บันทึกผลไว้ใน §16)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPlannerSystem,
  buildNarratorSystem,
  interpretPlannerOutput,
  buildNarratorInput,
  buildProfileContext,
} from "../lib/chat/plan-run";
import { PLAN_FN_NAMES, type PlanProfileContext } from "../lib/chat/plan";

// ---------------------------------------------------------------------------
// system prompts — ต้องสร้างจาก allowlist จริง (drift ไม่ได้)
// ---------------------------------------------------------------------------

test("planner prompt ครอบทุกฟังก์ชันใน allowlist + ย้ำกฎห้ามคำนวณเอง", () => {
  const p = buildPlannerSystem();
  for (const fn of PLAN_FN_NAMES) assert.ok(p.includes(fn), `prompt ไม่ได้บอกถึง ${fn}`);
  assert.ok(/ห้ามคำนวณเอง|ห้ามเดาตัวเลข/.test(p), "ต้องย้ำว่า planner ห้ามคำนวณ/เดาเลข");
  assert.ok(p.includes("missingInputs"), "ต้องสอนให้ใช้ missingInputs");
});

test("narrator prompt ย้ำว่าห้ามแต่งเลข + ต้องบอก caveat", () => {
  const n = buildNarratorSystem();
  assert.ok(/ห้ามแต่งตัวเลข|ห้ามแต่งเลข/.test(n));
  assert.ok(/caveat|ข้อควรระวัง/.test(n), "ต้องสั่งให้บอกข้อควรระวัง");
});

// ---------------------------------------------------------------------------
// interpretPlannerOutput — สาขาสำคัญทั้งหมด โดยไม่ต้องมี AI
// ---------------------------------------------------------------------------

test("planner คืน JSON ที่ใช้ได้ → answered + ตัวเลขมาจาก engine", () => {
  const raw = 'นี่คือแผนค่ะ\n```json\n{"calls":[{"fn":"lookup2digit","args":{"num":99}}]}\n```';
  const r = interpretPlannerOutput(raw);
  assert.equal(r.status, "answered");
  if (r.status !== "answered") return;
  const out = r.execution.results[0].output as { input: string; found: boolean };
  assert.equal(out.input, "99");
  assert.equal(out.found, true);
});

test("planner บอกว่าข้อมูลไม่พอ → needs_input พร้อมข้อความถามผู้ใช้", () => {
  const r = interpretPlannerOutput('{"missingInputs":["birthDate"],"calls":[]}');
  assert.equal(r.status, "needs_input");
  if (r.status !== "needs_input") return;
  assert.deepEqual(r.missingInputs, ["birthDate"]);
  assert.ok(r.message.includes("วันเดือนปีเกิด"), "ต้องแปลงเป็นข้อความที่ผู้ใช้อ่านรู้เรื่อง");
});

test("🔴 planner แต่งชื่อฟังก์ชัน/ค่าผิดบริบท → unclear (ไม่รันมั่ว)", () => {
  assert.equal(interpretPlannerOutput('{"calls":[{"fn":"hackDB","args":{}}]}').status, "unclear");
  assert.equal(interpretPlannerOutput('{"calls":[{"fn":"lookup2digit","args":{"num":1990}}]}').status, "unclear");
  assert.equal(interpretPlannerOutput('{"calls":[]}').status, "unclear", "แผนว่างเปล่า = นอกขอบเขต");
});

test("planner ไม่คืน JSON เลย → unclear ไม่ throw", () => {
  const r = interpretPlannerOutput("ขอโทษครับ ผมไม่เข้าใจคำถาม");
  assert.equal(r.status, "unclear");
});

test("planner ที่มีกราฟถูกต้อง → answered + execution มี chart", () => {
  const raw = JSON.stringify({
    calls: [
      { fn: "wuXingScore", args: { userElement: "ไฟ", objectElement: "น้ำ" }, label: "บ้าน A" },
      { fn: "wuXingScore", args: { userElement: "ไฟ", objectElement: "ไม้" }, label: "บ้าน B" },
    ],
    chart: { type: "bar", label: "เทียบบ้าน", series: "wuXingScore" },
  });
  const r = interpretPlannerOutput(raw);
  assert.equal(r.status, "answered");
  if (r.status !== "answered") return;
  assert.ok(r.execution.chart && r.execution.chart.type === "bar");
});

// ---------------------------------------------------------------------------
// ฟังก์ชัน "ของฉัน" — ต้องมีโปรไฟล์ (ธาตุประจำตัว) ที่ server เติม
// ---------------------------------------------------------------------------

test("buildProfileContext จากวันเกิด → คำนวณ ElementSeed ให้ (server เตรียม ไม่ใช่ AI)", () => {
  const ctx = buildProfileContext("1990-01-15");
  assert.ok(ctx, "วันเกิดถูกต้องต้องได้ context");
  assert.ok(["Fire", "Earth", "Wood", "Water"].includes(ctx!.dominant));
  assert.ok(ctx!.seed.dominant_th, "มีผล seed เต็ม");
});

test("buildProfileContext ปฏิเสธข้อมูลเสีย (พ.ศ./รูปแบบผิด/ว่าง) → null", () => {
  for (const bad of [null, undefined, "", "2533-01-15", "1990/01/15", "abc", "1800-01-01"]) {
    assert.equal(buildProfileContext(bad as string), null, `"${bad}" ควรได้ null`);
  }
});

test("🔴 แผนต้องใช้ธาตุประจำตัว แต่ไม่มีโปรไฟล์ → needs_input (ไม่เดา ไม่ครash)", () => {
  const r = interpretPlannerOutput('{"calls":[{"fn":"myElementSeed","args":{}}]}', null);
  assert.equal(r.status, "needs_input");
  if (r.status !== "needs_input") return;
  assert.ok(/เข้าสู่ระบบ|วันเกิด/.test(r.message), "ต้องบอกให้ล็อกอิน/กรอกวันเกิด");
});

test("แผนธาตุประจำตัว + มีโปรไฟล์ → answered ด้วยผลจาก engine", () => {
  const ctx: PlanProfileContext = buildProfileContext("1990-01-15")!;
  const r = interpretPlannerOutput('{"calls":[{"fn":"myElementSeed","args":{}}]}', ctx);
  assert.equal(r.status, "answered");
  if (r.status !== "answered") return;
  assert.equal(r.execution.results[0].output, ctx.seed);
});

test("planner prompt สอนให้ใช้ myElementSeed สำหรับธาตุประจำตัว (ไม่สอนให้ใส่วันเกิด)", () => {
  const p = buildPlannerSystem();
  assert.ok(p.includes("myElementSeed"));
  assert.ok(/ห้ามใส่วันเกิด|ระบบเติม/.test(p), "ต้องย้ำว่า AI ไม่ต้องใส่วันเกิด");
});

// ---------------------------------------------------------------------------
// buildNarratorInput — คุมสิ่งที่ AI เห็น + caveat ต้องไหลเข้า prompt
// ---------------------------------------------------------------------------

test("🔴 caveat ของสูตรที่ไม่ verify ต้องปรากฏใน input ของ narrator", () => {
  const r = interpretPlannerOutput('{"calls":[{"fn":"analyzePhoneNumber","args":{"phone":"0812345678"}}]}');
  assert.equal(r.status, "answered");
  if (r.status !== "answered") return;
  const input = buildNarratorInput("เบอร์นี้เป็นไง", r.execution);
  assert.ok(input.includes("ข้อควรระวังที่ต้องบอกผู้ใช้"), "caveat ต้องถูกส่งให้ narrator เห็น");
  assert.ok(input.includes("verify"));
});

test("narrator input มีคำถาม + ผลจริง แต่คำถามถูกใส่ครบ", () => {
  const r = interpretPlannerOutput('{"calls":[{"fn":"lookup2digit","args":{"num":7}}]}');
  assert.equal(r.status, "answered");
  if (r.status !== "answered") return;
  const input = buildNarratorInput("เลข 7 หมายถึงอะไร", r.execution);
  assert.ok(input.includes("เลข 7 หมายถึงอะไร"));
  assert.ok(input.includes("ผลการคำนวณ"));
});

// ---------------------------------------------------------------------------
// โควตา plan-chat — กันปลอมแปลงแบบเดียวกับ §13
// ---------------------------------------------------------------------------






test("แผนผิดเฉพาะกราฟ (series ปนหลาย fn) → ตัดกราฟทิ้ง เก็บผลคำนวณ (2 ส.ค. 2569)", () => {
  const raw = JSON.stringify({
    calls: [
      { fn: "artifactElement", args: { num: 6266 }, label: "ทะเบียนรถ" },
      { fn: "lookup3digit", args: { num: 444 }, label: "บ้านเลขที่" },
    ],
    chart: { type: "table", label: "เทียบ", series: "artifactElement" }, // ผิด: มี lookup3digit ปน
  });
  const r = interpretPlannerOutput(raw);
  assert.equal(r.status, "answered", "ต้องไม่ล้มทั้งแผนเพราะกราฟผิดอย่างเดียว");
  if (r.status === "answered") {
    assert.equal(r.execution.chart, undefined, "กราฟผิดกฎต้องถูกทิ้ง ไม่ถูกวาด");
    assert.equal(r.execution.results.length, 2, "ผลคำนวณทั้งสองรายการต้องอยู่ครบ");
  }
});

test("แผนที่ calls ผิดเอง (ไม่ใช่แค่กราฟ) → ยัง unclear เหมือนเดิม (กฎไม่หย่อน)", () => {
  const raw = JSON.stringify({
    calls: [{ fn: "eval", args: { num: 1 } }],
    chart: { type: "table", label: "x", series: "eval" },
  });
  const r = interpretPlannerOutput(raw);
  assert.equal(r.status, "unclear");
});
