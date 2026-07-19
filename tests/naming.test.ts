// Golden parity test — lib/engine/naming.ts เทียบกับ naming_branding_engine.py (Logic 19)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  nameElement,
  aggregateElement,
  scoreCandidateName,
  reverseGenerateCandidates,
  logoPromptText,
} from "../lib/engine/naming";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "naming.fixture.json"), "utf-8"));

test("name element parsing", () => {
  assert.equal(nameElement("กมล"), fx.name_kamon);
  assert.equal(nameElement("ธนวัฒน์"), fx.name_thanawat);
  assert.equal(nameElement("โซฟี"), fx.name_sophie);
  assert.equal(nameElement("123!@#"), fx.name_no_match);
});

test("aggregate element", () => {
  assert.equal(aggregateElement("Fire", ["Fire", "Earth", "Wood"]), fx.aggregate_fire_team);
  assert.equal(aggregateElement("Water"), fx.aggregate_no_members);
});

test("score candidate names", () => {
  const agg = aggregateElement("Fire", ["Fire", "Earth", "Wood"]);
  assert.deepEqual(scoreCandidateName("กมล", agg, ["Water"]), fx.score_kamon);
  assert.deepEqual(scoreCandidateName("ธนวัฒน์", agg, ["Water"]), fx.score_thanawat);
});

test("reverse generate + logo prompt", () => {
  const pool = ["Wanchai", "Kanya", "Duangjai", "Chaiyo", "Fahsai", "Rin", "Ice"];
  assert.deepEqual(reverseGenerateCandidates("Water", pool), fx.reverse_water);
  assert.equal(logoPromptText("Water", "AquaFlow"), fx.logo_water);
});
