// Golden parity test — lib/engine/element.ts ต้องคืนค่าตรงเป๊ะกับ engine Python
// fixtures สร้างจาก tests/fixtures/gen_element_fixtures.py (แหล่งอ้างอิงจริง)
// รัน: npm test  (regenerate fixtures ก่อนถ้าแก้ engine Python: python3 tests/fixtures/gen_element_fixtures.py)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  DAY_ELEMENT,
  chineseWuxingByYearEndDigit,
  lichunDayOfFebruary,
  calculateElementSeed,
  wuXingScore,
  frictionScore,
  normalizeTo03,
  calcDeviation,
  calculatePersonalYear,
  getPersonalYearGuidance,
  ttmRemedyForMissing,
  safetyGate,
} from "../lib/engine/element";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "element.fixture.json"), "utf-8"));

test("element seed — test1 (all sources, no name)", () => {
  const r = calculateElementSeed({
    day_of_week: "อังคาร", birth_month: 2, birth_year_ad: 1986,
    zodiac_year_animal: "ขาล", name_wood_pct: null,
  });
  assert.deepEqual(r, fx.element_seed_test1);
});

test("element seed — with name_wood_pct >= 50 (source 5)", () => {
  const r = calculateElementSeed({
    day_of_week: "พุธ", birth_month: 5, birth_year_ad: 1990,
    zodiac_year_animal: "มะเมีย", name_wood_pct: 70,
  });
  assert.deepEqual(r, fx.element_seed_name_wood);
});

// --- B2: ตาราง DAY_ELEMENT (พุธ=ดิน, พฤหัสบดี=ลม) ตามเอกสาร Platform_E_v1 ---
test("B2 — DAY_ELEMENT ครบ 7 วัน และตรงเอกสารต้นฉบับ", () => {
  assert.deepEqual(DAY_ELEMENT, fx.day_element_table);
  assert.equal(Object.keys(DAY_ELEMENT).length, 7, "ต้องมีครบ 7 วัน");
  assert.equal(DAY_ELEMENT["พุธ"], "Earth");
  assert.equal(DAY_ELEMENT["พฤหัสบดี"], "Wood");
});
test("B2 — คนเกิดวันพฤหัสบดีไม่ถูกข้าม Source 1 อีกต่อไป", () => {
  const r = calculateElementSeed({
    day_of_week: "พฤหัสบดี", birth_month: 7, birth_year_ad: 1978,
    zodiac_year_animal: "มะเมีย", name_wood_pct: null,
  });
  assert.deepEqual(r, fx.element_seed_thursday);
  assert.ok(r.sources_used.some((s) => s[0] === "day_of_week"), "ต้องมี source day_of_week");
});
test("B2 — คนเกิดวันพุธได้ธาตุดิน", () => {
  assert.deepEqual(
    calculateElementSeed({
      day_of_week: "พุธ", birth_month: 7, birth_year_ad: 1978,
      zodiac_year_animal: "มะเมีย", name_wood_pct: null,
    }),
    fx.element_seed_wednesday
  );
});

// --- B1: ขอบเขตลี่ชุน (立春) สำหรับธาตุจีน ---
test("B1 — วันลี่ชุนอยู่ในช่วง 3-5 ก.พ. เสมอ", () => {
  for (const [y, day] of Object.entries(fx.lichun_days)) {
    assert.equal(lichunDayOfFebruary(Number(y)), day);
    assert.ok((day as number) >= 3 && (day as number) <= 5, `ลี่ชุนปี ${y} ต้องอยู่ 3-5 ก.พ.`);
  }
});
test("B1 — เกิดเดือน ม.ค. ใช้ธาตุของปีก่อนหน้า", () => {
  assert.equal(chineseWuxingByYearEndDigit(1986, 1, 20), fx.cn_jan_1986);
  assert.equal(chineseWuxingByYearEndDigit(1970, 1, 10), fx.cn_jan_1970);
});
test("B1 — เกิด ก.พ. ก่อน/หลังลี่ชุน แยกปีถูกต้อง", () => {
  assert.equal(chineseWuxingByYearEndDigit(2004, 2, 10), fx.cn_feb_after);
  assert.equal(chineseWuxingByYearEndDigit(1992, 2, 1), fx.cn_feb_before);
});
test("B1 — ไม่ส่งเดือน = พฤติกรรมเดิมตามสเปก (backward compatible)", () => {
  assert.equal(chineseWuxingByYearEndDigit(1986), fx.cn_no_month_1986);
});
test("B1 — element seed ของคนเกิด ม.ค. ใช้ลี่ชุน", () => {
  assert.deepEqual(
    calculateElementSeed({
      day_of_week: "จันทร์", birth_month: 1, birth_year_ad: 1986, birth_day: 20,
      zodiac_year_animal: "ขาล", name_wood_pct: null,
    }),
    fx.element_seed_jan_birth
  );
});

