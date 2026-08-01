// เทสต์เรทเครดิต (lib/credits/pricing.ts) — เทสต์ที่สำคัญที่สุด: กำไร ≥500% ทุก action ทุกแพ็ก
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ACTION_RATES,
  CREDIT_PACKAGES,
  MIN_PROFIT_MULTIPLIER,
  cheapestCreditValueThb,
  creditValueThb,
  profitMultiplier,
  profitPercent,
  actionRate,
} from "../lib/credits/pricing";

test("🔴 ทุก action ที่มีต้นทุน ต้องกำไร ≥500% แม้ที่แพ็กถูกสุด (worst case)", () => {
  const worst = cheapestCreditValueThb();
  for (const r of ACTION_RATES) {
    if (r.costThb <= 0) continue; // ฟรี — ไม่คิด %
    const m = profitMultiplier(r, worst);
    assert.ok(
      m >= MIN_PROFIT_MULTIPLIER,
      `${r.key} กำไรแค่ ${profitPercent(r, worst)}% (${m.toFixed(2)}×) ที่ ฿${worst}/เครดิต — ต่ำกว่า 500%`
    );
  }
});

test("action ฟรี (ต้นทุน 0) ต้องหัก 0 เครดิต", () => {
  for (const r of ACTION_RATES.filter((x) => x.category === "free")) {
    assert.equal(r.credits, 0, `${r.key} ฟรีต้องหัก 0 เครดิต`);
    assert.equal(r.costThb, 0);
  }
});

test("action ที่มีต้นทุน ต้องหัก ≥1 เครดิต (ไม่ปล่อยฟรี)", () => {
  for (const r of ACTION_RATES.filter((x) => x.costThb > 0)) {
    assert.ok(r.credits >= 1, `${r.key} มีต้นทุนแต่หัก 0 เครดิต`);
  }
});

test("แพ็กใหญ่ขึ้น = ค่าเครดิตถูกลง (มีแรงจูงใจซื้อก้อนใหญ่) และไม่ต่ำกว่า floor", () => {
  const sorted = [...CREDIT_PACKAGES].sort((a, b) => a.priceThb - b.priceThb);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(
      creditValueThb(sorted[i]) <= creditValueThb(sorted[i - 1]),
      `แพ็ก ฿${sorted[i].priceThb} ควรค่าเครดิต ≤ แพ็กเล็กกว่า`
    );
  }
  // floor = ค่าเครดิตถูกสุด ต้องตรงกับที่ใช้คิดเรท
  assert.equal(cheapestCreditValueThb(), Math.min(...CREDIT_PACKAGES.map(creditValueThb)));
});

test("ค่าเครดิตถูกสุดคือ ฿129/51 ≈ ฿2.53 (แพ็กพรีเมียม — แบบ ก ที่ผู้ใช้เลือก 30 ก.ค. 2569)", () => {
  assert.equal(cheapestCreditValueThb(), 129 / 51);
  // floor ต้องไม่ต่ำกว่า ~฿2.47 ไม่งั้นโลโก้เวกเตอร์/ฉลาก (7cr, ฿2.88) หลุดกฎ 500%
  assert.ok(cheapestCreditValueThb() >= 2.47);
});

test("ทุกแพ็กขายผ่าน PromptPay ได้ (≥ ขั้นต่ำ ฿20 ของ Omise)", () => {
  for (const p of CREDIT_PACKAGES) {
    assert.ok(p.priceThb >= 20, `แพ็ก ฿${p.priceThb} ต่ำกว่าขั้นต่ำ PromptPay`);
  }
});

test("โลโก้เวกเตอร์ (ตัวแพงสุด) ยังผ่าน 500% ที่แพ็กถูกสุด — จุดที่คับที่สุด", () => {
  const logo = actionRate("logo_vector")!;
  const pct = profitPercent(logo, cheapestCreditValueThb());
  assert.ok(pct >= 500, `โลโก้เวกเตอร์กำไร ${pct}%`);
  assert.ok(pct < 700, "ถ้าเกิน 700% แปลว่าตั้งเครดิตเผื่อมากเกิน ลดได้");
});

test("key ไม่ซ้ำ + มี label/category ครบ", () => {
  const keys = ACTION_RATES.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length, "key ซ้ำ");
  for (const r of ACTION_RATES) {
    assert.ok(r.label && r.category, `${r.key} ขาด label/category`);
  }
});

test("ที่ราคาป้าย (แพ็กเล็กสุด) กำไรสูงกว่า floor เสมอ (แค่เช็คทิศทาง)", () => {
  const base = Math.max(...CREDIT_PACKAGES.map(creditValueThb)); // ค่าเครดิตแพงสุด = แพ็กเล็ก
  for (const r of ACTION_RATES.filter((x) => x.costThb > 0)) {
    assert.ok(profitMultiplier(r, base) >= profitMultiplier(r, cheapestCreditValueThb()));
  }
});
