// Golden parity test — lib/engine/numerology.ts เทียบกับ artifact_numerology_engine.py

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  lookup2digit,
  lookup3digit,
  analyzePhoneNumber,
  digitSumReduce,
  artifactElement,
} from "../lib/engine/numerology";

const here = dirname(fileURLToPath(import.meta.url));
const fx = JSON.parse(readFileSync(join(here, "fixtures", "numerology.fixture.json"), "utf-8"));

test("lookup 2-digit — 37, 0, 99", () => {
  assert.deepEqual(lookup2digit(37), fx.lookup2_37);
  assert.deepEqual(lookup2digit(0), fx.lookup2_0);
  assert.deepEqual(lookup2digit(99), fx.lookup2_99);
});

test("lookup 3-digit — 123 (hit), 0 (hit), 246 (fallback)", () => {
  assert.deepEqual(lookup3digit(123), fx.lookup3_123_hit);
  assert.deepEqual(lookup3digit(0), fx.lookup3_0_hit);
  assert.deepEqual(lookup3digit(246), fx.lookup3_246_fallback);
});

test("phone number — full, short (error), exact-3", () => {
  assert.deepEqual(analyzePhoneNumber("081-234-5678"), fx.phone_full);
  assert.deepEqual(analyzePhoneNumber("12"), fx.phone_short);
  assert.deepEqual(analyzePhoneNumber("999"), fx.phone_exact3);
});

test("digit reduce + artifact element", () => {
  assert.equal(digitSumReduce(44), fx.digit_reduce_44);
  assert.equal(artifactElement(246), fx.artifact_element_246);
});
