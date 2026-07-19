// Golden parity test — Logic 3: auspicious.ts + kalayoke.ts เทียบกับ engine Python

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { checkAuspiciousTime, bestTimeToday } from "../lib/engine/auspicious";
import {
  toChulasakarat,
  calculateKalaYoke,
  checkDayKalaYoke,
  checkCombinedAuspiciousTime,
  checkFullAuspiciousTimeNoLagna,
} from "../lib/engine/kalayoke";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "timing.fixture.json"), "utf-8"));
const A = fx.auspicious;
const K = fx.kalayoke;

test("ubakong — specific times", () => {
  assert.deepEqual(checkAuspiciousTime("จันทร์", { hour: 7, minute: 0 }), A.mon_0700);
  assert.deepEqual(checkAuspiciousTime("อาทิตย์", { hour: 16, minute: 0 }), A.sun_1600);
  assert.deepEqual(checkAuspiciousTime("เสาร์", { hour: 9, minute: 0 }), A.sat_0900);
  assert.deepEqual(checkAuspiciousTime("พุธ", { hour: 20, minute: 0 }), A.wed_2000_night);
  assert.deepEqual(checkAuspiciousTime("อาทิตย์", { hour: 7, minute: 0 }), A.sun_0700);
});

test("ubakong — best/worst time of day", () => {
  assert.deepEqual(bestTimeToday("จันทร์"), A.best_mon);
  assert.deepEqual(bestTimeToday("อาทิตย์"), A.best_sun);
});

test("kala yoke — calculate จ.ศ. 1369 (verified vs Wikipedia)", () => {
  assert.deepEqual(calculateKalaYoke(1369), K.calc_1369);
});

test("kala yoke — CE/BE conversion", () => {
  assert.equal(toChulasakarat({ ce_year: 2007 }), K.chula_ce_2007);
  assert.equal(toChulasakarat({ be_year: 2550 }), K.chula_be_2550);
  assert.equal(toChulasakarat({ be_year: 2569 }), K.cs_2569);
});

test("kala yoke — check day (จันทร์, จ.ศ. 1388)", () => {
  assert.deepEqual(checkDayKalaYoke("จันทร์", K.cs_2569), K.day_mon_2569);
});

test("kala yoke — combined (Kala Yoke + Ubakong)", () => {
  assert.deepEqual(
    checkCombinedAuspiciousTime("จันทร์", { hour: 9, minute: 0 }, K.cs_2569),
    K.combined_mon_0900
  );
});

test("kala yoke — full without lagna (graceful skip)", () => {
  assert.deepEqual(
    checkFullAuspiciousTimeNoLagna("จันทร์", { hour: 9, minute: 0 }, K.cs_2569),
    K.full_no_lagna_mon_0900
  );
});
