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
  logoImagePrompt,
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

test("logoImagePrompt — อังกฤษล้วน + บังคับ no text + แนบ extra ที่ล้าง newline/ตัดความยาว", () => {
  const p = logoImagePrompt("Fire", "Lala Coffee");
  assert.ok(/no text|no letters|no words/.test(p), "ต้องบังคับไม่มีตัวอักษร");
  assert.ok(p.includes("Lala Coffee"));
  assert.ok(!/[ก-๙]/.test(p), "ต้องไม่มีอักษรไทยใน prompt (โมเดลภาพเข้าใจอังกฤษดีกว่า)");

  // extra ถูกแนบ + ล้าง newline
  const withExtra = logoImagePrompt("Water", "Aqua", "มีรูปคลื่น\nโทนฟ้า");
  assert.ok(withExtra.includes("additional requirements: มีรูปคลื่น โทนฟ้า"), "extra ต้องถูกแนบและล้าง newline");

  // ตัดความยาว extra ที่ 200
  const long = logoImagePrompt("Earth", "X", "ก".repeat(500));
  assert.ok(long.includes("ก".repeat(200)) && !long.includes("ก".repeat(201)), "extra ต้องถูกตัดที่ 200");

  // ธาตุที่ไม่รู้จัก → default (ไม่ throw)
  assert.ok(logoImagePrompt("Plasma", "Y").length > 0);
});
