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

test("namePower ตรงกับ implementation อิสระของตารางทางการ · digitSum/reduceTo99 ตรง prototype", () => {
  for (const [k, v] of Object.entries(fx.name_power)) assert.equal(namePower(k), v, `namePower(${k})`);
  for (const [k, v] of Object.entries(fx.digit_sum)) assert.equal(digitSum(Number(k)), v);
  for (const [k, v] of Object.entries(fx.reduce_to_99)) assert.equal(reduceTo99(Number(k)), v);
});

test("🔴 นับสระ/วรรณยุกต์ตามตารางทางการ + กฎแยกบริบท 'อ' (ผู้ใช้ตัดสิน 6 ส.ค. 2569)", () => {
  assert.equal(namePower("สมชาย"), 23); // ส7+ม5+ช2+า1+ย8 — สระอา=1 ต้องถูกนับ
  assert.equal(namePower("อร"), 10); // อ ต้นคำ = พยัญชนะ (6)
  assert.equal(namePower("เอก"), 11); // เ4 + อ หลังสระหน้า = พยัญชนะ (6) + ก1
  assert.equal(namePower("อ่าน"), 14); // อ มีวรรณยุกต์เกาะ = พยัญชนะ (6) + ่2+า1+น5
  assert.equal(namePower("สมอ"), 16); // อ หลังพยัญชนะ = สระออ (4)
  assert.equal(namePower("มือ"), 7); // ม5 + ื2 + อ หลัง ื = ข้าม (นับที่ ื ไปแล้ว)
  // 7 อักขระที่ตารางเดิมไม่มี — เจ้าของตำราให้ค่ามาแล้ว 7 ส.ค. 2569 (จัดตามตระกูลฐานสระ/ลำดับวรรณยุกต์)
  assert.equal(namePower("ดี"), 4); // ด1 + ี3 (ตระกูลสระอิ)
  assert.equal(namePower("ถึง"), 6); // ถ1 + ึ3 (ตระกูลสระอิ) + ง2
  assert.equal(namePower("จะ"), 7); // จ6 + ะ1 (ตระกูลสระอา)
  assert.equal(namePower("ก็"), 7); // ก1 + ็ 6 (ตระกูลไม้หันอากาศ)
  assert.equal(namePower("เก๊"), 8); // เ4 + ก1 + ๊ 3 (วรรณยุกต์ลำดับ 3)
  assert.equal(namePower("ก๋วย"), 19); // ก1 + ๋ 4 (ลำดับ 4) + ว6 + ย8
  assert.equal(namePower("เสือ"), 13); // เ4 + ส7 + ื2 + อ ข้าม — นับรายอักขระ ไม่ยุบสระประสม
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
