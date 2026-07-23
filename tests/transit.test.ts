// Golden parity test — lib/engine/transit.ts เทียบกับ transit_engine.py (Logic 9/10/11)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { monthlyPrediction, yearlyPrediction, birthdayPrediction } from "../lib/engine/transit";
import { julianDay, solarEclipticLongitude, getZodiacSign } from "../lib/engine/lagna";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "transit.fixture.json"), "utf-8"));

const dates: Record<string, { year: number; month: number; day: number }> = {
  y2026_07_16: { year: 2026, month: 7, day: 16 },
  y2000_01_01: { year: 2000, month: 1, day: 1 },
  y2010_06_15: { year: 2010, month: 6, day: 15 },
};

/**
 * 🔴 ราศีของดาว **จงใจไม่ตรงกับ Python** ตั้งแต่ ก.ค. 2569
 *    Python ไม่ลบอายนางศะ → ให้ราศีสายนะ (ตะวันตก) ซึ่งผิดสำหรับโหราศาสตร์ไทย
 *    เราลบแล้ว → ราศีนิรายนะ (ไทย) ดู CLAUDE.md §5.3
 *
 * เทสต์จึงแยกเป็น 2 ส่วน:
 *   1. ฟิลด์ที่ไม่ขึ้นกับระบบราศี → ต้องตรงกับ Python เป๊ะ (พิสูจน์ว่าพอร์ตไม่พลาด)
 *   2. ฟิลด์ราศี → ต้องเลื่อนไปจาก Python ประมาณ 1 ราศี (พิสูจน์ว่าลบอายนางศะจริง)
 */
const ZODIAC = ["เมษ","พฤษภ","มิถุน","กรกฎ","สิงห์","กันย์","ตุลย์","พิจิก","ธนู","มังกร","กุมภ์","มีน"];
const signGap = (thai: string, western: string) =>
  ((ZODIAC.indexOf(thai) - ZODIAC.indexOf(western)) % 12 + 12) % 12;

for (const [label, d] of Object.entries(dates)) {
  test(`monthly — ${label} (ฟิลด์ที่ไม่ใช่ราศี ต้องตรงกับ Python)`, () => {
    const got = monthlyPrediction("ธนู", d);
    assert.equal(got.lagna_sign, fx.monthly[label].lagna_sign);
    // house/theme/valence คำนวณจากราศี จึงเลื่อนตามไปด้วย — เช็คแค่ว่ามีค่าและอยู่ในช่วงที่ถูก
    assert.ok(got.house.length > 0 && got.month_theme.length > 0);
    assert.ok([-1, 0, 1].includes(got.valence));
  });
  test(`monthly — ${label} (ราศีต้องเป็นนิรายนะ เลื่อนจาก Python 1 ราศี)`, () => {
    const got = monthlyPrediction("ธนู", d);
    const gap = signGap(got.sun_sign_this_month, fx.monthly[label].sun_sign_this_month);
    assert.ok(gap === 11 || gap === 0, `เลื่อนไป ${gap} ราศี — ควรถอย 1 (หรือ 0 ถ้าองศาไม่ข้ามขอบ)`);
  });
  test(`yearly — ${label} (ราศีดาวต้องเป็นนิรายนะ)`, () => {
    const got = yearlyPrediction("ธนู", d);
    assert.equal(got.lagna_sign, fx.yearly[label].lagna_sign);
    assert.equal(got.caveat, fx.yearly[label].caveat, "caveat ต้องไม่หาย");
    for (const [g, w] of [
      [got.jupiter_sign, fx.yearly[label].jupiter_sign],
      [got.saturn_sign, fx.yearly[label].saturn_sign],
    ]) {
      const gap = signGap(g, w);
      assert.ok(gap === 11 || gap === 0, `${w} → ${g} เลื่อน ${gap} ราศี`);
    }
    assert.ok(["A", "B", "C", "D"].includes(got.year_grade));
  });
}

test("🔴 อายนางศะทำงานจริง — 1 ม.ค. สายนะอยู่มังกร แต่ไทย(นิรายนะ)ต้องเป็นธนู", () => {
  const got = monthlyPrediction("ธนู", { year: 2026, month: 1, day: 1 });
  assert.equal(got.sun_sign_this_month, "ธนู", "ถอยจากมังกรมาธนู");
});

test("สัดส่วนวันที่ราศีต่างจากแบบตะวันตก ≈ 24/30 ของปี (พิสูจน์ว่าเลื่อนทั้งปี ไม่ใช่บังเอิญ)", () => {
  let diff = 0;
  for (let d = 0; d < 365; d++) {
    const ms = Date.UTC(2026, 0, 1 + d, 12, 0, 0);
    const jd = julianDay(ms);
    const lon = solarEclipticLongitude(jd);
    if (getZodiacSign(lon)[0] !== getZodiacSign(lon, jd)[0]) diff++;
  }
  const pct = diff / 365;
  // อายนางศะ ~24.2° จาก 30° → ควรต่างกันราว 80% ของวัน
  assert.ok(pct > 0.75 && pct < 0.86, `ต่างกัน ${(pct * 100).toFixed(0)}% ของปี`);
});

test("birthday — age 35 (birthday not yet passed)", () => {
  assert.deepEqual(
    birthdayPrediction({ year: 1990, month: 8, day: 15 }, { year: 2026, month: 7, day: 16 }, "จันทร์"),
    fx.birthday.age36
  );
});
test("birthday — age 0 same day (barivarn == natal)", () => {
  assert.deepEqual(
    birthdayPrediction({ year: 1990, month: 8, day: 15 }, { year: 1990, month: 8, day: 15 }, "จันทร์"),
    fx.birthday.age0_same_day
  );
});
test("birthday — pre-birthday this year", () => {
  assert.deepEqual(
    birthdayPrediction({ year: 1990, month: 8, day: 15 }, { year: 2026, month: 3, day: 1 }, "จันทร์"),
    fx.birthday.pre_birthday
  );
});
test("birthday — unknown day returns error", () => {
  assert.deepEqual(
    birthdayPrediction({ year: 1990, month: 8, day: 15 }, { year: 2026, month: 7, day: 16 }, "ไม่มี"),
    fx.birthday.unknown_day
  );
});
