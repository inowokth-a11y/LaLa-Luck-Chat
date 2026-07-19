// Golden parity test — lib/engine/wellness.ts ต้องตรงเป๊ะกับ wellness_activity_engine.py

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { getWellnessPair, getWellnessForMissing } from "../lib/engine/wellness";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "wellness.fixture.json"), "utf-8"));

test("wellness pair — Fire", () => {
  assert.deepEqual(getWellnessPair("Fire"), fx.pair_fire);
});
test("wellness pair — Metal", () => {
  assert.deepEqual(getWellnessPair("Metal"), fx.pair_metal);
});
test("wellness pair — unknown element returns error", () => {
  assert.deepEqual(getWellnessPair("Nonexistent"), fx.pair_unknown);
});
test("wellness for missing — Wood + Water", () => {
  assert.deepEqual(getWellnessForMissing(["Wood", "Water"]), fx.for_missing_wood_water);
});
