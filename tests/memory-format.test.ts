// เทสต์ตรรกะความจำแม่หมอ (lib/memory/format.ts) — ขนาดบล็อกต้องถูกคุมเสมอ
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  truncate,
  compactEvent,
  formatMemoryBlock,
  buildSummarizerPrompt,
  shouldSummarize,
  MEMORY_SUMMARY_MAX,
  RECENT_EVENTS,
  EVENT_LINE_MAX,
  SUMMARIZE_EVERY,
} from "../lib/memory/format";

test("truncate นับตัวอักษรแบบ code point (อีโมจิ/ไทยไม่ขาดกลาง)", () => {
  assert.equal(truncate("สวัสดี", 10), "สวัสดี");
  const cut = truncate("🐾".repeat(20), 5);
  assert.equal([...cut].length, 5); // 4 อีโมจิ + "…"
  assert.ok(cut.endsWith("…"));
});

test("compactEvent — บรรทัดเดียว มีชนิด/คำถาม/ผล และไม่เกิน EVENT_LINE_MAX", () => {
  const line = compactEvent("dream", { q: "ฝันเห็นงูใหญ่", a: "งู(ทอง)" }, "2026-08-01");
  assert.ok(line.includes("ฝัน:") && line.includes("งู(ทอง)") && line.includes("2026-08-01"));
  const long = compactEvent("chat", { q: "ก".repeat(500), a: "ข".repeat(500) });
  assert.ok([...long].length <= EVENT_LINE_MAX);
});

test("ไม่มีอะไรให้จำ → null (route จะไม่แนบบล็อกเปล่า)", () => {
  assert.equal(formatMemoryBlock(null, []), null);
  assert.equal(formatMemoryBlock("  ", ["", "  "]), null);
});

test("🔴 บล็อกความจำถูกคุมขนาด: summary ตัดที่ MAX · เหตุการณ์ไม่เกิน RECENT_EVENTS", () => {
  const block = formatMemoryBlock("ส".repeat(5000), ["a", "b", "c", "d", "e", "f"])!;
  const lines = block.split("\n").filter((l) => l.startsWith("- "));
  assert.equal(lines.length, RECENT_EVENTS);
  assert.ok(block.length < MEMORY_SUMMARY_MAX + RECENT_EVENTS * (EVENT_LINE_MAX + 3) + 400);
});

test("🔴 บล็อกมีคำกำกับ: ใช้เพื่อความต่อเนื่อง ห้ามแต่งข้อเท็จจริง/คำทำนายใหม่", () => {
  const block = formatMemoryBlock("เคยฝันเรื่องงูบ่อย", [])!;
  assert.ok(block.includes("ห้ามใช้แต่งข้อเท็จจริง"));
  assert.ok(block.includes("<ความจำของแม่หมอ"));
});

test("เกณฑ์สรุป: ครบ SUMMARIZE_EVERY เหตุการณ์ค่อยสรุป (คุมต้นทุน Haiku)", () => {
  assert.equal(shouldSummarize(SUMMARIZE_EVERY - 1), false);
  assert.equal(shouldSummarize(SUMMARIZE_EVERY), true);
});

test("prompt ตัวสรุปสั่งชัด: ข้อเท็จจริงเท่านั้น ห้ามทำนายเพิ่ม + จำกัดความยาว", () => {
  const p = buildSummarizerPrompt("สรุปเดิม", ["- เคยถามเรื่องงาน"]);
  assert.ok(p.includes("ห้ามแต่งคำทำนาย"));
  assert.ok(p.includes(String(MEMORY_SUMMARY_MAX)));
  assert.ok(p.includes("สรุปเดิม"));
  assert.ok(buildSummarizerPrompt(null, ["x"]).includes("เหตุการณ์ใหม่"));
});