test("wu xing — overcome (Water drains/overcomes Fire)", () => {
  assert.deepEqual(wuXingScore("Fire", "Water", []), fx.wuxing_overcome_water);
});

test("wu xing — productive clash (missing Water)", () => {
  assert.deepEqual(wuXingScore("Fire", "Water", ["Water"]), fx.wuxing_productive_clash);
});

test("wu xing — generate (Wood -> Fire)", () => {
  assert.deepEqual(wuXingScore("Wood", "Fire"), fx.wuxing_generate);
});

test("wu xing — same element", () => {
  assert.deepEqual(wuXingScore("Fire", "Fire"), fx.wuxing_same);
});

test("wu xing — drain (Fire fed by Wood)", () => {
  assert.deepEqual(wuXingScore("Fire", "Wood"), fx.wuxing_drain);
});

test("wu xing — overcome Metal", () => {
  assert.deepEqual(wuXingScore("Fire", "Metal"), fx.wuxing_overcome_metal);
});

test("friction — fire lowE highN = 4.5", () => {
  assert.equal(frictionScore("ไฟ", 2.0, 3.6), fx.friction_fire_lowE_highN);
});
test("friction — fire midE midN", () => {
  assert.equal(frictionScore("ไฟ", 2.7, 3.2), fx.friction_fire_midE_midN);
});
test("friction — earth lowE (congruent, 0)", () => {
  assert.equal(frictionScore("ดิน", 2.0, 2.0), fx.friction_earth_lowE);
});
test("friction — wind high pdcr", () => {
  assert.equal(frictionScore("ลม", 3.0, 3.0, 6), fx.friction_wind_high);
});
test("friction — wind low pdcr", () => {
  assert.equal(frictionScore("ลม", 3.0, 2.0, 5), fx.friction_wind_low_pdcr);
});

test("normalize_to_0_3", () => {
  assert.equal(normalizeTo03(3, 5), fx.normalize_3_5);
  assert.equal(normalizeTo03(2, 0), fx.normalize_zero_max);
});

test("calc_deviation — test6", () => {
  const trackA = { Fire: normalizeTo03(3, 5), Earth: normalizeTo03(2, 5), Wood: 0.0, Water: 0.0 };
  const trackB = {
    Fire: normalizeTo03(45, 100), Earth: normalizeTo03(10, 100),
    Wood: normalizeTo03(30, 100), Water: normalizeTo03(15, 100),
  };
  assert.deepEqual(calcDeviation(trackA, trackB), fx.calc_deviation_test6);
});

test("personal year — 15 Aug 2026 = 6", () => {
  assert.equal(calculatePersonalYear(15, 8, 2026), fx.personal_year_15_8_2026);
});
test("personal year guidance — 6", () => {
  assert.deepEqual(getPersonalYearGuidance(6), fx.personal_year_guidance_6);
});
test("personal year guidance — missing (99)", () => {
  assert.deepEqual(getPersonalYearGuidance(99), fx.personal_year_guidance_missing);
});

test("ttm remedy — water + wood (with wellness)", () => {
  assert.deepEqual(ttmRemedyForMissing(["Water", "Wood"]), fx.ttm_remedy_water_wood);
});
test("ttm remedy — fire (with wellness)", () => {
  assert.deepEqual(ttmRemedyForMissing(["Fire"]), fx.ttm_remedy_fire);
});

test("safety gate — safe message returns null", () => {
  assert.deepEqual(safetyGate("ฝันเห็นแม่มายืนหน้าบ้าน"), fx.safety_gate_safe);
});
test("safety gate — crisis message intercepts", () => {
  assert.deepEqual(safetyGate("ช่วงนี้ทนไม่ไหวแล้ว อยากตายจัง"), fx.safety_gate_crisis);
});
