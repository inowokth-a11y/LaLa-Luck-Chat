// Golden parity test — lib/engine/lagna.ts เทียบกับ suriyayart_lagna_engine.py
// ตัวเลขจาก trig อาจต่าง ULP ระหว่าง libm/V8 — เทียบ field discrete (sign/time/trace step)
// แบบเป๊ะ, ตัวเลขทศนิยมด้วย tolerance เล็ก (1e-6) ซึ่งเล็กกว่าความละเอียดที่ round ไว้ (2-3 ตำแหน่ง)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { calculateLagna, type LagnaResult } from "../lib/engine/lagna";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "lagna.fixture.json"), "utf-8"));

const EPS = 1e-6;
function assertApproxEqual(actual: unknown, expected: unknown, path = "root"): void {
  if (typeof expected === "number") {
    assert.equal(typeof actual, "number", `${path}: expected number`);
    assert.ok(
      Math.abs((actual as number) - expected) <= EPS,
      `${path}: ${actual} != ${expected} (eps ${EPS})`
    );
  } else if (Array.isArray(expected)) {
    assert.ok(Array.isArray(actual), `${path}: expected array`);
    assert.equal((actual as unknown[]).length, expected.length, `${path}: array length`);
    expected.forEach((e, i) => assertApproxEqual((actual as unknown[])[i], e, `${path}[${i}]`));
  } else if (expected !== null && typeof expected === "object") {
    assert.ok(actual !== null && typeof actual === "object", `${path}: expected object`);
    for (const key of Object.keys(expected as object)) {
      assertApproxEqual(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
        `${path}.${key}`
      );
    }
  } else {
    assert.deepEqual(actual, expected, `${path}: value mismatch`);
  }
}

const cases: Array<[string, LagnaResult]> = [
  ["bangkok_1990_08_15_1830", calculateLagna({ year: 1990, month: 8, day: 15, hour: 18, minute: 30 }, 13.75, 100.5, 7.0)],
  ["chiangmai_2000_01_01_0600", calculateLagna({ year: 2000, month: 1, day: 1, hour: 6, minute: 0 }, 18.79, 98.98, 7.0)],
  ["bangkok_1985_03_20_0300_presunrise", calculateLagna({ year: 1985, month: 3, day: 20, hour: 3, minute: 0 }, 13.75, 100.5, 7.0)],
];

for (const [name, result] of cases) {
  test(`lagna — ${name}`, () => {
    assertApproxEqual(result, fx[name], name);
  });
}
