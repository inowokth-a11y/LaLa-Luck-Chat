// Golden parity test — lib/engine/card-id.ts ต้องตรงกับ JS ต้นฉบับใน intake_form.html
// (regenerate fixture: node tests/fixtures/gen_cardid_fixtures.mjs)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { computeCardId, computeCardIdString, namePower, digitSum, reduceTo99, thaiDayOfWeek } from "../lib/engine/card-id";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "cardid.fixture.json"), "utf-8"));

test("computeCardId ตรงกับ prototype ทุกเคส (สูตร A: Birth+Day+Time+Name)", () => {
  for (const c of fx.card_ids) {
    assert.equal(computeCardId(c.input), c.expected, `เคส ${c.input.firstName} ${c.input.lastName}`);
  }
});

test("namePower / digitSum / reduceTo99 ตรงกับ prototype", () => {
  for (const [k, v] of Object.entries(fx.name_power)) assert.equal(namePower(k), v);
  for (const [k, v] of Object.entries(fx.digit_sum)) assert.equal(digitSum(Number(k)), v);
  for (const [k, v] of Object.entries(fx.reduce_to_99)) assert.equal(reduceTo99(Number(k)), v);
});

test("computeCardIdString คืนสองหลักเสมอ", () => {
  const s = computeCardIdString({ firstName: "ก", lastName: "ก", birthDate: "2000-01-01", birthTime: "00:00" });
  assert.match(s, /^\d{2}$/);
  assert.equal(s.length, 2);
});

test("thaiDayOfWeek ถูกต้อง", () => {
  assert.equal(thaiDayOfWeek("1986-10-07"), "อังคาร"); // ตรงกับข้อมูลจริงของ Platform D
  assert.equal(thaiDayOfWeek("1988-12-31"), "เสาร์");
  assert.equal(thaiDayOfWeek("2003-10-21"), "อังคาร");
});

test("birthDate รูปแบบผิด → โยน error (ไม่คำนวณเงียบๆ)", () => {
  assert.throws(() => computeCardId({ firstName: "ก", lastName: "ก", birthDate: "07/10/1986" }));
});
