// เทสต์ aggregator ต้นทุน AI (lib/admin/usage-stats.ts) — ตรรกะล้วน
import { test } from "node:test";
import assert from "node:assert/strict";

import { computeUsageStats, type UsageRow } from "../lib/admin/usage-stats";
import { isAdminEmail, getAdminEmails } from "../lib/admin/access";

function row(p: Partial<UsageRow>): UsageRow {
  return {
    user_id: null,
    channel: "web",
    logic_id: null,
    ai_role: "ai2",
    provider: "openai",
    model: "gpt-5.5",
    used_fallback: false,
    cost_thb: 0.3,
    cache_hit: null,
    ok: true,
    created_at: "2569-07-25T10:00:00Z",
    ...p,
  };
}

test("สรุปยอดรวม + เฉลี่ยต่อคำถามถูกต้อง", () => {
  const s = computeUsageStats([
    row({ cost_thb: 0.5 }),
    row({ cost_thb: 0.3 }),
    row({ cost_thb: "0.2" }), // numeric จาก Supabase เป็น string ได้
  ]);
  assert.equal(s.totalCalls, 3);
  assert.equal(s.totalCostThb, 1); // 0.5+0.3+0.2
  assert.equal(s.avgCostPerCall, round(1 / 3));
});

test("แถวแคช (provider='cache') ไม่นับเป็น call และไม่คิดต้นทุน", () => {
  const s = computeUsageStats([
    row({ provider: "cache", model: "cache", ai_role: "ai1", cost_thb: 0, cache_hit: true }),
    row({ ai_role: "ai1", provider: "claude", model: "claude-sonnet-5", cost_thb: 7.46 }),
  ]);
  assert.equal(s.totalCalls, 1, "แคชไม่นับเป็น call");
  assert.equal(s.cacheHits, 1);
  assert.equal(s.totalCostThb, 7.46);
  // cache hit rate = 1 hit / (1 hit + 1 ai1 call) = 0.5
  assert.equal(s.cacheHitRate, 0.5);
});

test("cache hit rate = 0 เมื่อไม่มีงานที่แคชได้ (ไม่หารศูนย์)", () => {
  const s = computeUsageStats([row({ ai_role: "ai2" })]);
  assert.equal(s.cacheHitRate, 0);
});

test("ล้มเหลว (ok=false) นับแยกและเข้า byModel.failures", () => {
  const s = computeUsageStats([
    row({ provider: "openai", model: "gpt-5.5", ok: false, cost_thb: 0 }),
    row({ provider: "openai", model: "gpt-5.5", ok: true }),
  ]);
  assert.equal(s.failures, 1);
  assert.equal(s.failRate, 0.5);
  const m = s.byModel.find((x) => x.model === "gpt-5.5");
  assert.equal(m?.failures, 1);
});

test("จัดกลุ่มตาม role/model/day/user ถูกต้อง", () => {
  const s = computeUsageStats([
    row({ ai_role: "router", provider: "claude", model: "claude-haiku-4-5", cost_thb: 0.05, user_id: "DEM-1", created_at: "2569-07-24T09:00:00Z" }),
    row({ ai_role: "ai2", cost_thb: 0.3, user_id: "DEM-1", created_at: "2569-07-25T09:00:00Z" }),
    row({ ai_role: "ai2", cost_thb: 0.3, user_id: null, created_at: "2569-07-25T10:00:00Z" }),
  ]);
  assert.equal(s.byRole.find((r) => r.role === "ai2")?.calls, 2);
  assert.equal(s.byRole.find((r) => r.role === "router")?.costThb, 0.05);
  assert.equal(s.byDay.length, 2);
  const top = s.topSpenders[0];
  assert.equal(top.userId, "DEM-1"); // 0.35 > 0.3
  assert.equal(top.costThb, 0.35);
  assert.ok(s.topSpenders.some((u) => u.userId === "(ไม่ล็อกอิน)"));
});

test("รายการว่าง → ไม่ throw และคืนศูนย์", () => {
  const s = computeUsageStats([]);
  assert.equal(s.totalCalls, 0);
  assert.equal(s.avgCostPerCall, 0);
  assert.equal(s.dateRange, null);
});

// ---- admin gate ----
test("isAdminEmail — เทียบแบบ case-insensitive + trim, default ปฏิเสธ", () => {
  const admins = ["boss@x.com", "you@example.com"];
  assert.equal(isAdminEmail("YOU@Example.com", admins), true);
  assert.equal(isAdminEmail("  boss@x.com ", admins), true);
  assert.equal(isAdminEmail("random@x.com", admins), false);
  assert.equal(isAdminEmail(null, admins), false);
  assert.equal(isAdminEmail("you@example.com", []), false, "ไม่มี admin list = ปฏิเสธทุกคน");
});

test("getAdminEmails อ่านจาก env ADMIN_EMAILS (คั่นจุลภาค)", () => {
  const prev = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "A@x.com, b@y.com ";
  assert.deepEqual(getAdminEmails(), ["a@x.com", "b@y.com"]);
  process.env.ADMIN_EMAILS = "";
  assert.deepEqual(getAdminEmails(), []);
  if (prev === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = prev;
});

function round(n: number) {
  return Math.round(n * 10000) / 10000;
}
