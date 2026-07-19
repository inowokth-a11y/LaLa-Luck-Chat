// Golden parity test — lib/engine/transit.ts เทียบกับ transit_engine.py (Logic 9/10/11)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { monthlyPrediction, yearlyPrediction, birthdayPrediction } from "../lib/engine/transit";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "transit.fixture.json"), "utf-8"));

const dates: Record<string, { year: number; month: number; day: number }> = {
  y2026_07_16: { year: 2026, month: 7, day: 16 },
  y2000_01_01: { year: 2000, month: 1, day: 1 },
  y2010_06_15: { year: 2010, month: 6, day: 15 },
};

for (const [label, d] of Object.entries(dates)) {
  test(`monthly — ${label}`, () => {
    assert.deepEqual(monthlyPrediction("ธนู", d), fx.monthly[label]);
  });
  test(`yearly — ${label}`, () => {
    assert.deepEqual(yearlyPrediction("ธนู", d), fx.yearly[label]);
  });
}

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
