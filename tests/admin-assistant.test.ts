// เทสต์ตัวสร้าง context ของผู้ช่วยแอดมิน (lib/admin/assistant.ts) — pure
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAdminContext, buildAssistantInput, ADMIN_ASSISTANT_SYSTEM } from "../lib/admin/assistant";
import type { UsageStats } from "../lib/admin/usage-stats";
import type { QuestionSummary } from "../lib/admin/question-stats";

const usage: UsageStats = {
  totalCalls: 49, cacheHits: 3, cacheHitRate: 0.1, totalCostThb: 10.95, avgCostPerCall: 0.22,
  failures: 7, failRate: 0.14,
  byRole: [{ role: "ai2", calls: 31, costThb: 9.58, avgCostThb: 0.31 }],
  byModel: [{ provider: "openai", model: "gpt-5.5", calls: 29, costThb: 9.5, failures: 7 }],
  byDay: [], topSpenders: [], dateRange: null,
};
const questions: QuestionSummary = {
  total: 12, byStatus: [{ status: "answered", count: 8 }, { status: "unclear", count: 4 }],
  answeredRate: 0.67, topFns: [{ fn: "lookup2digit", count: 5 }],
  recentUnclear: [{ question: "ดูเนื้อคู่ให้หน่อย", created_at: "2569-07-26" }],
  recentAnswered: [{ question: "เลข 88 ดีไหม", fns: ["lookup2digit"], created_at: "2569-07-26" }],
};

test("context มีตัวเลขจริงครบ + คำถาม unclear (สำหรับจัดลำดับฟีเจอร์)", () => {
  const c = buildAdminContext(usage, questions);
  assert.ok(c.includes("฿10.95"), "ต้นทุนรวม");
  assert.ok(c.includes("14%"), "อัตราล่ม");
  assert.ok(c.includes("ดูเนื้อคู่ให้หน่อย"), "คำถาม unclear ต้องอยู่ใน context");
  assert.ok(c.includes("lookup2digit"), "ฟังก์ชันฮิต");
});

test("system prompt ย้ำห้ามแต่งตัวเลข + เน้น unclear", () => {
  assert.ok(/ห้ามแต่งตัวเลข|ห้ามแต่ง/.test(ADMIN_ASSISTANT_SYSTEM));
  assert.ok(/unclear|ตอบไม่ได้/.test(ADMIN_ASSISTANT_SYSTEM));
});

test("buildAssistantInput ห่อ context + คำถาม", () => {
  const inp = buildAssistantInput("CTX", "ต้นทุนเดือนนี้เท่าไหร่");
  assert.ok(inp.includes("CTX") && inp.includes("ต้นทุนเดือนนี้เท่าไหร่"));
  assert.ok(inp.includes("ข้อมูลแดชบอร์ด"));
});
