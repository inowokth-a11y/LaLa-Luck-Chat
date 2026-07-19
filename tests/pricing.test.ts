// เทสต์การคำนวณต้นทุน (lib/ai/pricing.ts)
// ⚠️ ไม่ใช่ golden parity — ราคาเป็นค่าที่ตั้งเอง เทสต์นี้คุมว่า "คำนวณถูกตามราคาที่ตั้งไว้"
//    และคุมว่าโมเดลที่ระบบใช้จริงต้องมีราคาครบ ไม่งั้นต้นทุนจะหายไปเงียบๆ

import { test } from "node:test";
import assert from "node:assert/strict";

import { calcCost, pricedModels, usdThbRate } from "../lib/ai/pricing";

test("คำนวณต้นทุนตรงกับตัวเลขที่วัดได้จริง (Dream ปกติ 432 in / 568 out บน gpt-5.5)", () => {
  const c = calcCost("gpt-5.5", 432, 568);
  // (432/1e6 × $5) + (568/1e6 × $30) = 0.00216 + 0.01704 = $0.0192 → ×36 = ฿0.69
  assert.equal(Number(c.usd.toFixed(5)), 0.0192);
  assert.equal(Number(c.thb.toFixed(2)), 0.69, "ควรได้ ฿0.69 ตรงกับที่บันทึกใน CLAUDE.md");
  assert.equal(c.unknownModel, false);
});

test("คิดค่าค้นเว็บแยกจาก token ($10 ต่อ 1,000 ครั้ง)", () => {
  const noSearch = calcCost("claude-sonnet-5", 1000, 1000, 0);
  const twoSearch = calcCost("claude-sonnet-5", 1000, 1000, 2);
  assert.equal(Number((twoSearch.usd - noSearch.usd).toFixed(4)), 0.02, "2 ครั้ง = $0.02");
});

test("ต้นทุน AI-1 จริงที่วัดได้ (33,904 in / 5,706 out / 2 ค้น) ≈ ฿7.46", () => {
  const c = calcCost("claude-sonnet-5", 33904, 5706, 2);
  assert.ok(Math.abs(c.thb - 7.46) < 0.15, `ได้ ฿${c.thb.toFixed(2)} ควรใกล้ ฿7.46`);
});

test("🔴 ต้นทุน AI-1 สูงกว่าราคาขาย 1 เครดิต (฿3-5) — ข้อเท็จจริงที่ต้องไม่ลืม", () => {
  const ai1 = calcCost("claude-sonnet-5", 33904, 5706, 2).thb;
  assert.ok(ai1 > 5, `ต้นทุน ฿${ai1.toFixed(2)} ควร > ฿5 (ขาดทุนถ้าขาย 1 เครดิต)`);
});

test("โมเดลที่ไม่รู้จัก → ต้นทุน 0 แต่ต้องติดธงเตือน ไม่ใช่เงียบ", () => {
  const c = calcCost("โมเดลที่ไม่มีในตาราง", 100000, 100000);
  assert.equal(c.unknownModel, true);
  assert.equal(c.thb, 0);
});

test("โมเดลทุกตัวที่ระบบเรียกใช้จริงต้องมีราคา", () => {
  // ถ้าเพิ่ม candidate ใน lib/ai/index.ts แล้วลืมใส่ราคา เทสต์นี้จะจับได้
  const used = [
    "claude-haiku-4-5", "claude-sonnet-5", "claude-opus-4-8",
    "gemini-3.5-flash", "gpt-5.5",
  ];
  const priced = pricedModels();
  for (const m of used) assert.ok(priced.includes(m), `ขาดราคาของ "${m}"`);
});

test("เรตแลกเปลี่ยนทับด้วย env ได้ (กันเงินบาทผันผวนโดยไม่ต้องแก้โค้ด)", () => {
  const original = process.env.USD_THB_RATE;
  try {
    process.env.USD_THB_RATE = "40";
    assert.equal(usdThbRate(), 40);
    process.env.USD_THB_RATE = "ไม่ใช่ตัวเลข";
    assert.equal(usdThbRate(), 36, "ค่าพังต้องกลับไปใช้ค่าเริ่มต้น ไม่ใช่ NaN");
    process.env.USD_THB_RATE = "-5";
    assert.equal(usdThbRate(), 36, "ค่าติดลบต้องไม่ถูกใช้");
  } finally {
    if (original === undefined) delete process.env.USD_THB_RATE;
    else process.env.USD_THB_RATE = original;
  }
});

test("token เป็น 0 → ต้นทุน 0 ไม่ throw", () => {
  const c = calcCost("gpt-5.5", 0, 0, 0);
  assert.equal(c.usd, 0);
  assert.equal(c.thb, 0);
});
